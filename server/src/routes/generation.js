export function registerRoutes(app, ctx) {
  const { IS_PRODUCTION, APP_VERSION, supabase, supabaseAdmin, africanProfiles, voiceLanguageSupport, ELEVEN_MODEL, RUNWAY_API, eras, storyTypes, styles, cameras, formats, durations, requireProviderUser, requireProviderAuth, requireRunwayKey, requireVoiceKey, runwayHeaders, normalizeCharacter, characterContinuityLine, buildCinematicPrompt, persistRemoteAsset, archiveProviderOutput, requireAssetCloud, requireOwnedProject, projectStore, safeProjectId, normalizeProject, requireCloudUser, PROJECT_DIR, toSrtTime, acquireExportSlot, ELEVENLABS_API, generationJobs, rateBuckets, jobs } = ctx;

  app.post('/api/generate', async (req, res) => {
  const providerUser = await requireProviderUser(req, res, 'generation');
  if (!providerUser) return;
  const { prompt, style = 'Cinematic', camera = 'Slow dolly', duration = '5 sec', format = '16:9', sceneNumber = 1, africanProfile = 'uganda-en', era = 'pre1994', storyType = 'inspired', historicalNotes = '', researchBrief = null, characters = [], referenceImage = '', referenceCharacter = null, worldBible = null, continuityContext = '', primaryCharacterId = '' } = req.body || {};
  const profile = africanProfiles[africanProfile];
  if (!prompt?.trim()) return res.status(400).json({ message: 'A prompt is required.' });
  if (!profile) return res.status(400).json({ message: 'Unsupported African cinema profile.' });
  if (!eras[era] || !storyTypes[storyType]) return res.status(400).json({ message: 'Unsupported heritage setting.' });
  if (!styles.has(style) || !cameras.has(camera) || !formats.has(format) || !durations.has(duration)) return res.status(400).json({ message: 'One or more generation settings are not supported.' });
  if (!requireRunwayKey(res)) return;
  const seconds = Number.parseInt(duration, 10);
  const ratio = format === '9:16' ? '720:1280' : '1280:720';
  const ref = String(referenceImage || '').trim();
  if (ref && !/^https:\/\//i.test(ref) && !/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(ref)) return res.status(400).json({ message: 'Reference image must be an HTTPS image URL or a supported image data URL.' });
  let job = null;
  try {
    const projectId = req.body?.projectId || null;
    if (projectId && !(await requireOwnedProject(providerUser.id, projectId))) return res.status(404).json({ message: 'Project not found.' });
    job = await jobs.create({ userId: providerUser.id, projectId, type: 'video_generation', status: 'queued' });
    const promptText = buildCinematicPrompt({ prompt, style, camera, sceneNumber, africanProfile: profile, era, storyType, historicalNotes, characters, researchBrief, referenceCharacter, continuityContext, worldBible });
    const endpoint = ref ? 'image_to_video' : 'text_to_video';
    const response = await fetch(`${RUNWAY_API}/${endpoint}`, { method: 'POST', headers: runwayHeaders(), body: JSON.stringify({ model: 'gen4.5', promptText, ...(ref ? { promptImage: ref } : {}), ratio, duration: seconds }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      await jobs.update(job.id, { status: 'failed', progress: 0, error: data?.message || 'The video provider rejected the request.' });
      return res.status(response.status).json({ message: data?.message || 'The video provider rejected the request.', details: data, jobId: job.id });
    }
    await jobs.update(job.id, { status: 'running', progress: 5, provider_task_id: data.id });
    res.status(202).json({ status: 'queued', taskId: data.id, jobId: job.id, message: 'Your cinematic scene is rendering.', settings: { style, camera, duration, format, sceneNumber, africanProfile: profile.id || africanProfile, language: profile.language, market: profile.market, era, storyType, referenceLocked: Boolean(ref), referenceCharacter: referenceCharacter?.name || null } });
  } catch (error) {
    console.error(error);
    if (job?.id) { try { await jobs.update(job.id, { status: 'failed', progress: 0, error: error?.message || 'Provider request failed.' }); } catch (jobError) { console.error('Could not mark provider job failed:', jobError); } }
    res.status(502).json({ message: 'Could not reach the video generation service.', jobId: job?.id || null });
  }
});

app.get('/api/generate/:taskId', async (req, res) => {
  const providerUser = await requireProviderAuth(req, res);
  if (!providerUser) return;
  if (!requireRunwayKey(res)) return;
  // Only the task's owner may poll it; never proxy arbitrary Runway task IDs.
  const knownJob = await jobs.findByProviderTask(providerUser.id, req.params.taskId);
  if (!knownJob) return res.status(404).json({ message: 'Generation task not found.' });
  if (knownJob && ['succeeded','failed','canceled'].includes(knownJob.status)) {
    const archivedUrl = knownJob.status === 'succeeded' ? await jobs.resultUrl(knownJob) : null;
    return res.json({ status: knownJob.status, progress: knownJob.progress, jobId: knownJob.id, taskId: req.params.taskId, videoUrl: archivedUrl || undefined, archivedAsset: knownJob.result_asset_id ? { id: knownJob.result_asset_id } : null, failureCode: knownJob.error || undefined, message: knownJob.status === 'succeeded' ? 'Scene ready.' : knownJob.status === 'canceled' ? 'Scene generation canceled.' : 'Scene generation failed.' });
  }
  try {
    const response = await fetch(`${RUNWAY_API}/tasks/${encodeURIComponent(req.params.taskId)}`, { headers: runwayHeaders() });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(response.status).json({ message: data?.message || 'Could not retrieve generation status.', details: data });
    const status = data.status?.toLowerCase();
    const durableJob = knownJob;
    const progress = status === 'succeeded' ? 100 : status === 'failed' || status === 'canceled' ? 0 : status === 'running' ? 60 : status === 'throttled' ? 35 : 15;
    // A job is only "succeeded" once its media is safely archived (or archiving is unavailable in local dev).
    if (status === 'succeeded' && !data.output?.[0]) {
      if (durableJob) await jobs.update(durableJob.id, { status: 'failed', progress: 0, error: 'Provider reported success without an output media asset.' });
      return res.status(502).json({ status: 'failed', progress: 0, jobId: durableJob?.id || null, taskId: data.id, message: 'Video provider reported success without an output media asset.' });
    }
    let archivedAsset = durableJob?.result_asset_id ? { id: durableJob.result_asset_id } : null;
    if (durableJob && status !== 'succeeded') {
      await jobs.update(durableJob.id, { status: status === 'failed' ? 'failed' : status === 'canceled' ? 'canceled' : 'running', progress, error: data.failureCode || null });
    } else if (durableJob && status === 'succeeded' && durableJob.status !== 'canceled') {
      if (!archivedAsset && supabaseAdmin) {
        try {
          const asset = await archiveProviderOutput({ job: { ...durableJob, user_id: durableJob.user_id || providerUser.id, provider_task_id: durableJob.provider_task_id || req.params.taskId }, sourceUrl: data.output[0], kind: 'video', name: `scene-${durableJob.id}`, sourceProvider: 'runway' });
          if (asset?.id) archivedAsset = { id: asset.id };
        } catch (archiveError) {
          console.error('generation archive failed:', archiveError);
        }
        if (!archivedAsset) {
          // Do not report success: keep the job running so the worker (or the next poll) retries archiving.
          return res.json({ status: 'running', progress: 95, jobId: durableJob.id, taskId: data.id, archivedAsset: null, message: 'Scene finished rendering; saving it to your library…' });
        }
      }
      await jobs.update(durableJob.id, { status: 'succeeded', progress: 100, result_asset_id: archivedAsset?.id || null, error: null });
    }
    res.json({ status, progress, jobId: durableJob?.id || null, taskId: data.id, videoUrl: status === 'succeeded' ? data.output?.[0] : undefined, archivedAsset, failureCode: data.failureCode, message: status === 'succeeded' ? 'Scene ready.' : status === 'failed' || status === 'canceled' ? 'Scene generation failed.' : 'Scene is rendering.' });
  } catch (error) {
    console.error(error);
    res.status(502).json({ message: 'Could not reach the video generation service.' });
  }
});
}
