# Avirzo v2.17.4 — Loss-prevention safeguards

## Implemented

- Free scene quota uses a stable account-lifetime bucket; it does not reset annually or monthly. Free allowance is two scene-generation requests per account.
- Free users are limited to 5-second scenes; the default free generation model remains Gen-4 Turbo where supported.
- Free monthly wallet credits remain zero. Paid Creator and Studio monthly credit allowances are unchanged.
- A configurable global daily provider budget defaults to USD $25 per UTC day (`PROVIDER_DAILY_BUDGET_USD`). Before a Runway generation request is submitted, Avirzo reserves a conservative cost estimate in Supabase.
- Reservations are serialized in the database to prevent concurrent requests from exceeding the configured ceiling. Accepted requests remain charged against the daily ceiling; rejected pre-acceptance requests release their reservation.
- Production generation fails closed if the provider-budget RPC is unavailable, rather than sending a billable request without spending protection.
- Estimated provider cost and job metadata remain attached to generation records for reconciliation.

## Required deployment step

1. In the Supabase SQL Editor, run `supabase-provider-budget.sql` once.
2. In Render, set `PROVIDER_DAILY_BUDGET_USD=25` (or a lower ceiling suitable for your cash runway). Keep `FREE_GENERATIONS_PER_YEAR=2` and `FREE_CREDITS_PER_MONTH=0`.
3. Deploy and test on staging before live traffic: two free generations, third free request blocked, 10-second free request blocked, daily budget reached, provider rejection releases a reservation, and paid generation still requires sufficient credits.
4. Review provider invoices against the ledger. This is an estimated-cost ceiling, not a real-time invoice feed; update rates to match the active Runway contract.

## Limitations

- Account-lifetime quotas do not prevent someone from registering multiple accounts. Add verified-email enforcement and abuse monitoring before broad public promotion.
- The global budget currently guards video scene generation via the Runway route. Voice, music, performance and exports need separate provider-specific budgets before treating the whole platform as fully cost-capped.
- Production build and live Runway/Supabase integration tests must be run in the deployment environment.
- Asynchronous provider failures restore the free scene quota through a job-keyed database marker, so polling/worker retries cannot restore the same free scene twice.
