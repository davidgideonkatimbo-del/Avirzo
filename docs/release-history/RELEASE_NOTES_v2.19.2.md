# Avirzo v2.19.2 — Payment and data-export fixes

## Fixed
- **Return from Pesapal.** An older handler removed the `billing` URL parameter before the Billing panel could read it, so the "waiting for confirmation" flow never ran. Pesapal returns now use their own values (`pesapal_success`, `pesapal_credits`, `pesapal_pending`, `pesapal_failed`), the app opens the Billing panel for them, and the panel shows the result and polls while a payment is pending.
- **Possible double credit.** The database only blocked duplicate grants for a few ledger reasons, not Pesapal packs, so a retry after a crash between "credits added" and "order completed" could add them twice. `supabase-pesapal.sql` now adds a unique index for `pesapal_pack:%` (re-run the file; it is safe to repeat).
- **Data export.** Jobs were requested with a column that does not exist (`kind`; the column is `type`), and query errors were silently ignored, producing an incomplete file. The export now uses the right column and fails loudly instead of returning partial data.

## Tests
New regression tests for each fix (153 tests, 151 pass, 2 need installed dependencies).
