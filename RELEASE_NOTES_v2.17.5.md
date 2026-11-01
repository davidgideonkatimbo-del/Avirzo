# Avirzo v2.17.5 — Account Verification & Abuse Monitoring

## Changes
- Provider-backed AI actions require a Supabase-confirmed email by default (`REQUIRE_VERIFIED_EMAIL=true`). Verification is checked from the trusted Supabase user record, not client metadata.
- The check runs before quota consumption, so an unverified account does not lose a free scene.
- Production API responses with status 401, 403, or 429 are recorded to `avirzo_security_events`; repeated identical events are coalesced for 60 seconds per server instance to reduce log-write abuse.
- IP addresses are HMAC-hashed before storage; request bodies, authorization headers and raw IP addresses are not stored.
- Security events are private to service role. Example operational queries are included in `supabase-abuse-monitoring.sql`.

## Deployment
1. Run `supabase-abuse-monitoring.sql` in Supabase SQL Editor.
2. Set `REQUIRE_VERIFIED_EMAIL=true` in Render.
3. Set a long random `ABUSE_HASH_SECRET` in Render.
4. Ensure Supabase email confirmation, SMTP delivery and allowed redirect URLs are configured.
5. Deploy to staging and test verified/unverified users, repeated 401/403/429 requests and database logging.

## Limitations
This is baseline monitoring, not a full fraud-detection system. It does not automatically suspend accounts, verify phone numbers, or guarantee one account per person. In-memory rate limits are per server instance; for multi-instance enforcement, add a shared Redis/edge rate limiter. Review events in Supabase and establish alerts/retention policies before broad launch.
