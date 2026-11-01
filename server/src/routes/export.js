import { processFilmExport } from '../services/exporter.js';
import { assertSafeUrl } from '../services/safeFetch.js';

export function registerRoutes(app, ctx) {
  const { IS_PRODUCTION, WORKER_ENABLED, requireProviderUser, requireOwnedProject, jobs, getUserPlan, maxExportScenes, maxExportDurationSeconds } = ctx;

  app.post('/api/export/film', async (req, res) => {
    const exportUser = await requireProviderUser(req, res, 'export');
    if (!exportUser) return;
    const captionModeRaw = String(req.body?.captionMode || 'burn').toLowerCase();
    const qualityRaw = String(req.body?.quality || 'standard').toLowerCase();
    const payload = {
      projectId: req.body?.projectId || null,
      scenes: Array.isArray(req.body?.scenes) ? req.body.scenes : [],
      audioTracks: Array.isArray(req.body?.audioTracks) ? req.body.audioTracks : [],
      captions: Array.isArray(req.body?.captions) ? req.body.captions : [],
      duckMusic: req.body?.duckMusic !== false,
      format: req.body?.format === '9:16' ? '9:16' : '16:9',
      captionMode: ['burn', 'soft', 'none'].includes(captionModeRaw) ? captionModeRaw : 'burn',
      quality: ['draft', 'standard', 'high'].includes(qualityRaw) ? qualityRaw : 'standard',
      includeSrt: req.body?.includeSrt !== false,
      aiEndCard: req.body?.aiEndCard === true,
      // Film finish, loudness and picture size are passed through; the exporter validates the finish name.
      finish: String(req.body?.finish || '').toLowerCase().slice(0, 16),
      normalizeLoudness: req.body?.normalizeLoudness !== false,
      resolution: req.body?.resolution === '1080p' ? '1080p' : '720p'
    };
    if (!payload.scenes.length) return res.status(400).json({ message: 'At least one rendered scene is required.' });
    if (payload.projectId && !(await requireOwnedProject(exportUser.id, payload.projectId))) return res.status(404).json({ message: 'Project not found.' });
    const missingMedia = payload.scenes.filter(s => !s?.assetId && !String(s?.videoUrl || '').trim());
    if (IS_PRODUCTION && missingMedia.length) {
      return res.status(400).json({ message: 'Every production export scene needs an archived asset or a video URL. Re-generate any scene that has neither.' });
    }
    // Prefer archived assets; provider URLs are accepted so a shot can still be exported if archive lagged.
    const plan = await getUserPlan(exportUser.id);
    const sceneCap = typeof maxExportScenes === 'function' ? maxExportScenes(plan) : 24;
    if (payload.scenes.length > sceneCap) {
      return res.status(413).json({
        message: `Export is limited to ${sceneCap} scenes on the ${plan} plan. Upgrade for longer feature exports.`,
        maxScenes: sceneCap,
        plan
      });
    }
    payload.plan = plan;
    if (plan === 'free') payload.resolution = '720p'; // 1080p exports are for paid plans
    payload.maxScenes = sceneCap;
    if (typeof maxExportDurationSeconds === 'function') {
      payload.maxDurationSeconds = maxExportDurationSeconds(plan);
    }
    try {
      payload.scenes.forEach(s => { if (!s?.assetId) assertSafeUrl(String(s?.videoUrl || '')); });
      payload.audioTracks.forEach(t => { const src = String(t?.src || '').trim(); if (src && !/^data:audio\//i.test(src)) assertSafeUrl(src); });
    } catch (e) { return res.status(400).json({ message: e.message || 'Invalid media URL.' }); }

    if (Buffer.byteLength(JSON.stringify(payload), 'utf8') > 40 * 1024 * 1024) return res.status(413).json({ message: 'Export request is too large for the durable worker queue. Upload large audio files to Avirzo private media storage first.' });

    let queueForWorker = false;
    if (IS_PRODUCTION && WORKER_ENABLED) {
      queueForWorker = true;
    } else if (IS_PRODUCTION && String(process.env.AVIRZO_ALLOW_INLINE_EXPORTS_IN_PRODUCTION || '').toLowerCase() !== 'true') {
      return res.status(503).json({ error: 'EXPORT_WORKER_REQUIRED', message: 'Film exports need the background worker. Enable AVIRZO_WORKER_ENABLED after deploying avirzo-worker, or explicitly set AVIRZO_ALLOW_INLINE_EXPORTS_IN_PRODUCTION=true for a temporary inline fallback.' });
    }
    // Inline exports are created as 'running' so a deployed worker never claims (and re-renders) the same job.
    const job = await jobs.create({ userId: exportUser.id, projectId: payload.projectId, type: 'film_export', payload, status: queueForWorker ? 'queued' : 'running' });
    if (queueForWorker) {
      return res.status(202).json({ status: 'queued', jobId: job.id, message: 'Your film export has been queued. You can keep working while it renders.' });
    }

    try {
      const result = await processFilmExport({ payload, user: exportUser, ctx, onProgress: p => jobs.update(job.id, { status: 'running', progress: p }) });
      await jobs.update(job.id, { status: 'succeeded', progress: 100, result_asset_id: result.assetId || null, result_metadata: result.srt ? { srt: result.srt, srt_filename: `avirzo-film-${job.id}.srt` } : null });
      return res.json({ ...result, jobId: job.id });
    } catch (error) {
      await jobs.update(job.id, { status: 'failed', progress: 0, error: error?.message || 'Export failed.' });
      return res.status(502).json({ message: error?.message || 'FFmpeg could not export the film.' });
    }
  });
}
