# Avirzo v2.1.6 — Idempotent Archiving & Retry Quota

## Fixes
- **One asset per provider task.** Web polling, the worker and retries can no longer archive the same Runway result more than once. Archiving uses a deterministic storage path plus a unique index on `assets(user_id, provider_task_id)`; a concurrent loser reuses the winner's asset. Callers use the new `archiveProviderOutput()`.
- **No premature success.** The poll route used to mark a job `succeeded` before the media was saved, so a failed archive left a "succeeded" job with no asset (and hid it from the worker). Now the job becomes `succeeded` only after archiving; if archiving fails the poll reports `running` ("saving it to your library") and the worker/next poll retries.
- **Canceled jobs are not archived** by the poll route.
- **Empty provider files are rejected** instead of stored.
- **Export retry now consumes the hourly export quota** (checked after validation, so invalid retries cost nothing).

## Required migration
Re-run `supabase.sql` (adds `assets.provider_task_id` and the unique index; safe to repeat).

## Validation (static/simulated only)
- Server syntax checks pass.
- Mocked-Supabase simulation: two concurrent archives -> 1 asset row, 1 stored object; later callers reuse it; a job with `result_asset_id` short-circuits.
- Not tested against live Supabase/Runway.

## Still open
`package-lock.json`; live end-to-end test; exporter ignores 9:16 `format`; audio ducking/captions unverified; exports buffer whole files in memory; `/api/assets/import` (client-initiated) is not task-idempotent; base64 audio in project JSON.
