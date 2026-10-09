import { sceneContinuityGuard } from '../services/continuity.js';
import { buildModelChain, submitWithFallback } from '../services/modelFallback.js';

function normalizeRunwayStatus(raw) {
  const s = String(raw || '').toLowerCase().trim();
  if (s === 'succeeded' || s === 'success' || s === 'complete' || s === 'completed') return 'succeeded';
  if (s === 'failed' || s === 'failure' || s === 'error') return 'failed';
  if (s === 'canceled' || s === 'cancelled') return 'canceled';
  if (s === 'running' || s === 'processing' || s === 'in_progress') return 'running';
  if (s === 'pending' || s === 'queued' || s === 'created') return 'pending';
  if (s === 'throttled') return 'throttled';
  return s || 'pending';
}

function mapDurationSeconds(duration) {
  const n = Number.parseInt(String(duration || '5'), 10);
  if (!Number.isFinite(n)) return 5;
  return Math.min(10, Math.max(2, n));
}

function mapRatio(format) {
  return format === '9:16' ? '720:1280' : '1280:720';
}

function providerErrorMessage(data, fallback = 'The video provider rejected the request.') {
  if (!data || typeof data !== 'object') return fallback;
  return (
    data.message ||
    data.error ||
    data.failure ||
    data.detail ||
    (Array.isArray(data.errors) && data.errors[0]?.message) ||
    fallback
  );
}

export function registerRoutes(app, ctx) {
  const {
    IS_PRODUCTION, supabaseAdmin, africanProfiles, RUNWAY_API, eras, storyTypes, styles, cameras, formats, durations,
    requireProviderUser, requireProviderAuth, requireRunwayKey, runwayHeaders, buildCinematicPrompt,
    archiveProviderOutput, requireOwnedProject, jobs, getUserPlan, pickGenerationModel
  } = ctx;

  app.post('/api/generate', async (req, res) => {
    const {
      prompt, style = 'Cinematic', camera = 'Slow dolly', duration = '5 sec', format = '16:9',
      sceneNumber = 1, africanProfile = 'uganda-en', era = 'pre1994', storyType = 'inspired',
      historicalNotes = '', researchBrief = null, characters = [], referenceImage = '',
      referenceCharacter = null, worldBible = null, continuityContext = '', primaryCharacterId = ''
    } = req.body || {};

    const profile = africanProfiles[africanProfile];
    if (!prompt?.trim()) return res.status(400).json({ message: 'A prompt is required. Add scene text or build a storyboard first.' });
    if (!profile) return res.status(400).json({ message: 'Unsupported African cinema profile.' });
    if (!eras[era] || !storyTypes[storyType]) return res.status(400).json({ message: 'Unsupported heritage setting.' });
    if (!styles.has(style) || !cameras.has(camera) || !formats.has(format) || !durations.has(duration)) {
      return res.status(400).json({ message: 'One or more generation settings are not supported. Check style, camera, format and duration.' });
    }
    if (!requireRunwayKey(res)) return;
    if (String(prompt).length > 3000 || String(historicalNotes || '').length > 6000 || !Array.isArray(characters) || characters.length > 40) {
      return res.status(400).json({ message: 'The scene text, notes or character list is too large.' });
    }

    const guard = sceneContinuityGuard({
      scene: { number: sceneNumber, prompt, primaryCharacterId },
      characters: characters.filter(c => c && typeof c === 'object'),
      worldBible: (worldBible && typeof worldBible === 'object') ? worldBible : {},
      rootsFoundation: req.body?.rootsFoundation || { period: researchBrief?.period || '' },
      era
    });
    if (!guard.ready) {
      return res.status(400).json({
        message: `Scene blocked by continuity: ${(guard.blockers || []).join(' ')}`,
        blockers: guard.blockers,
        warnings: guard.warnings
      });
    }

    const serverContinuity = [continuityContext, guard.continuityContext].filter(Boolean).join(' | ').slice(0, 900);
    const providerUser = await requireProviderUser(req, res, 'generation');
    if (!providerUser) return;

    const seconds = mapDurationSeconds(duration);
    const ratio = mapRatio(format);
    const ref = String(referenceImage || '').trim();
    if (ref && !/^https:\/\//i.test(ref) && !/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(ref)) {
      return res.status(400).json({ message: 'Reference image must be an HTTPS image URL or a supported image data URL.' });
    }

    let job = null;
    try {
      const projectId = req.body?.projectId || null;
      if (projectId && !(await requireOwnedProject(providerUser.id, projectId))) {
        return res.status(404).json({ message: 'Project not found.' });
      }

      job = await jobs.create({
        userId: providerUser.id,
        projectId,
        type: 'video_generation',
        status: 'queued',
        payload: { sceneNumber, format, duration: seconds, style, camera }
      });

      const promptText = buildCinematicPrompt({
        prompt, style, camera, sceneNumber, africanProfile: profile, era, storyType,
        historicalNotes, characters, researchBrief, referenceCharacter,
        continuityContext: serverContinuity, worldBible
      });

      if (!promptText?.trim()) {
        await jobs.update(job.id, { status: 'failed', progress: 0, error: 'Empty prompt after processing.' });
        return res.status(400).json({ message: 'Could not build a usable video prompt from this scene.', jobId: job.id });
      }

      // Gen-4.5: image_to_video accepts text-only (omit promptImage) or image+text.
      const primaryModel = pickGenerationModel(await getUserPlan(providerUser.id), Boolean(ref));
      const chain = buildModelChain(primaryModel, Boolean(ref));
      const submitTimeoutMs = Math.max(5000, Number(process.env.PROVIDER_SUBMIT_TIMEOUT_MS || 20000));
      const { response, data, model, attempts } = await submitWithFallback(chain, async tryModel => {
        const body = { model: tryModel, promptText: String(promptText).slice(0, 1000), ratio, duration: seconds };
        if (ref) body.promptImage = ref; // Gen-4.5: text-only is allowed (omit promptImage); gen4_turbo needs the image.
        const r = await fetch(`${RUNWAY_API}/image_to_video`, { method: 'POST', headers: runwayHeaders(), body: JSON.stringify(body), signal: AbortSignal.timeout(submitTimeoutMs) });
        return { response: r, data: await r.json().catch(() => ({})) };
      });
      if (attempts.length > 1) console.warn(`generation fallback for job ${job.id}:`, JSON.stringify(attempts));

      if (!response.ok) {
        const msg = providerErrorMessage(data, 'The video provider rejected the request.');
        await jobs.update(job.id, { status: 'failed', progress: 0, error: msg });
        return res.status(response.status >= 400 && response.status < 600 ? response.status : 502).json({
          message: msg,
          details: data,
          jobId: job.id
        });
      }

      if (!data?.id) {
        await jobs.update(job.id, { status: 'failed', progress: 0, error: 'Provider did not return a task id.' });
        return res.status(502).json({ message: 'Video provider did not return a task id.', jobId: job.id });
      }

      await jobs.update(job.id, { status: 'running', progress: 5, provider_task_id: data.id, payload: { ...(job.payload || {}), model, fallbackUsed: model !== primaryModel } });
      return res.status(202).json({
        status: 'queued',
        taskId: data.id,
        jobId: job.id,
        message: 'Your cinematic scene is rendering.',
        settings: {
          style, camera, duration, format, sceneNumber,
          africanProfile: africanProfile,
          language: profile.language,
          market: profile.market,
          era, storyType,
          referenceLocked: Boolean(ref),
          referenceCharacter: referenceCharacter?.name || null
        }
      });
    } catch (error) {
      console.error('generation start failed:', error);
      if (job?.id) {
        try { await jobs.update(job.id, { status: 'failed', progress: 0, error: error?.message || 'Provider request failed.' }); }
        catch (jobError) { console.error('Could not mark provider job failed:', jobError); }
      }
      return res.status(502).json({
        message: error?.message || 'Could not reach the video generation service.',
        jobId: job?.id || null
      });
    }
  });

  app.get('/api/generate/:taskId', async (req, res) => {
    const providerUser = await requireProviderAuth(req, res);
    if (!providerUser) return;
    if (!requireRunwayKey(res)) return;

    const knownJob = await jobs.findByProviderTask(providerUser.id, req.params.taskId);
    if (!knownJob) return res.status(404).json({ message: 'Generation task not found.' });

    if (knownJob && ['succeeded', 'failed', 'canceled'].includes(knownJob.status)) {
      const archivedUrl = knownJob.status === 'succeeded' ? await jobs.resultUrl(knownJob) : null;
      const providerUrl = knownJob.payload?.providerVideoUrl || null;
      const videoUrl = archivedUrl || providerUrl || undefined;
      return res.json({
        status: knownJob.status,
        progress: knownJob.progress ?? (knownJob.status === 'succeeded' ? 100 : 0),
        jobId: knownJob.id,
        taskId: req.params.taskId,
        videoUrl: knownJob.status === 'succeeded' ? videoUrl : undefined,
        archivedAsset: knownJob.result_asset_id ? { id: knownJob.result_asset_id } : null,
        failureCode: knownJob.error || undefined,
        message: knownJob.status === 'succeeded'
          ? (archivedUrl ? 'Scene ready.' : 'Scene ready (provider URL).')
          : knownJob.status === 'canceled'
            ? 'Scene generation canceled.'
            : (knownJob.error || 'Scene generation failed.')
      });
    }

    try {
      const response = await fetch(`${RUNWAY_API}/tasks/${encodeURIComponent(req.params.taskId)}`, { headers: runwayHeaders() });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return res.status(response.status).json({
          message: providerErrorMessage(data, 'Could not retrieve generation status.'),
          details: data
        });
      }

      const status = normalizeRunwayStatus(data.status);
      const durableJob = knownJob;
      const progress = status === 'succeeded' ? 100 : status === 'running' ? 60 : status === 'throttled' ? 35 : status === 'pending' ? 15 : 20;
      const outputUrl = Array.isArray(data.output) ? data.output[0] : (data.output || null);

      if (status === 'succeeded' && !outputUrl) {
        if (durableJob) await jobs.update(durableJob.id, { status: 'failed', progress: 0, error: 'Provider reported success without an output media asset.' });
        return res.status(502).json({
          status: 'failed',
          progress: 0,
          jobId: durableJob?.id || null,
          taskId: data.id,
          message: 'Video provider reported success without an output media asset.'
        });
      }

      let archivedAsset = durableJob?.result_asset_id ? { id: durableJob.result_asset_id } : null;

      if (durableJob && status !== 'succeeded') {
        await jobs.update(durableJob.id, {
          status: status === 'failed' ? 'failed' : status === 'canceled' ? 'canceled' : 'running',
          progress,
          error: data.failureCode || data.failure || null
        });
      } else if (durableJob && status === 'succeeded' && durableJob.status !== 'canceled') {
        // Prefer private archive; if archive fails, still succeed with provider URL so the shot is usable.
        if (!archivedAsset && supabaseAdmin && outputUrl) {
          try {
            const asset = await archiveProviderOutput({
              job: {
                ...durableJob,
                user_id: durableJob.user_id || providerUser.id,
                provider_task_id: durableJob.provider_task_id || req.params.taskId
              },
              sourceUrl: outputUrl,
              kind: 'video',
              name: `scene-${durableJob.id}`,
              sourceProvider: 'runway'
            });
            if (asset?.id) archivedAsset = { id: asset.id };
          } catch (archiveError) {
            console.error('generation archive failed (will still return provider URL):', archiveError);
          }
        }

        const patch = {
          status: 'succeeded',
          progress: 100,
          result_asset_id: archivedAsset?.id || null,
          error: null,
          payload: {
            ...(durableJob.payload || {}),
            providerVideoUrl: outputUrl || null,
            archived: Boolean(archivedAsset?.id)
          }
        };
        await jobs.update(durableJob.id, patch);
      }

      const failureMsg = data.failure || data.failureCode || null;
      return res.json({
        status,
        progress,
        jobId: durableJob?.id || null,
        taskId: data.id || req.params.taskId,
        videoUrl: status === 'succeeded' ? outputUrl : undefined,
        archivedAsset,
        failureCode: failureMsg,
        message: status === 'succeeded'
          ? (archivedAsset ? 'Scene ready.' : 'Scene ready (temporary provider URL — archive to library when possible).')
          : status === 'failed' || status === 'canceled'
            ? (failureMsg || 'Scene generation failed.')
            : status === 'throttled'
              ? 'Provider is throttling — still in queue.'
              : 'Scene is rendering.'
      });
    } catch (error) {
      console.error('generation poll failed:', error);
      return res.status(502).json({ message: 'Could not reach the video generation service.' });
    }
  });
}
