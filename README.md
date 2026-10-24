# Avirzo — African Cinema Studio

Avirzo is an AI filmmaking studio for **African heritage, history, oral tradition, languages, and culturally grounded visual storytelling** — built so African stories can be made with care and shown to the world.

**Current release: v2.17.13** — provider-specific African voice language mapping, safer media imports, asset cleanup checks, plus queued export reliability and the existing authentication and finance controls.

## Current production procedure
- Keep the web service as the first deployment target.
- The paid `avirzo-worker` lives in `render.worker.yaml` (not `render.yaml`), so deploying the web Blueprint never creates it. Enable it only after approving its paid Render plan.
- Generate and commit `package-lock.json` on a networked machine before the final production build.
- Run `npm ci` and `npm run build` before replacing the live web deployment.
- Test the first-film and first-scene flow on Android before adding another major feature.
- Preserve Avirzo's heritage-first African filmmaking identity and the existing project/studio workflow.

## What's new in v2.17.13

- Voice generation uses provider-specific language codes and refuses unsupported language/provider combinations before charging credits.
- Media imports enforce file-size limits by asset type and validate media signatures. Asset storage failures are checked and database insert failures trigger storage cleanup.

- Queued exports retain SRT subtitles in durable job metadata.
- Failed archive steps clean up partial storage uploads and asset records.
- Cancellation uses a conditional state transition; worker retry limits and stale recovery agree.
- Provider-job polling paginates beyond 50 active jobs.
- Production inline exports require explicit configuration.
- Apply `supabase-export-job-reliability.sql` in Supabase before deploying.


## What's new in v2.17.10

- Fixed password-reset redirect handling for the hash-based app router.
- Sign-out now ends only the current device session.
- Added regression checks for recovery routing and local sign-out.

## What's new in v2.17.9

- Stronger sign-in/sign-out flow and clearer session feedback.
- Profile display-name and email editing using Supabase Auth metadata.
- Password-reset email and authenticated password-change flows.
- Auth form validation, mobile-friendly profile forms, and safer sign-out error handling.

## What's new in v2.17.8
- Finance alerts are stored as a durable outbox with delivery status, retry timing, bounded attempts and dead-letter visibility. Configure and run the worker for retries.
- Import a Runway task-level USD usage CSV with `RUNWAY_INVOICE_ID=... npm run reconcile:runway -- path/to/usage.csv`; the script produces a variance report and leaves unmatched tasks visible rather than guessing.
- Apply `supabase-finance-reconciliation.sql` after the provider-budget and cross-instance guardrail migrations.
- Free accounts receive two lifetime scene generations, no recurring free monthly credits, and a maximum 5-second free scene.
- A database-backed global daily provider-spend ceiling reserves estimated cost before Runway is called; requests fail closed if the budget ledger is unavailable.
- Provider budget reservations and estimated costs are recorded by job; configure `PROVIDER_DAILY_BUDGET_USD` to set the daily cap.
- Run the one-time `supabase-provider-budget.sql` and `supabase-abuse-monitoring.sql` migrations before deploying this release.
- Provider-backed AI features require Supabase-confirmed email by default; private security telemetry logs 401/403/429 responses with HMAC-hashed IPs (never raw IPs or tokens). Set `ABUSE_HASH_SECRET` and review event patterns in Supabase.
- Runway Dev/API cost assumptions and retail-margin examples remain documented in `docs/COMMERCIAL_MODEL_RUNWAY_DEV.md`.
- Sharper exports when captions are burned in (scenes are saved near-lossless before the caption pass).
- Takes: generate two versions of a shot, compare them side by side and choose; regenerating keeps earlier versions.
- Faster exports: finished scenes are re-used when you export again, and scenes can be prepared in parallel on bigger servers.
- 1080p export for paid plans, and the Film finish choice now reaches the exporter.
- Film finish in the export: a consistent colour grade, fine grain, even loudness and an end fade, so stitched scenes feel like one film.
- Keyframe-first film quality: a Runway image model creates each scene's first frame from your character, then it is animated.
- Usage-based credits for video (by model and length), performance, voice and music, so provider cost stays covered.
- Text-only scenes now generate (Runway `text_to_video`); a Draft quality option uses Gen-4 Turbo for image-based scenes.
- Price-checked top-up packs, a free-plan guard (confirmed email, kill switch) and a startup cost summary.
- Full notes: `RELEASE_NOTES_v2.17.13.md`. History: `CHANGELOG.md` and `docs/release-history/`.

- Shared fixed-window rate limits are enforced through atomic Supabase RPCs, so separate Render instances count requests against the same per-IP window; production fails closed if the shared limiter is unavailable.
- Optional finance webhook alerts fire once per UTC day at 70%, 85%, and 95% of the provider daily budget, and when a request is blocked by the cap. Configure `AVIRZO_FINANCE_ALERT_WEBHOOK_URL` in Render.
- Apply `supabase-cross-instance-guardrails.sql` in addition to the existing provider-budget and abuse-monitoring migrations.
- Previous shared-rate-limit implementation notes: `RELEASE_NOTES_v2.17.6.md`; finance delivery and invoice reconciliation history: `RELEASE_NOTES_v2.17.8.md`.

## Earlier feature highlights (v2.1 – v2.10)

- Optional Supabase email/password authentication.
- Account-scoped cloud project library.
- Row Level Security (RLS) policies for project records.
- Private `avirzo-media` storage bucket for character reference images and performance videos.
- Browser uploads use Supabase Storage when a user is signed in; local data-URI fallback remains available for development.
- Server API accepts the Supabase bearer token and verifies the user before cloud project operations.
- Local JSON project storage remains available when Supabase is not configured.
- Existing Runway and ElevenLabs provider keys remain server-side.

## Why this storage architecture

Avirzo project metadata belongs in a database while large media files belong in object storage. Supabase provides Auth, Postgres and Storage with row/object policies. See the official documentation: https://supabase.com/docs/guides/auth/architecture and https://supabase.com/docs/guides/storage/quickstart.

Runway's API documentation recommends object storage/URLs for larger reusable assets; data URIs have lower size limits. Runway ephemeral uploads are useful for short-lived generation inputs but their `runway://` URIs expire after 24 hours. Avirzo therefore keeps durable project media in its own storage layer.

## Setup

1. Create a Supabase project.
2. Run `supabase.sql` in the Supabase SQL editor.
3. Copy `.env.example` to your server environment and set:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Keep `RUNWAYML_API_SECRET` and `ELEVENLABS_API_KEY` only on the server.
5. Install dependencies in both `client` and `server` and start the two development processes.

## Authentication behavior

If Supabase is configured, the Projects panel provides sign-up/sign-in and cloud project storage. If it is not configured, Avirzo continues to use its local server project directory.

## Media security

The included policies restrict the `avirzo-media` bucket to authenticated users and require the first path segment to match the authenticated user's ID. Do not expose a Supabase service-role key in the browser. The server publishable key is not a substitute for provider secrets.

## Current limitation

Generated Runway video URLs may expire. v1.5 stores project metadata and user-uploaded reference media durably, but a later media-ingestion job should copy completed generated films into durable object storage as part of production export.

## Verification

- Server JavaScript syntax checked with Node.
- ZIP contents verified after packaging.
- Full dependency installation/build may still need to be run in a normal development environment with network access.

## v2.1 production deployment

This release includes `Dockerfile`, `render.yaml`, `.dockerignore`, `.github/workflows/ci.yml` and `DEPLOYMENT.md`. The recommended production deployment uses two Render services: the web service for the Vite/Express application and a dedicated background worker for long-running FFmpeg and provider-media jobs, with Supabase for Auth/Database/Storage.


## v2.1 production hardening
- React/Vite plugin config is included.
- Supabase client variables are injected at Docker build time.
- Production provider-cost endpoints require authentication.
- Generated media and production exports can be archived to private Supabase Storage.
- FFmpeg export limits and a per-process serialized export queue are enabled.
- Basic per-user provider quotas are enabled.

## v2.1 — Maintainability & Job System
- Backend routes are split into system, heritage, voice, generation, export, performance, project, asset, and job modules.
- Shared provider/auth/storage logic lives in services instead of the server entrypoint.
- Supabase-backed durable jobs track generation, character performance, and export progress.
- The UI now shows active production jobs and supports cancellation.
- Runway task cancellation is wired to the documented task cancellation/delete operation; provider status remains authoritative for completion.


## v2.1 Background Worker
Production exports and provider media archival run through a dedicated worker. The web service accepts jobs quickly; the worker claims durable Supabase jobs, performs FFmpeg work, archives results, polls Runway tasks, and updates progress.


## v2.2 Heritage Studio
- Guided heritage film templates (oral tradition, documented history, folklore, independence portrait, vertical reel, blank studio).
- Frontend modularization: `constants.js`, `TemplatePicker`, `StudioNav`, shared `Control`.
- Premium design system (CSS variables, template grid, refined nav and generate actions).
- Production job/export/worker architecture from v2.1 remains the backbone.
