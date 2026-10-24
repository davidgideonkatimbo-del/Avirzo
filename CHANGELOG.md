## v2.17.13 — Asset and voice reliability
- Added provider-specific voice locale mapping and pre-charge rejection for unsupported language/provider combinations.
- Added media import size limits, signature validation, checked storage operations and cleanup after database insertion failures.

- Align free-generation allowance and recurring free credits between web and worker services (2 generations, 0 monthly free credits).
- Apply the same verified-email, free-model, trial-window and provider daily-budget policy to both services.
- Keep the $25 UTC-day provider budget explicit on the worker as well as the web service.
- Set production inline exports to fail closed by default; enable queued exports only after the optional paid worker is deployed and healthy.
- Remove duplicate environment entries and add configuration regression checks. The current free access window remains 365 days by policy; change it only through an explicit product decision.

## v2.17.11 — Export and background-job reliability

- Persist SRT subtitle content in durable job result metadata so queued exports retain downloadable subtitles after the worker finishes.
- Roll back partial private-storage uploads and asset rows when an export fails after archival begins.
- Make queued/running cancellation a conditional database update, preventing a queued job canceled first from being claimed afterward.
- Align stale-job recovery with the worker-configured retry limit (bounded to 1–20 attempts).
- Paginate provider-job polling instead of silently stopping at 50 active jobs.
- Add regression coverage and a Supabase migration for the new job result metadata and retry policy.

## v2.17.10 — Authentication recovery and sign-out fixes

- Fix password-reset redirect handling for the hash-routed app; route to the profile only after Supabase emits `PASSWORD_RECOVERY`.
- Make sign-out local to the current device rather than ending all of the user's sessions.
- Keep all runtime/package version markers aligned at v2.17.10.

## v2.17.9 — Sign-in, sign-out and profile management

- Added profile display-name and email updates, password reset, and password change flows.
- Improved authentication validation, session restoration, and sign-out error handling.
- Preserved save-before-sign-out behavior and made profile forms responsive.

## v2.17.8 — Finance delivery and reconciliation debug fixes
- Atomically claim alert delivery attempts across web and worker instances.
- Fix invoice row idempotency for identical charge lines, sum ledger estimates correctly, and page Supabase reads.

## v2.17.7 — Finance alert reliability and Runway reconciliation
- Persist alert delivery state, attempts, retry deadlines and last errors; retry transient failures from the worker and dead-letter after eight attempts.
- Add idempotent Runway task-level USD invoice/usage import with job matching and estimate-versus-actual variance report. The importer rejects ambiguous rows and non-USD values instead of guessing.
- Add Supabase migration `supabase-finance-reconciliation.sql`.

## v2.17.6 — Shared abuse controls and finance alerts
- Added cross-instance Supabase-backed atomic rate limiting for general API and sensitive write routes. Production fails closed when the shared protection is unavailable.
- Added one-time-per-day provider budget alerts at 70%, 85%, 95%, and at budget exhaustion via an optional incoming webhook.
- Added `supabase-cross-instance-guardrails.sql` migration and Render environment settings.

## v2.17.5 — Account verification and abuse monitoring
- Require Supabase-confirmed email before provider-backed AI operations by default.
- Record 401/403/429 API rejections in a private Supabase security-events table.
- Hash IP addresses with HMAC before storage; never log raw IP addresses, bearer tokens, or request bodies.
- Add SQL queries for identifying repeated rate-limit/authentication events across accounts.

# Avirzo changelog

Current release: **v2.17.13**. Full notes: `RELEASE_NOTES_v2.17.13.md`. Older notes: `docs/release-history/`.

- **v2.17.5** — loss prevention: lifetime free-scene bucket, free scenes capped at 5 seconds, and a database-backed global daily provider-spend budget with fail-closed behavior.
- **v2.17.3** — commercial credit policy: two free scene generations, no recurring monthly Free credits, and a Runway Dev/API cost model.
- **v2.17.1** — keyframe-first film quality (Runway image model makes the first frame, then it is animated).
- **v2.12.8** — hardening: bad quotes can never mean free, safe async performance-video probe, startup cost summary.
- **v2.12.7** — text-only scenes use Runway `text_to_video`.
- **v2.12.6** — usage-based pricing for voice, music and performance; price-checked top-up packs; free-plan guard; draft quality option; usage records.
- **v2.12.5** — model-aware video credits (Gen-4.5 / Gen-4 Turbo).
- **v2.12.4 and earlier** — see `docs/release-history/`.
