Current release: v2.17.13. Apply `supabase-export-job-reliability.sql` and the required finance migrations in Supabase before deploying; configure `PROVIDER_DAILY_BUDGET_USD` in Render.

# Avirzo — Launch checklist (v2.17.13)

Ship with pride. Stay honest. Protect cost. Serve the story.

## 1. Production
- [ ] Run full `supabase.sql` (includes credit wallet + monthly grants)
- [ ] Set env: Supabase, Runway, ElevenLabs, Stripe plan prices
- [ ] Add the deployed `#/profile` URL to Supabase Auth allowed redirect URLs; verify signup confirmation and password-reset emails arrive
- [ ] Optional: `CREATOR_CREDITS_PER_MONTH`, `STUDIO_CREDITS_PER_MONTH`, feature scene caps
- [ ] `npm ci` && `npm run build` with lockfile committed
- [ ] Deploy **web** first; enable worker only after paid plan approval
- [ ] Android: first-film path (template → story → scene → preview)
- [ ] Auth: sign up, confirm email, sign in, edit profile, change/reset password, sign out, sign back in, and verify private projects remain

## 2. Cost safety
- [ ] Confirm monthly credits on Free / Creator / Studio match your provider budget
- [ ] Generate with empty credits → 402 + upgrade message
- [ ] Failed provider start → credits refunded
- [ ] Voice and music credit rates match your real ElevenLabs plan
- [ ] Top-up pack USD prices set and above the per-credit floor (check the startup log)
- [ ] One text-only and one image-based scene generated on the real Runway key
- [ ] Free accounts need a confirmed email; `FREE_GENERATION_ENABLED` kill switch understood

## 3. Product truth
- [ ] Do not claim one-click 90-minute generation
- [ ] Do claim: heritage-grounded shorts → sequences → feature-scale assembly on Studio
- [ ] Label oral vs documented; unverified languages stay honest

## 4. World visibility (organic)
- [ ] Share 3–5 example films (oral, documented, vertical, classroom)
- [ ] Tag heritage partners, film schools, African tech/culture media
- [ ] Open a public “first films” thread / page when ready
- [ ] Invite one classroom and one independent filmmaker as design partners

## Positioning line
**Avirzo — African heritage AI cinema. Stories with a soul. Built for African storytellers, ready for the world.**


## v2.17.5 account verification and abuse monitoring
1. Run `supabase-abuse-monitoring.sql` in the Supabase SQL Editor.
2. Set `REQUIRE_VERIFIED_EMAIL=true` in Render. Supabase email confirmation must be enabled in Authentication settings; unverified accounts will be blocked from provider-backed features.
3. Set `ABUSE_HASH_SECRET` to a long random secret distinct from other secrets. If omitted, the service-role key is used as the HMAC key.
4. After launch, review `avirzo_security_events` in the Supabase SQL Editor using the query examples in the migration. Restrict dashboard access to trusted operators.
5. Monitor email delivery and support requests after enabling verification. Do not disable verification merely to bypass email-delivery problems; fix Supabase SMTP and redirect URL settings.


## v2.17.6 shared abuse controls and spend alerts
1. Apply `supabase-cross-instance-guardrails.sql` after the provider-budget and abuse-monitoring migrations.
2. Set `ABUSE_HASH_SECRET` to a strong random secret in Render (distinct from the service-role key).
3. Configure `AVIRZO_FINANCE_ALERT_WEBHOOK_URL` to a private Slack/Discord-compatible incoming webhook; leave it unset if you do not want outbound alerts.
4. Test a rate-limit burst from two app instances and confirm requests share the same IP window. If the shared RPC is unavailable, production API requests are intentionally rejected with HTTP 503.
5. In staging, reserve test spend past 70%, 85%, and 95% of the configured daily budget and confirm one alert per threshold/date. Never test against the live provider key.
6. Review/delete stale rate-limit records if needed; the SQL function opportunistically prunes rows older than two days.
