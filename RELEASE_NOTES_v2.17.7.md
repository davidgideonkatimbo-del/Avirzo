# Avirzo v2.17.7 — Finance alert reliability and Runway reconciliation

## Changes
- Budget alerts now persist delivery status, attempt count, last attempt, retry deadline and last error in Supabase.
- The worker retries pending/failed or stale in-flight alerts with bounded exponential backoff. After eight failed attempts, the row enters `dead_letter` for operator review. Alert delivery is best-effort/at-least-once; destinations may receive a duplicate if delivery succeeds but the acknowledgement cannot be persisted.
- Added a Runway task-level USD CSV importer. It matches provider task IDs to Avirzo jobs, stores invoice lines idempotently, and emits estimated-versus-actual variance and unmatched-line status.
- Ambiguous or unmatched provider task IDs are not allocated to jobs by guesswork. Non-USD invoice lines must be converted using an explicitly chosen invoice/settlement basis before import.

## Database migration
Apply `supabase-finance-reconciliation.sql` after `supabase-provider-budget.sql` and `supabase-cross-instance-guardrails.sql` in the Supabase SQL Editor.

## Invoice reconciliation
Set `RUNWAY_INVOICE_ID` to a stable invoice/statement identifier and run:

```bash
RUNWAY_INVOICE_ID="runway-statement-2026-10" npm run reconcile:runway -- path/to/runway-usage.csv
```

The CSV must contain a provider task identifier column (`task_id`, `provider_task_id`, `runway_task_id`, `generation_id`, or `request_id`) and a USD cost column (`cost_usd`, `actual_cost_usd`, `amount_usd`, `cost`, `amount`, or `total_usd`). Optional columns include line item ID, date, currency and description. Review unmatched rows and the generated `*-avirzo-reconciliation.csv` before treating totals as reconciled.

## Staging acceptance checks
- Force a webhook 500/timeout, verify a failed status and a future retry time, then restore the webhook and confirm delivered status.
- Confirm the worker is running; stale `sending` rows become retryable after ten minutes.
- Re-import the same invoice and verify line counts do not increase.
- Compare matched actual totals to estimated totals; investigate every variance and unmatched line.
- Do not claim invoice accuracy until Runway's actual export/invoice format and values have been verified in staging.

## Limitations
The importer deliberately requires task-level IDs. If Runway's invoice only provides aggregated billing totals without task IDs, reconcile those totals at invoice/period level separately; do not invent per-job allocations. No live webhook, Supabase migration, or real Runway invoice has been tested from this environment.
