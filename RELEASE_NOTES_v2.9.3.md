# Avirzo v2.9.3 — Free Generation Quota Policy

## Change
- Free plan video generation is capped at **20 generations per UTC calendar year**.
- The durable Supabase usage window starts January 1 and resets January 1 of the following year.
- When the annual allowance is exhausted, the retry period points to the next UTC calendar year.
- Voice, export, and performance quotas remain hourly.

## Safety
The durable Supabase usage counter remains the source of truth in production and continues to fail closed when the usage-protection RPC is unavailable.
