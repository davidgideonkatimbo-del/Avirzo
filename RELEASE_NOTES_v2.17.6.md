# Avirzo v2.17.6 — Shared abuse controls and spend alerts

## Changes
- General and sensitive API limits now use a Supabase atomic RPC, shared across Render instances. HMAC hashes of rate-limit keys are stored instead of raw IP addresses.
- Production fails closed with HTTP 503 when shared rate-limit protection is unavailable.
- Daily provider spend alerts can be sent to an optional incoming webhook at 70%, 85%, and 95%, and when a generation is blocked at the ceiling. Database claims prevent duplicate alerts from multiple instances.
- Alerts are one-per-threshold per UTC date. Notification delivery is best effort and never changes the generation-budget decision.

## Deployment
1. Apply `supabase-cross-instance-guardrails.sql` in Supabase after the existing provider-budget and abuse-monitoring SQL migrations.
2. Configure `ABUSE_HASH_SECRET` and optionally `AVIRZO_FINANCE_ALERT_WEBHOOK_URL` in Render. Keep the webhook private.
3. Preserve `PROVIDER_DAILY_BUDGET_USD=25` (or your approved budget) and the two-scene free policy.
4. Run tests/build and validate the shared limiter and alerts in staging before production.

## Limitations
- The limiter is per hashed client IP and route class, not a device/person identity system; NATs can group legitimate users and determined attackers can distribute traffic. Keep per-account generation quotas and email verification.
- Alert delivery depends on the webhook service. The database remains the authoritative budget ledger; alerts are notifications, not budget enforcement.
- Provider cost estimates must be kept aligned with actual Runway model rates. The daily cap cannot guarantee a perfect invoice match if the estimate is too low.
