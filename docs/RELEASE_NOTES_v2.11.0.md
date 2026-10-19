# Avirzo v2.11.0 — Infrastructure, workers, growth loops

Implements the three-phase improvement plan.

## Phase 1 — Infrastructure
- Extra Postgres indexes on projects, assets, members, invites, comments, usage, jobs.
- Job `priority` column + claim ordered by priority then age.
- `validate:render` prints required production env secrets checklist.

## Phase 2 — Background workers
- Job priorities: analysis high (1), generation normal (5), film export low (10).
- `safeFetchBuffer` retries with exponential backoff on transient network failures (skips permanent SSRF/validation errors).
- Worker normalizes Runway `CANCELLED` → `canceled`.

## Phase 3 — Growth loops
- Collaboration invites return a **share link** with token; `POST /api/collaboration/accept-invite` joins a room after sign-in.
- Heritage **template pack** export/import API; client can download a framework JSON and auto-accept invite query params.

## Deploy notes
1. Run the new SQL (or full `supabase.sql`) in Supabase so indexes + priority + claim function exist.
2. Set `AVIRZO_PUBLIC_URL` so invite share links are absolute.
3. Deploy web (and worker if enabled).

## Follow-up fixes (same version)
- Worker moved out of `render.yaml` into `render.worker.yaml` so a web Blueprint sync never creates a paid service.
- `safeFetchBuffer` retries only transient failures (timeouts, dropped connections, 408/429/5xx); 403/404 and SSRF/validation errors fail at once.
- Invites expire after 7 days (`expires_at`; run the new SQL block), require a confirmed email that matches the invite, and return 410 when expired.
- Collaboration routes no longer return raw database error text; member profile lookups run in parallel.
- Added behavioral tests (`server/test/behavior.test.js`) for SSRF checks, retry rules and job priorities.

## Follow-up fixes, round 2
- **Security fix in `supabase.sql`:** the v2.10.4 `claim_avirzo_job` redefinition dropped the function but never re-applied its `revoke`/`grant`, leaving a SECURITY DEFINER function callable by signed-in users. It now ends with revoke from public/anon/authenticated and grant to service_role. Re-run `supabase.sql`.
- The same redefinition had lost stale-worker recovery (30 min, dead-letter after 3 attempts) and worker_id assignment; both are restored.
- Job aging: every 5 minutes of waiting improves a job's priority by one step, so film exports cannot be starved.
- Built-in rate limiting (300 req/min per IP; 40 per 10 min on collaboration/billing writes; health check and Stripe webhook exempt). Tunable via env.
- Content-Security-Policy sent in report-only mode; set `CSP_ENFORCE=true` once the browser console shows no violations.

## Follow-up fixes, round 3 (bug fixes)
- **Invite share links were broken:** the client treated `projects?invite=…&email=…` as the page name (blank page) and never read the token, so nobody could actually join from a link. The page name now ignores the query, the token is kept (and removed from the address bar), and the invite is accepted automatically after sign-in. An unsigned visitor sees a "sign in with the invited email" message.
- Template-pack import now applies the same size limits as export, rejects array-shaped sections and generates collision-safe ids.

## Follow-up: free-tier cost controls
- Yearly generation budgets are set per plan from env (`FREE_/CREATOR_/STUDIO_GENERATIONS_PER_YEAR`). Free is now 5 clips for the free month; Creator 60 and Studio 200 are unchanged.
- Optional `FREE_GENERATION_MODEL=gen4_turbo` moves free accounts to the cheaper Runway model when a reference image is supplied. Defaults are unchanged.
- Plan helpers moved to `server/src/services/plans.js` (dependency-free, unit-tested).

## Follow-up: free tier is one month
- Free accounts can use video generation, voices and character performance for 30 days (`FREE_TRIAL_DAYS`), counted from sign-up or from `FREE_TRIAL_POLICY_START` (default 2026-10-09) for accounts that already exist. After that those routes return 402 `TRIAL_ENDED`.
- Projects, exports and sign-in keep working so nobody loses access to their own work.
- Billing page shows days left, or a prompt to choose Creator/Studio once the month is over.

## Follow-up: fewer free clips
- Free accounts now get 5 clips (was 20), counted from the start of their free month, so the count can't reset on 1 January mid-trial.
- Billing usage display fixed: it looked up every counter with the hourly window, so yearly generation usage always showed 0. Each kind now uses its own window.
