# Avirzo v2.1.3 — Production Polish

## Additional hardening
- Production durable usage-limit failures now fail closed with HTTP 503 instead of silently falling back to per-instance memory limits.
- Asset import now verifies that the supplied project belongs to the authenticated user before storing media.
- Character-performance image data URLs are capped at 12 MB.
- Character-performance reference video data URLs are capped at 45 MB.
- Version strings are aligned at 2.1.3.

## Still required before production sign-off
- Generate and commit the root `package-lock.json`; registry access in this environment timed out, so no lockfile was fabricated.
- Deploy web and worker against the same Supabase project.
- Run the real production smoke test with an authenticated test account, archived scene asset, and worker.
- Verify Runway scene generation, Storage archival, multi-scene export, cancellation, retry, and worker restart behavior.
- Test real mobile browsers and iOS/Android layouts before public launch.
