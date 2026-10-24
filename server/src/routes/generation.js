import { sceneContinuityGuard } from '../services/continuity.js';
import { startKeyframeTask, advanceKeyframeJob, providerTaskIdFor } from '../services/keyframe.js';

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
    requireProviderUser, requireProviderAuth, requireRunwayKey, runwayHeaders, buildCinematicPrompt, generationCreditCost, keyframeCreditCost,
    archiveProviderOutput, requireOwnedProject, jobs, getUserPlan, pickGenerationModel, refundProviderCharge, refundJobCredits, reserveProviderBudget, settleProviderBudget
  } = ctx;

  app.post('/api/generate', async (req, res) => {
    let {
      prompt, style = 'Cinematic', camera = 'Slow dolly', duration = '5 sec', format = '16:9',
      sceneNumber = 1, africanProfile = 'uganda-en', era = 'pre1994', storyType = 'inspired',
      historicalNotes = '', researchBrief = null, characters = [], referenceImage = '',
      referenceCharacter = null, worldBible = null, continuityContext = '', primaryCharacterId = ''
    } = req.body || {};

    const profile = africanProfiles[africanProfile];
    if (!prompt?.trim()) return res.status(400).json({ message: 'A prompt is required. Add scene text or build a storyboard first.' });
    if (!profile) return res.status(400).json({ message: 'Unsupported African cinema profile.' });
    if (!eras[era] || !storyTypes[storyType]) return res.status(400).json({ message: 'Unsupported heritage setting.' });
    // Coerce near-miss settings so a storyboard/UI drift does not fail the shot.
    const normalizedStyle = styles.has(style) ? style : 'Cinematic';
    const normalizedCamera = cameras.has(camera) ? camera : 'Slow dolly';
    const normalizedFormat = formats.has(format) ? format : '16:9';
    let normalizedDuration = duration;
    if (!durations.has(normalizedDuration)) {
      const secs = Number.parseInt(String(duration || '5'), 10);
      normalizedDuration = Number.isFinite(secs) && secs >= 8 ? '10 sec' : '5 sec';
    }
    if (!styles.has(style) || !cameras.has(camera) || !formats.has(format) || !durations.has(duration)) {
      console.warn('generation settings coerced', { style, camera, format, duration, normalizedStyle, normalizedCamera, normalizedFormat, normalizedDuration });
    }
    style = normalizedStyle;
    camera = normalizedCamera;
    format = normalizedFormat;
    duration = normalizedDuration;
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
    const seconds = mapDurationSeconds(duration);
    const ratio = mapRatio(format);
    const ref = String(referenceImage || '').trim();
    // Validate cheap checks before debiting production credits.
    if (ref && !/^https:\/\//i.test(ref) && !/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(ref)) {
      return res.status(400).json({ message: 'Reference image must be an HTTPS image URL or a supported image data URL.' });
    }
    const promptText = buildCinematicPrompt({
      prompt, style, camera, sceneNumber, africanProfile: profile, era, storyType,
      historicalNotes, characters, researchBrief, referenceCharacter,
      continuityContext: serverContinuity, worldBible
    });
    if (!promptText?.trim()) {
      return res.status(400).json({ message: 'Could not build a usable video prompt from this scene.' });
    }

    // Quote using the server-selected model and current provider rate, after auth/plan resolution.
    // The same wallet pays for generation, voice and performance, so model costs must not be flat.
    // Keyframe-first: Runway makes the scene's first frame (using the character reference), then animates it.
    // A keyframe is an image, so Gen-4 Turbo drafts also work for scenes with no character image.
    const wantKeyframe = req.body?.keyframe === true || String(req.body?.keyframe || '').toLowerCase() === 'true';
    const providerUser = await requireProviderUser(req, res, 'generation', (_user, plan) => {
      const model = pickGenerationModel(plan, Boolean(ref) || wantKeyframe, process.env, req.body?.quality || req.body?.model);
      const keyframeModel = model === 'gen4_turbo' ? 'gen4_image_turbo' : 'gen4_image';
      const keyframeUnits = wantKeyframe ? keyframeCreditCost(keyframeModel) : 0;
      return { model, units: generationCreditCost(model, seconds) + keyframeUnits, meta: { durationSeconds: seconds, sceneNumber, keyframe: wantKeyframe || undefined, keyframeModel: wantKeyframe ? keyframeModel : undefined, keyframeCredits: keyframeUnits || undefined } };
    });
    if (!providerUser) return;
    const charged = Number(providerUser._creditsCharged) || 0;
    if (await getUserPlan(providerUser.id) === 'free' && seconds > 5) {
      await refundProviderCharge(providerUser, 'free_duration_limit');
      return res.status(403).json({ error: 'FREE_DURATION_LIMIT', message: 'Free accounts can generate scenes up to 5 seconds. Upgrade to Creator or Studio for longer scenes.' });
    }

    let budgetReserved = false;
    let budgetJobId = null;
    // A request rejected before provider acceptance releases its reservation, credits and quota.
    const refundCredits = async why => {
      if (budgetReserved && budgetJobId) { await settleProviderBudget(budgetJobId, 'released'); budgetReserved = false; }
      return refundProviderCharge(providerUser, why);
    };

    let job = null;
    try {
      const projectId = req.body?.projectId || null;
      if (projectId && !(await requireOwnedProject(providerUser.id, projectId))) {
        await refundCredits('project_not_found');
        return res.status(404).json({ message: 'Project not found.' });
      }

      job = await jobs.create({
        userId: providerUser.id,
        projectId,
        type: 'video_generation',
        status: 'queued',
        payload: { sceneNumber, format, duration: seconds, style, camera, creditsCharged: charged, model: providerUser._generationModel || null, estimatedProviderCostUsd: providerUser._usageMeta?.estimatedProviderCostUsd ?? (Number(providerUser._quotedUnits || 0) * 0.01), quotaWindowStart: providerUser._usage?.kind === 'generation' && await getUserPlan(providerUser.id) === 'free' ? providerUser._usage.windowStart : null }
      });

      budgetJobId = job.id;
      const estimatedUsd = Math.max(0.01, (Number(providerUser._quotedUnits) || generationCreditCost(providerUser._generationModel || 'gen4.5', seconds)) * 0.01);
      const budget = await reserveProviderBudget({ jobId: job.id, userId: providerUser.id, estimatedUsd });
      if (!budget.allowed) {
        await jobs.update(job.id, { status: 'failed', progress: 0, error: 'Provider daily budget reached or unavailable.' });
        await refundCredits('provider_budget_blocked');
        return res.status(budget.infrastructureError ? 503 : 429).json({ error: 'PROVIDER_BUDGET_LIMIT', message: budget.infrastructureError ? 'Generation is temporarily paused because spending protection is unavailable. Please try again later.' : 'Avirzo has reached its daily generation budget. Please try again tomorrow.', dailyBudgetUsd: Number(process.env.PROVIDER_DAILY_BUDGET_USD || 25) });
      }
      budgetReserved = true;
      const model = providerUser._generationModel || pickGenerationModel(await getUserPlan(providerUser.id), Boolean(ref) || wantKeyframe, process.env, req.body?.quality || req.body?.model);
      if (wantKeyframe) {
        const keyframeModel = model === 'gen4_turbo' ? 'gen4_image_turbo' : 'gen4_image';
        const started = await startKeyframeTask({ runwayApi: RUNWAY_API, runwayHeaders, model: keyframeModel, promptText, ratio, referenceImage: ref || null });
        if (!started.ok || !started.data?.id) {
          const msg = providerErrorMessage(started.data, 'The first-frame step was rejected. Try again, or turn off "Keyframe first".');
          await jobs.update(job.id, { status: 'failed', progress: 0, error: msg });
          await refundCredits('keyframe_rejected');
          return res.status(started.ok ? 502 : (started.status >= 400 && started.status < 600 ? started.status : 502)).json({ message: msg, details: started.data, jobId: job.id, creditsRefunded: charged || undefined });
        }
        await settleProviderBudget(job.id, 'charged');
        budgetReserved = false;
        await jobs.update(job.id, {
          status: 'running', progress: 5, provider_task_id: started.data.id,
          payload: { ...(job.payload || {}), keyframe: true, stage: 'keyframe', keyframeModel, videoRequest: { model, promptText: String(promptText).slice(0, 1000), ratio, duration: seconds } }
        });
        return res.status(202).json({
          status: 'queued', taskId: started.data.id, jobId: job.id, stage: 'keyframe',
          message: 'Creating the first frame, then animating your scene.', creditsCharged: charged || undefined,
          settings: { style, camera, duration, format, sceneNumber, africanProfile, language: profile.language, market: profile.market, era, storyType, referenceLocked: Boolean(ref), referenceCharacter: referenceCharacter?.name || null, keyframe: true }
        });
      }
      const body = {
        model,
        promptText: String(promptText).slice(0, 1000),
        ratio,
        duration: seconds
      };
      // Runway has two endpoints: image_to_video needs a starting image, text_to_video (Gen-4.5 only) does not.
      if (ref) body.promptImage = ref;
      const endpoint = ref ? 'image_to_video' : 'text_to_video';

      const response = await fetch(`${RUNWAY_API}/${endpoint}`, {
        method: 'POST',
        headers: runwayHeaders(),
        body: JSON.stringify(body)
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const msg = providerErrorMessage(data, 'The video provider rejected the request.');
        await jobs.update(job.id, { status: 'failed', progress: 0, error: msg });
        await refundCredits('provider_rejected');
        return res.status(response.status >= 400 && response.status < 600 ? response.status : 502).json({
          message: msg,
          details: data,
          jobId: job.id,
          creditsRefunded: charged || undefined
        });
      }

      if (!data?.id) {
        await jobs.update(job.id, { status: 'failed', progress: 0, error: 'Provider did not return a task id.' });
        await refundCredits('no_task_id');
        return res.status(502).json({ message: 'Video provider did not return a task id.', jobId: job.id, creditsRefunded: charged || undefined });
      }

      await settleProviderBudget(job.id, 'charged');
      budgetReserved = false;
      await jobs.update(job.id, { status: 'running', progress: 5, provider_task_id: data.id });
      return res.status(202).json({
        status: 'queued',
        taskId: data.id,
        jobId: job.id,
        message: 'Your cinematic scene is rendering.',
        creditsCharged: charged || undefined,
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
      await refundCredits('start_exception');
      if (job?.id) {
        try { await jobs.update(job.id, { status: 'failed', progress: 0, error: error?.message || 'Provider request failed.' }); }
        catch (jobError) { console.error('Could not mark provider job failed:', jobError); }
      }
      return res.status(502).json({
        message: error?.message || 'Could not reach the video generation service.',
        jobId: job?.id || null,
        creditsRefunded: charged || undefined
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

    // Keyframe-first jobs: advance the first-frame stage here; the video task id is kept in the job payload.
    if (knownJob.payload?.stage === 'keyframe') {
      try {
        const step = await advanceKeyframeJob(knownJob, { jobs, runwayApi: RUNWAY_API, runwayHeaders, refundJobCredits, refundJobUsageQuota: ctx.refundJobUsageQuota });
        return res.json({
          status: step.state === 'failed' ? 'failed' : 'running', progress: step.progress, jobId: knownJob.id, taskId: req.params.taskId, stage: 'keyframe',
          keyframeUrl: step.keyframeUrl, failureCode: step.state === 'failed' ? step.message : undefined, message: step.message || 'Creating the first frame…'
        });
      } catch (error) {
        console.error('keyframe poll failed:', error);
        return res.status(502).json({ message: 'Could not reach the video generation service.' });
      }
    }
    if (knownJob.payload?.stage === 'starting_video') {
      return res.json({ status: 'running', progress: 50, jobId: knownJob.id, taskId: req.params.taskId, stage: 'video', message: 'Animating the scene…' });
    }

    try {
      const response = await fetch(`${RUNWAY_API}/tasks/${encodeURIComponent(providerTaskIdFor(knownJob) || req.params.taskId)}`, { headers: runwayHeaders() });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return res.status(response.status).json({
          message: providerErrorMessage(data, 'Could not retrieve generation status.'),
          details: data
        });
      }

      const status = normalizeRunwayStatus(data.status);
      const durableJob = knownJob;
      const rawProgress = status === 'succeeded' ? 100 : status === 'running' ? 60 : status === 'throttled' ? 35 : status === 'pending' ? 15 : 20;
      const progress = knownJob.payload?.keyframe && status !== 'succeeded' ? 50 + Math.round(rawProgress / 2) : rawProgress; // first frame was the first half
      const outputUrl = Array.isArray(data.output) ? data.output[0] : (data.output || null);

      if (status === 'succeeded' && !outputUrl) {
        if (durableJob) {
          await jobs.update(durableJob.id, { status: 'failed', progress: 0, error: 'Provider reported success without an output media asset.' });
          await refundJobCredits(durableJob, 'no_output');
          await ctx.refundJobUsageQuota(durableJob);
        }
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
        // The provider accepted the task and then failed or canceled it: the creator gets the credits back (once per job).
        if (status === 'failed' || status === 'canceled') { await refundJobCredits(durableJob, `provider_${status}`); await ctx.refundJobUsageQuota(durableJob); }
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
