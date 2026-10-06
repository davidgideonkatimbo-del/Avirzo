# Avirzo — African Cinema Studio

Avirzo is an AI filmmaking studio focused on African heritage, history, oral tradition, languages and culturally grounded visual storytelling.

**Current release: v2.9.2 — Billing Portal & Export Provenance** (premium cinematic studio on the durable production job system).

## Current production procedure
- Keep the web service as the first deployment target.
- Keep the dedicated `avirzo-worker` disabled until we explicitly approve its paid Render plan.
- Generate and commit `package-lock.json` on a networked machine before the final production build.
- Run `npm ci` and `npm run build` before replacing the live web deployment.
- Test the first-film and first-scene flow on Android before adding another major feature.
- Preserve Avirzo's heritage-first African filmmaking identity and the existing project/studio workflow.

## What's new

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
