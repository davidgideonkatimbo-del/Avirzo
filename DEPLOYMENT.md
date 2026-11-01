# Avirzo Production Deployment

## Recommended architecture

- One Render Docker Web Service serves the Vite-built frontend and Express API.
- Supabase provides Auth, Postgres and private Storage.
- Runway and ElevenLabs keys stay server-side.
- FFmpeg is installed inside the Docker image for film assembly.

## 1. GitHub

Create a repository and push the contents of this folder. Do not commit `.env` files or provider secrets.

## 2. Supabase

Create a project, then run `supabase.sql` in the SQL editor. Configure Auth email/password and create the private `avirzo-media` bucket if the SQL migration does not create it in your project.

Use the project URL, publishable key, and service-role key only where appropriate. The service-role key belongs on the server only.

## 3. Render

Create a new Web Service from the GitHub repository. Render can build Docker-based services and automatically redeploy when the linked branch changes.

This repository includes `render.yaml`, so the service can also be configured from the Blueprint flow.

Set these environment variables in Render:

- `RUNWAYML_API_SECRET`
- `ELEVENLABS_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ALLOWED_ORIGINS` — for this single-service deployment, leave empty only if the server explicitly treats empty as same-origin; otherwise set the exact public origin.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` — required at Docker build time for the Vite client.
- `AVIRZO_PUBLIC_URL` — set to the exact public Avirzo URL (or custom domain).
- `STRIPE_WEBHOOK_SECRET` — required if Stripe subscriptions are enabled.

The service listens on `0.0.0.0` and the `PORT` supplied by Render.

## 4. First health check

Open `/api/health` on the deployed Avirzo URL. It should report the Avirzo version, video provider, voice provider and cloud mode.

## 5. GitHub Actions

The included workflow currently runs `npm install`, the client build, and a Node syntax check on every push/PR to `main`.

## 6. Custom domain

After the service is live, attach your domain in Render and update the DNS records shown by Render. If you later split frontend and backend onto different hosts, set `ALLOWED_ORIGINS` to the exact frontend origin(s).

## Important production note

Avirzo v2.1 moves long-running film exports and provider-media polling into the dedicated `avirzo-worker` background service. The Express service accepts jobs and serves the UI/API; the worker claims durable Supabase jobs and performs the long-running work. Supabase Edge Functions remain suitable for short-lived orchestration, while heavy work belongs in the worker.


## v2.1 production checklist

### Client build variables
The Vite client needs these **build-time** variables (they are publishable Supabase values, not secrets):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Render passes them as Docker build arguments through `render.yaml`. Do not put Runway, ElevenLabs, or the Supabase service-role key in `VITE_*` variables.

### Server secrets
Keep these server-only: `RUNWAYML_API_SECRET`, `ELEVENLABS_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

### Production behavior
- Provider-backed generation, voice, character-performance and film-export endpoints require a signed-in Supabase user when `NODE_ENV=production`.
- Generated Runway outputs are automatically archived into private Supabase Storage when the request includes a saved `projectId`. Character reference uploads are stored under the user account and reopened through short-lived signed URLs when needed.
- Production final exports are written to Supabase Storage; the local `exports/` directory is only used in development.
- FFmpeg exports are capped at 30 scenes, 15 minutes and 500 MB, and export jobs are serialized per server process.
- Basic per-user hourly limits protect provider spend: generation 20, voice 20, character performance 10, exports 5. These are process-local limits; use a durable queue/usage table before running multiple server instances.

### Lockfile note
A `package-lock.json` should be generated and committed from a networked development environment before production. This build environment cannot resolve the npm registry, so the release intentionally keeps `npm install` in CI/Docker rather than shipping a fabricated lockfile. Once the real lockfile is committed, switch both to `npm ci`.

## v2.1 job system migration
Run the updated `supabase.sql` in the Supabase SQL editor before using the durable job dashboard. It creates the `public.jobs` table, indexes, RLS policies, and the `updated_at` trigger.

Avirzo v2.1 records video generation, character-performance, and film-export jobs with `queued`, `running`, `succeeded`, `failed`, `canceled`, or `dead_letter` status. Runway generation jobs retain their provider task ID so the UI can poll status and request cancellation. The dedicated worker handles heavy FFmpeg exports and Runway media polling. `media_ingestion` is no longer a public job type in v2.1; media imports use the asset API directly.


## v2.1 worker deployment

Run the appended v2.1 section of `supabase.sql` before deploying. Render creates only the `avirzo` web service from `render.yaml`. The paid `avirzo-worker` is defined separately in `render.worker.yaml`; create it from a new Blueprint only after approving the cost. The worker needs `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `RUNWAYML_API_SECRET`; the web service keeps the normal public/client and provider environment variables. Production film exports return `202` with a durable job ID and are processed by the worker.

The worker includes stale-job recovery: jobs left running with a worker lock for more than 30 minutes can be reclaimed. Failed and canceled jobs can be retried from the Avirzo Production Jobs panel.

The Render worker is configured as a Starter background service because long-running FFmpeg work should not share the web process. If your Render account has different worker-plan availability, select the lowest background-worker plan that supports your deployment.


## Production smoke test
After the web service and worker are deployed, apply `supabase.sql`, sign in once to obtain a Supabase access token, and run:

```bash
AVIRZO_BASE_URL=https://YOUR-AVIRZO-URL AVIRZO_ACCESS_TOKEN=YOUR_ACCESS_TOKEN AVIRZO_TEST_ASSET_ID=YOUR_VIDEO_ASSET_ID AVIRZO_PROJECT_ID=YOUR_PROJECT_ID npm run verify:production
```

The script checks `/api/health`, confirms FFmpeg and worker configuration, queues a real film-export job, waits for completion, and requires the resulting job to contain `result_asset_id`. Then verify that the matching row exists in `public.assets` and the file exists under the user's folder in the private `avirzo-media` bucket. The web and worker services must use the same `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; v2.1 also exposes the worker's Supabase project reference and heartbeat on `/api/health`.

Render's Docker runtime makes service environment variables available as Docker build arguments, so the existing `ARG VITE_SUPABASE_URL` and `ARG VITE_SUPABASE_PUBLISHABLE_KEY` are consumed during the Vite build. Render documents this behavior, but only public Vite values should be used this way; never pass provider secrets as build arguments. The Docker build now fails if either build-time value is missing.

## Dependency lockfile
For reproducible production releases, generate and commit the root `package-lock.json` before the final release. The Dockerfile and CI use `npm ci` automatically when the lockfile is present; otherwise they retain the development fallback to `npm install`.

## Sharing one Supabase project with another app (v2.1.8)
All Avirzo database objects are prefixed `avirzo_` (tables `avirzo_projects`, `avirzo_assets`, `avirzo_jobs`, `avirzo_usage_counters`, `avirzo_worker_heartbeats`; functions `claim_avirzo_job`, `consume_avirzo_usage`, `avirzo_set_updated_at`; bucket `avirzo-media`), so `supabase.sql` can run in a project that already hosts another app and never touches that app's tables, policies, triggers or functions. It is safe to run repeatedly.

- Fresh setup: run `supabase.sql` once.
- You ran an older Avirzo script in this same project and want to keep the data: run `supabase-migrate-from-unprefixed.sql` first, then `supabase.sql`.
- Caveat: Supabase Auth is per project, so both apps share one user list. Anyone who signs up in one app can sign in to the other (they still cannot see each other's rows). A separate Supabase project avoids this.


## v2.3 premium services

Optional server environment variables:
- `GOOGLE_TTS_API_KEY` for Google Cloud TTS
- `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION` for Azure Speech
- `AWS_REGION` + AWS credentials for Amazon Polly
- `STRIPE_SECRET_KEY`, `STRIPE_CREATOR_PRICE_ID`, `STRIPE_STUDIO_PRICE_ID` for checkout

Billing checkout should not be marketed as live subscriptions until a Stripe webhook is configured to reconcile successful checkout, subscription updates and cancellations into `avirzo_billing_accounts`.

Render Docker services expose configured environment variables as Docker build arguments, so the existing `ARG VITE_SUPABASE_*` build path is compatible with Render's Docker build environment. Do not put secret API keys into Docker build arguments; only public Vite configuration belongs in the client build.

## Premium production features
Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CREATOR_PRICE_ID`, and `STRIPE_STUDIO_PRICE_ID` for subscription checkout + webhook reconciliation. Register `POST /api/billing/webhook` in Stripe.
Optional voice providers: `GOOGLE_TTS_API_KEY`, `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`.
Run the latest `supabase.sql` migration before using Versions, Comments, Scene Approval, or the Heritage Production Passport.

## Current staged deployment procedure

1. Verify the GitHub root structure before deployment.
2. Generate and commit the real `package-lock.json` from a networked machine.
3. Run `npm ci` and `npm run build` successfully.
4. Deploy/update the **web service only** first.
5. Keep `avirzo-worker` undeployed until its paid Render cost is explicitly approved.
6. Open Avirzo on an Android phone and test: Home → Studio → Start a Film → Build storyboard → Scenes.
7. Only after that phone test passes should we add another major product feature.

The premium billing/provenance changes in v2.9.3 do not change this deployment order.

## v2.9.3 Render certification checklist

1. Apply the latest `supabase.sql` before deploying the v2.9.3 features.
2. Create/update the `avirzo` web service from `render.yaml`. Add the worker later from `render.worker.yaml`.
3. Set the same `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on both services.
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` on the web service before the Docker build. Render exposes service environment variables as Docker build arguments, and the Dockerfile consumes these two public values with `ARG`.
5. Set `AVIRZO_PUBLIC_URL` to the deployed public URL and `ALLOWED_ORIGINS` to that exact origin if cross-origin requests are ever introduced.
6. Billing: for Pesapal (the default once its keys are set) follow "Payments with Pesapal" below; only if you use Stripe (`BILLING_PROVIDER=stripe`) set `STRIPE_WEBHOOK_SECRET` and register `POST /api/billing/webhook` in Stripe.
7. Confirm `/api/health` returns `ok: true`, `ffmpeg: true`, `workerConfigured: true`, and eventually `workerOnline: true`. Render HTTP health checks require a 2xx/3xx response within five seconds.
8. Confirm the worker heartbeat `project_ref` matches the web service's Supabase project reference.
9. Run `npm run verify:production` against a real signed-in account after deployment.
10. Verify a successful export creates both an `avirzo_jobs` success record with `result_asset_id` and a corresponding private `avirzo-media` Storage object.

### Render security note
Do not put provider secrets in `VITE_*` variables or Docker build arguments. Render warns that Docker build arguments can persist in image layers; secrets should remain runtime-only.

### Reproducible builds
A production-grade release should include a real `package-lock.json` generated from a networked environment and then use `npm ci` without the fallback. This package does not fabricate a lockfile because the build environment could not reach the npm registry.

## v2.8.4 notes (Stripe mode)
- Run the latest `supabase.sql` BEFORE deploying (owner-lock trigger, caller-bound role function, invite index, billing event tables).
- Billing: set `STRIPE_WEBHOOK_SECRET`, `STRIPE_CREATOR_PRICE_ID`, `STRIPE_STUDIO_PRICE_ID`; point the Stripe webhook at `/api/billing/webhook` for `checkout.session.completed` and `customer.subscription.created|updated|deleted`.
- Plan quota multipliers live in `PLAN_LIMIT_MULTIPLIER` (server/src/services/core.js).
- Optional: `ALLOWED_MEDIA_HOSTS`, `EXPORT_MAX_TOTAL_MB`, `EXPORT_MAX_UPLOAD_MB`, `PROVIDER_JOB_MAX_MINUTES`.

## v2.9.3 billing portal setup (Stripe mode only)
The billing portal exists only when Stripe is the active provider. Pesapal plans are prepaid and have no portal.
1. In Stripe: Settings > Billing > Customer portal > turn it on (choose what customers may change: plans, payment method, cancellation).
2. Set `STRIPE_SECRET_KEY` and `AVIRZO_PUBLIC_URL` (e.g. https://your-app.onrender.com) on the web service.
3. Subscribers then see "Manage subscription" in the Billing panel; customers with an active subscription cannot start a second checkout.

## Database migrations (apply in this order)
Run each file once in the Supabase SQL Editor (all are safe to re-run unless noted). Always apply migrations **before** deploying the release that needs them.

1. `supabase.sql` — the full schema (fresh setup). If you ran an older unprefixed Avirzo script in the same project and want to keep that data, run `supabase-migrate-from-unprefixed.sql` first (optional, one-time).
2. `supabase-abuse-monitoring.sql` — verified-email enforcement and privacy-preserving abuse events.
3. `supabase-provider-budget.sql` — the daily provider-spend ceiling.
4. `supabase-cross-instance-guardrails.sql` — shared rate limits and one-time daily spend alerts.
5. `supabase-finance-reconciliation.sql` — durable finance-alert retries and Runway invoice reconciliation. **Re-run it for v2.19.3**: it now allows `next_attempt_at` to be NULL so delivered alerts stop re-sending.
6. `supabase-export-job-reliability.sql` — queued-export and job reliability.
7. `supabase-legal-safety.sql` (v2.18.0) — consent records and content reports.
8. `supabase-pesapal.sql` (v2.19.0) — Pesapal orders and the double-credit guard. **Re-run it for v2.19.2.**

## Payments with Pesapal (v2.19+)
Pesapal is used automatically when `PESAPAL_CONSUMER_KEY` and `PESAPAL_CONSUMER_SECRET` are set; `BILLING_PROVIDER=stripe` forces Stripe instead.

1. Create a Pesapal merchant account. Ask Pesapal to enable **USD** and **international cards** (Visa, Mastercard, American Express) and confirm fees, settlement currency and payout schedule.
2. Set on the web service: `PESAPAL_CONSUMER_KEY`, `PESAPAL_CONSUMER_SECRET`, `PESAPAL_ENV` (`sandbox` until you go live, then `live`) and a public https `AVIRZO_PUBLIC_URL`. `PESAPAL_CURRENCY` defaults to `USD`. Plans default to $19 (Creator) and $59 (Studio) and packs to $6 / $20 / $55; override with `PESAPAL_CREATOR_PRICE`, `PESAPAL_STUDIO_PRICE`, `PESAPAL_PACK_*_PRICE` or `CREDIT_PACK_*_PRICE_USD`. Any other currency needs explicit prices and `PESAPAL_UNITS_PER_USD`.
3. The server registers `https://<your-app>/api/billing/pesapal/ipn` with Pesapal automatically (or set `PESAPAL_IPN_ID`). Pesapal cannot call `localhost`, so test the notification flow on your deployed URL; the browser return still settles a payment during local sandbox tests.
4. Plans are prepaid for `PESAPAL_PLAN_DAYS` (default 30) and never renew automatically. A plan or pack that would sell below provider cost is not offered; watch the startup log for `[pesapal] NOT offered` lines.
5. Pay for a plan in the sandbox, then check `avirzo_pesapal_orders` (status `completed`) and the plan's paid-until date in the Billing panel.

## Legal pages, consent and safety (v2.18+)
- Terms and Privacy live in `client/public/terms.html` and `privacy.html`. Review the contact email, entity name and wording, and keep their "Effective" date equal to `LEGAL_VERSION` in `server/src/routes/account.js`; changing `LEGAL_VERSION` asks every user to accept again.
- Set `AVIRZO_OPS_ALERT_WEBHOOK_URL` (Slack/Discord-compatible) to be alerted about server errors, crashes, failed account deletions, content reports and payment reversals.
