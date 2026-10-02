# Avirzo v2.1.2 — Production Reliability Pass

## Fixed
- Durable job updates now fail closed when production Supabase job storage fails; production no longer silently falls back to process memory.
- Provider generation and character-performance jobs are created durably before contacting Runway, preventing orphan provider tasks when tracking fails.
- Provider request failures now mark the pre-created job as failed.
- Added project ownership validation for generation, character performance, and film export requests.
- Production film exports now require archived scene asset IDs instead of depending on expiring signed provider URLs.
- Export worker resolves scene asset IDs to fresh private Storage signed URLs at export time.
- Worker marks a provider job failed when the provider reports success without an output asset.
- Empty audio-track URLs are no longer rejected during export validation.
- Version bumped to 2.1.2.
- Deployment documentation now explicitly calls out the need to commit package-lock.json for reproducible releases.

## Verified locally
- Server JavaScript syntax checks pass for app, routes, services, and worker.
- Static release checks confirm Vite config, Render config, Supabase schema, worker, health reporting, ownership validation, durable export handling, and provider success/error handling are present.

## Still required before calling production-ready
1. Generate and commit the root package-lock.json, then use npm ci in the final release pipeline.
2. Deploy web + worker to Render using the same Supabase project.
3. Run scripts/verify-production.mjs against the deployed URL with a real authenticated test account.
4. Confirm a real Runway scene is archived to Supabase Storage and appears in the jobs/assets tables.
5. Confirm a real multi-scene export completes through the worker and the final MP4 is stored privately.
6. Test cancellation, retry, provider failure, worker restart, and expired signed-URL scenarios in the deployed environment.


## Additional v2.1.2 polish
- Voice generation now archives generated MP3 audio to private Storage when a project is selected, returning a fresh signed URL instead of forcing large base64 payloads.
- Voice generation validates project ownership and caps dialogue input at 12,000 characters.
- Generated voice archives clean up their Storage object if database registration fails.
- Generation polling now fails the durable job if Runway reports `succeeded` without an output media asset.
- Production smoke-test script now accepts `AVIRZO_TEST_ASSET_ID` for the production export path.
