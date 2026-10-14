export function registerRoutes(app, ctx) {
  const { IS_PRODUCTION, APP_VERSION, supabase, supabaseAdmin, africanProfiles, voiceLanguageSupport, ELEVEN_MODEL, RUNWAY_API, eras, storyTypes, styles, cameras, formats, durations, requireProviderUser, requireProviderAuth, requireRunwayKey, requireVoiceKey, runwayHeaders, normalizeCharacter, characterContinuityLine, buildCinematicPrompt, persistRemoteAsset, requireAssetCloud, requireOwnedProject, projectStore, safeProjectId, normalizeProject, requireCloudUser, PROJECT_DIR, toSrtTime, acquireExportSlot, ELEVENLABS_API, generationJobs, rateBuckets, jobs } = ctx;

  app.post('/api/character-performance', async (req, res) => {
  const performanceUser = await requireProviderUser(req, res, 'performance');
  if (!performanceUser) return;
  if (!requireRunwayKey(res)) return;
  const { characterImage, performanceVideo, bodyControl = true, expressionIntensity = 3, ratio = '1280:720', seed } = req.body || {};
  if (!characterImage) return res.status(400).json({ message: 'Add a character reference image first.' });
  if (!performanceVideo) return res.status(400).json({ message: 'Add a performance reference video. Runway requires a 3–30 second performance video.' });
  if (!/^https:\/\//i.test(characterImage) && !/^data:image\//i.test(characterImage)) return res.status(400).json({ message: 'Character image must be an HTTPS URL or image data URI.' });
  if (!/^https:\/\//i.test(performanceVideo) && !/^data:video\//i.test(performanceVideo)) return res.status(400).json({ message: 'Performance video must be an HTTPS URL or video data URI.' });
  if (/^data:image\//i.test(characterImage) && characterImage.length > 12 * 1024 * 1024) return res.status(413).json({ message: 'Character reference image is too large. Keep image data under 12 MB or use an HTTPS image URL.' });
  if (/^data:video\//i.test(performanceVideo) && performanceVideo.length > 45 * 1024 * 1024) return res.status(413).json({ message: 'Performance reference video is too large. Keep video data under 45 MB or use an HTTPS video URL.' });
  const intensity = Math.max(1, Math.min(5, Number(expressionIntensity) || 3));
  let job = null;
  try {
    const projectId = req.body?.projectId || null;
    if (projectId && !(await requireOwnedProject(performanceUser.id, projectId))) return res.status(404).json({ message: 'Project not found.' });
    job = await jobs.create({ userId: performanceUser.id, projectId, type: 'character_performance', status: 'queued' });
    const response = await fetch(`${RUNWAY_API}/character_performance`, {
      method: 'POST',
      headers: runwayHeaders(),
      body: JSON.stringify({
        model: 'act_two',
        character: { type: 'image', uri: characterImage },
        reference: { type: 'video', uri: performanceVideo },
        bodyControl: Boolean(bodyControl),
        expressionIntensity: intensity,
        ratio,
        ...(seed !== undefined && seed !== '' ? { seed: Number(seed) } : {})
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      await jobs.update(job.id, { status: 'failed', progress: 0, error: data?.error?.message || data?.message || 'Runway character performance request failed.' });
      return res.status(response.status).json({ message: data?.error?.message || data?.message || 'Runway character performance request failed.', details: data, jobId: job.id });
    }
    await jobs.update(job.id, { status: 'running', progress: 5, provider_task_id: data.id });
    res.status(202).json({ status: 'queued', jobId: job.id, taskId: data.id, model: 'act_two', bodyControl: Boolean(bodyControl), expressionIntensity: intensity, ratio });
  } catch (error) {
    if (job?.id) { try { await jobs.update(job.id, { status: 'failed', progress: 0, error: error?.message || 'Character performance request failed.' }); } catch (jobError) { console.error('Could not mark performance job failed:', jobError); } }
    res.status(500).json({ message: error.message || 'Character performance request failed.', jobId: job?.id || null });
  }
});
}
