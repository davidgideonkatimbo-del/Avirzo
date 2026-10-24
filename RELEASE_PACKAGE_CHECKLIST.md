Current release: v2.17.13. Apply `supabase-export-job-reliability.sql` and the required finance migrations in Supabase before deploying; configure `PROVIDER_DAILY_BUDGET_USD` in Render.

# Avirzo v2.17.13 Release Package Checklist

This package is intended to be pushed to `main` before production deployment.

## CI release gate

GitHub Actions will:

1. Generate `package-lock.json` if it is missing.
2. Install with `npm ci`.
3. Run `npm test`.
4. Run the production client build.
5. Run Render static certification.
6. Check server syntax.
7. Build the production Docker image.
8. Only after all checks pass, commit the generated lockfile.

The lockfile commit is deliberately last so a Render auto-deploy cannot be triggered by an unverified dependency graph.

## Deployment procedure

**Build → automated tests → production build → verified lockfile → web deployment → Android test → worker only when explicitly approved.**

The Render worker remains optional and is not enabled by this package.

## v2.17.6 pre-deploy checks (commercial free allowance, credits and providers)

- [ ] `npm test` passes (108 passed, 2 skipped without server dependencies).
- [ ] Confirm Render has `FREE_TRIAL_DAYS=365`, `FREE_GENERATIONS_PER_YEAR=2`, and `FREE_CREDITS_PER_MONTH=0` unless a different policy is intentional; hosting environment values override code defaults.
- [ ] `npm run build` completes (the client build has not been run in the authoring environment).
- [ ] Voice (`CREDITS_PER_1K_VOICE_CHARS`) and music (`CREDITS_PER_MUSIC_SECOND`) rates match your real ElevenLabs plan.
- [ ] Top-up packs: set `CREDIT_PACK_<X>_PRICE_USD`; the startup log lists any pack hidden for being priced too low.
- [ ] Generate one text-only scene (Runway `text_to_video`, Gen-4.5) and one scene with a reference image (`image_to_video`) on the real Runway key.
- [ ] Confirm `ffprobe` is available if you want uploaded performance videos measured on the server.
- [ ] Generate one scene with "Keyframe first" on: confirm the first frame appears, then the video. Try it with a character image (as a data URL and as an HTTPS URL) and without one.
- [ ] Confirm `RUNWAY_GEN4_IMAGE_CREDITS` and `RUNWAY_GEN4_IMAGE_TURBO_CREDITS` match Runway's current image pricing.
- [ ] Export a short film with Filmic and with None: compare the look, file size and audio level on a phone and on a laptop.
- [ ] Export the same short film at 720p and 1080p on a paid plan and compare sharpness, file size and render time.
- [ ] In the export screen, pick Warm and then None and confirm the exported looks really differ (this was broken in v2.14.0).
- [ ] Export the same film twice on the deployed worker: the second export should be much faster and report scene cache hits. Change the finish and confirm it renders fresh.
- [ ] If the worker has 4 or more CPU cores, try `EXPORT_SCENE_CONCURRENCY=2` and compare render times.
- [ ] Click "Generate 2 takes" on a real scene: both should appear side by side, "Use take" should switch the preview and the timeline, and the export should use the chosen take.
- [ ] Reload the project and confirm the takes and the chosen one are still there.
- [ ] Check credits: two takes should use twice the credits of one shot.
- [ ] Export one film with burned-in captions on Standard: check the picture is clean around fine detail and the captions line up with the speech.

## Account verification and abuse monitoring (v2.17.6)
- Run `supabase-abuse-monitoring.sql` in Supabase SQL Editor after the provider-budget migration.
- Set `REQUIRE_VERIFIED_EMAIL=true` and a unique, long random `ABUSE_HASH_SECRET` in Render.
- Verify Supabase email confirmation, SMTP delivery and redirect URLs before release.
- Review `avirzo_security_events` using the sample SQL queries in the migration. Only trusted operators should access these records.


## v2.17.6 shared rate limits and finance alerts
- [ ] Apply `supabase-cross-instance-guardrails.sql` after `supabase-provider-budget.sql` and `supabase-abuse-monitoring.sql`.
- [ ] Set `ABUSE_HASH_SECRET` to a long random value in Render.
- [ ] Optionally set `AVIRZO_FINANCE_ALERT_WEBHOOK_URL` to a private incoming webhook for budget alerts.
- [ ] Confirm API rate limits are shared across multiple instances and fail closed when the Supabase RPC is unavailable.
- [ ] In staging, verify alerts at 70%, 85%, 95% and the budget-block event, once per UTC day/threshold.
- [ ] Run `npm test`, `npm run validate:render`, `npm ci`, and `npm run build` before production rollout.

## Authentication and profile staging checks

- [ ] New account signup and email confirmation work.
- [ ] Existing user sign-in restores the correct session and private projects.
- [ ] Display name saves and is restored after a fresh sign-in.
- [ ] Email update displays the confirmation requirement accurately.
- [ ] Password reset email arrives and reset redirect returns to Avirzo.
- [ ] Signed-in password change succeeds.
- [ ] Sign-out saves the active project when possible, clears private workspace state, and returns to a signed-out UI.
- [ ] Another account cannot view the first account's projects.
