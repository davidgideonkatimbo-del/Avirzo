# Avirzo v2.19.0 — Pesapal payments (cards + mobile money)

## Changes
- **Pesapal checkout** for plans and credit packs. Used automatically when `PESAPAL_CONSUMER_KEY`/`SECRET` are set (`BILLING_PROVIDER=stripe` forces Stripe). Stripe code is unchanged.
- **Prepaid plans.** One payment = 30 days (`PESAPAL_PLAN_DAYS`). Nothing renews by itself: paying the same plan again adds 30 days, switching plans starts a new period. A plan stops exactly at `current_period_end` (`effectivePlanFromAccount`).
- **Verified settlement.** Browser return, IPN and the in-app poll all end in one function that asks Pesapal for the real status, checks reference, amount and currency against the stored order, claims the order, and grants exactly once. Failed, pending, reversed and mismatched payments grant nothing; reversals remove plan access and alert the operator.
- **Price safety.** A plan or pack is only offered if it covers provider cost (`MIN_PLAN_MARGIN`, per-credit floor); `PESAPAL_UNITS_PER_USD` is required for non-USD currencies.
- Billing screen shows prices in your currency, "Pay for 30 days / Renew", the paid-until date, and waits for mobile-money approval after returning from Pesapal.
- Terms and Privacy updated for Pesapal and prepaid plans (`LEGAL_VERSION` bumped, so users re-accept). Data export includes payment records.

## Required migration
Run `supabase-pesapal.sql` in Supabase before deploying.

## Notes
- Plans grant credits per calendar month (unchanged), so a plan bought at the end of a month can receive the next month's credits a few days later.
- Local testing: Pesapal's IPN cannot reach `localhost`. The browser return still settles the payment, so a local sandbox test works; for IPN use your Render URL or a tunnel.
