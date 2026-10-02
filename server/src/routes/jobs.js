import { createJobService } from '../services/jobs.js';

export function registerJobRoutes(app, ctx) {
  const { supabaseAdmin, requireCloudUser, requireProviderAuth, RUNWAY_API, runwayHeaders, durableUsageLimit, RATE_LIMITS } = ctx;
  const jobs = createJobService({ supabaseAdmin, requireDurable: ctx.IS_PRODUCTION });
  ctx.jobs = jobs;

  app.get('/api/jobs', async (req, res) => {
    const user = await requireCloudUser(req, res); if (!user) return;
    try { res.json({ jobs: await jobs.list(user.id, String(req.query.projectId || '') || null), recent: await jobs.recentCompleted(user.id, String(req.query.projectId || '') || null), durable: jobs.durable }); }
    catch { res.status(500).json({ message: 'Could not load jobs.' }); }
  });

  app.get('/api/jobs/:id', async (req, res) => {
    const user = await requireProviderAuth(req, res); if (!user) return;
    const job = await jobs.get(req.params.id, user.id);
    if (!job) return res.status(404).json({ message: 'Job not found.' });
    res.json({ job });
  });

  app.post('/api/jobs/:id/cancel', async (req, res) => {
    const user = await requireProviderAuth(req, res); if (!user) return;
    const job = await jobs.get(req.params.id, user.id);
    if (!job) return res.status(404).json({ message: 'Job not found.' });
    if (['succeeded','failed','canceled','dead_letter'].includes(job.status)) return res.json({ job, message: 'Job is already finished.' });
    if (job.provider_task_id && process.env.RUNWAYML_API_SECRET) {
      try {
        const response = await fetch(`${RUNWAY_API}/tasks/${encodeURIComponent(job.provider_task_id)}`, { method: 'DELETE', headers: runwayHeaders() });
        if (!response.ok && response.status !== 404) {
          const details = await response.text();
          return res.status(response.status).json({ message: 'The video provider did not accept cancellation.', details });
        }
      } catch (error) { return res.status(502).json({ message: 'Could not reach the video provider to cancel the task.' }); }
    }
    const updated = await jobs.update(job.id, { status: 'canceled', progress: 0, error: 'Canceled by user.' });
    res.json({ job: jobs.publicJob(updated) || { ...job, status: 'canceled' } });
  });
  app.post('/api/jobs/:id/retry', async (req, res) => {
    const user = await requireProviderAuth(req, res); if (!user) return;
    const job = await jobs.get(req.params.id, user.id);
    if (!job) return res.status(404).json({ message: 'Job not found.' });
    if (!['failed','canceled','dead_letter'].includes(job.status)) return res.status(409).json({ message: 'Only failed or canceled jobs can be retried.' });
    if (job.type !== 'film_export') return res.status(409).json({ message: 'Provider jobs must be regenerated from the relevant production panel.' });
    // A retry re-runs an expensive export, so it counts against the same hourly export quota (checked after validation).
    if (RATE_LIMITS?.export && user.id !== 'development-user') {
      const usage = await durableUsageLimit(user.id, 'export', RATE_LIMITS.export);
      if (usage.infrastructureError) return res.status(503).json({ error: 'USAGE_LIMIT_UNAVAILABLE', message: 'Usage protection is temporarily unavailable. Please try again shortly.' });
      if (!usage.allowed) { res.set('Retry-After', String(usage.retryAfter)); return res.status(429).json({ error: 'RATE_LIMITED', message: 'Too many export requests. Try again later.', retryAfter: usage.retryAfter }); }
    }
    const retried = await jobs.update(job.id, { status: 'queued', progress: 0, attempts: 0, locked_at: null, worker_id: null, error: null }, { allowOverCanceled: true });
    res.json({ job: jobs.publicJob(retried) || { ...job, status: 'queued', progress: 0, error: null }, message: 'Job queued for retry.' });
  });

}
