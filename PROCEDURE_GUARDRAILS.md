Current release: v2.17.13. Apply `supabase-export-job-reliability.sql` and the required finance migrations in Supabase before deploying; configure `PROVIDER_DAILY_BUDGET_USD` in Render.

# Avirzo v2.17.13 — Asset and Voice Guardrails

This release keeps the established Avirzo product and deployment procedure intact.

## Product guardrails
- Avirzo remains focused on African roots, cultures, languages, history, heritage and cinematic storytelling.
- The project/studio workflow remains the core experience.
- The first-film flow remains simple: create film → story → storyboard → first scene.
- Premium additions must not turn the interface back into a congested admin dashboard.

## Deployment guardrails
- Web service first.
- Worker remains optional and must not be deployed without explicit approval of its paid Render plan.
- Do not replace the live web service until a real `package-lock.json` exists and `npm ci` + `npm run build` pass.
- Test the updated build on Android before another major feature.

## v2.9.3 additions
- Stripe customer portal for subscription management.
- Protection against duplicate active subscriptions.
- Server-side AI-generation provenance metadata on exports.
- Cleaner Stripe return handling and billing rate limiting.

These additions are additive; they do not replace the existing production job, Supabase, FFmpeg, or project architecture.

## Account verification and abuse monitoring (v2.17.6)
- Run `supabase-abuse-monitoring.sql` in Supabase SQL Editor after the provider-budget migration.
- Set `REQUIRE_VERIFIED_EMAIL=true` and a unique, long random `ABUSE_HASH_SECRET` in Render.
- Verify Supabase email confirmation, SMTP delivery and redirect URLs before release.
- Review `avirzo_security_events` using the sample SQL queries in the migration. Only trusted operators should access these records.


## v2.17.8 finance operations
- Apply `supabase-finance-reconciliation.sql` after the provider budget and cross-instance guardrail migrations.
- Configure the finance webhook on the web service and, if enabled, the background worker. Worker retries are durable; inspect `avirzo_provider_budget_alerts` for `failed` and `dead_letter` statuses.
- Import only task-level Runway usage lines with an explicit USD cost and verified currency. Investigate unmatched tasks and every non-zero variance before treating a statement as reconciled.

## Authentication and profile guardrails (v2.17.13)
- Keep Supabase Auth as the identity provider; do not store passwords in Avirzo tables or local storage.
- User profile display-name fields are Supabase Auth metadata; private project ownership remains keyed to the authenticated Supabase user ID.
- Email changes may require confirmation. Password-reset redirect URLs must be explicitly allowed in Supabase Auth settings.
- A failed project save must be reported honestly, but must not trap the user in a permanently disabled sign-out button.
