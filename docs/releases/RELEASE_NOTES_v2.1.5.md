# Avirzo v2.1.5 — Job State & Worker Resilience

## Fixes
- **Canceled jobs stay canceled.** `jobs.update` refuses to move a canceled job to running/succeeded/failed/queued (a late worker or provider result can no longer overwrite it). Only an explicit retry may (`allowOverCanceled`).
- **Worker no longer stalls during exports.** Export processing and Runway polling now run in independent loops, and the heartbeat runs on its own 15s timer, so health no longer shows "offline" during long exports.
- **Lock renewal.** Running exports renew `locked_at` every 60s and on each progress update, so the 30-minute stale-lock reclaim cannot start a duplicate run of a live job.
- **Graceful shutdown.** On SIGTERM/SIGINT the in-flight export is returned to the queue immediately instead of waiting for lock expiry.
- **Permanent vs. transient failures.** Export errors that cannot succeed on retry (disallowed URL, oversized file, missing input) fail immediately; transient errors still retry up to `WORKER_MAX_ATTEMPTS`, then dead-letter.
- **Provider jobs cannot hang forever.** Runway tasks that exceed `PROVIDER_JOB_MAX_MINUTES` (default 45) or return 404 are marked failed with a clear message.
- `dead_letter` jobs can no longer be "canceled".

## Validation (static/unit only, not live infrastructure)
- Server syntax checks pass.
- Unit test of the cancel guard (late success blocked, non-status patches still apply, explicit retry works).

## Still required before production
1. Generate and commit `package-lock.json` (needs network): `npm install`, then commit the lockfile.
2. Real deployment test: web + worker on one Supabase project, real generation, cancel, retry, multi-scene export, worker restart.
3. Known open items: retry does not re-consume export quota; provider results can still be archived by both the web poll and the worker (add a unique index on `provider_task_id`/idempotent archiving); exporter ignores the 9:16 `format`, ducking/captions are unverified, and large files are fully buffered in memory.
