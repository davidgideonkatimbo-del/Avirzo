# Avirzo v2.1.4 — Runtime Resilience Polish

## Improvements

- Export cancellation is now checked throughout the export pipeline, not only between progress updates.
- Worker export processing receives a durable cancellation check and stops before starting additional expensive stages when a user cancels.
- Worker loop now survives transient Supabase/provider failures instead of terminating the entire worker process after one failed tick.
- Existing stale export-lock recovery remains active through the Supabase claim function.
- Provider generation cancellation and export retry endpoints remain durable and user-scoped.
- Version strings aligned to 2.1.4.

## Validation

- Server syntax checks pass for exporter, worker, core, and job routes.
- Existing production hardening remains: durable jobs, project ownership, private Storage, asset-ID exports, SSRF protection, usage limits, provider success-without-output handling, and production CORS requirements.

## Still required before final production release

1. Generate and commit the root `package-lock.json` so CI/Docker can use reproducible `npm ci` installs.
2. Deploy web and worker against the same Supabase project.
3. Run the production verification script with a real authenticated test account.
4. Run a real generation, cancellation, retry, and multi-scene export test.
5. Verify worker restart recovery and stale-job recovery in the deployed environment.
