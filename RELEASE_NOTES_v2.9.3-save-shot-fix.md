# Avirzo v2.9.3 — Project Persistence & Shot Generation Fix

## Production-critical fixes

### Project persistence
- Cloud project reads/writes now use the authenticated user's verified database identity through the server-side Supabase service role.
- Project creation and updates perform a read-after-write verification before returning `verified: true`.
- The UI no longer reports a project as successfully saved unless the server confirms the persisted record.
- Project loading no longer converts every database error into a misleading 404.
- Generated scene/timeline state is automatically persisted after a successful shot generation when the project has already been saved.

### Shot generation
- Fixed the Runway Gen-4.5 endpoint selection. Gen-4.5 uses `POST /v1/image_to_video` for both text-only and image-to-video requests; the image is optional for text-only generation.
- Provider rejection messages are preserved in the job record and returned to the UI.
- Existing durable job/archive flow remains in place so completed video can be stored in the project's private media library.

## Verification
- Automated tests: 16/16 passing.
- Node syntax checks pass for the modified server modules.
- Full Vite production build was not certified in this environment because dependencies were not installed in the uploaded ZIP and the dependency installation attempt timed out. Render/Docker should perform the dependency installation and production build.
- No package-lock.json was fabricated.

## v2.9.4 premium creator polish
- Redesigned creator profile as an editorial/cinematic creator workspace rather than a dashboard card layout.
- Fixed mobile topbar context so Profile and Settings no longer display HOME.
- Improved long email/account text handling on narrow screens.
- Kept all existing authentication and profile actions intact.
- No new product features or provider behavior changed in this polish pass.
