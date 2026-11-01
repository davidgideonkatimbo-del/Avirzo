# Avirzo v2.17.8 — Finance reliability fixes

## Debug fixes
- Alert deliveries now require an atomic Supabase claim for each attempt, preventing the web service and optional worker from concurrently sending the same alert.
- Alert retry discovery no longer pre-claims rows and then races with the delivery function. Stale `sending` rows can be recovered after their lease expires.
- Invoice import hashes provider line IDs when available; otherwise it uses a stable row occurrence so identical legitimate charge rows are not collapsed by the database uniqueness key.
- Invoice reconciliation sums all eligible reserved/charged budget ledger entries per job rather than silently overwriting estimates when multiple rows exist. Released reservations are excluded.
- Invoice importer fetches jobs and ledger entries in pages, avoiding Supabase's default result limit on larger accounts.

## Apply before staging
1. Apply `supabase-finance-reconciliation.sql` again in Supabase. The migration is additive and updates the alert RPC definitions.
2. Deploy the v2.17.8 package.
3. Confirm the web service has `AVIRZO_FINANCE_ALERT_WEBHOOK_URL`; configure the same value on the optional worker if enabled.
4. Test threshold alert delivery and recovery from a webhook failure, then reconcile a real Runway usage export.

## Verification limits
Automated tests and static checks should be run on this package before staging. A live Supabase migration, real webhook delivery, actual Runway invoice reconciliation, and production Vite build cannot be verified from this local package alone.
