# Avirzo v2.17.11 — Export and job reliability

## Fixed
- Queued exports now persist SRT subtitle text in the durable job result metadata. The studio job watcher restores it after background completion, so the existing subtitle-download control remains available.
- Export archival rolls back partial uploads and asset records when a later step fails or cancellation is detected.
- Job cancellation uses a conditional database update against queued/running states; if a queued cancellation wins the row update, the worker cannot subsequently claim that job.
- The worker passes its configured retry limit into the SQL claim/recovery routine. The limit is normalized to 1–20 and stale-job recovery uses the same value.
- Provider-job polling paginates in batches of 500 instead of truncating at 50 active jobs.
- Production exports now require a worker unless `AVIRZO_ALLOW_INLINE_EXPORTS_IN_PRODUCTION=true` is explicitly configured. The current Render web blueprint retains an explicit temporary inline fallback to preserve the optional paid-worker deployment model.

## Deployment
1. Apply `supabase-export-job-reliability.sql` in the Supabase SQL Editor before deploying this release.
2. Deploy the web service. If you want queue-based production exports, deploy the optional `render.worker.yaml` service, configure its required secrets, and set `AVIRZO_WORKER_ENABLED=true` on the web service.
3. Once the worker is healthy, set `AVIRZO_ALLOW_INLINE_EXPORTS_IN_PRODUCTION=false` on the web service so export requests cannot unexpectedly render inside the API process.
4. Run the automated tests and validate a queued export with captions, then download its MP4 and SRT. Test cancellation of a queued job and verify worker retry recovery.

## Validation limitations
Live Supabase RPC behavior, Render worker execution, FFmpeg rendering, and Runway provider polling must still be verified in staging.
