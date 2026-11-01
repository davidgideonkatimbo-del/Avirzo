# Avirzo v2.19.4 — Documentation and UI consistency

## Fixed
- **Free plan card contradicted the product.** It said "30-day trial · monthly production credits". The real rules are a 12-month free access period, 2 scene generations and no monthly credits (render.yaml, README and the checklist already said so). The card now reads "12-month free access · 2 scene generations · projects & templates stay after the free period".
- **Plan cards:** Creator and Studio now state the real credit allowances (600 / 1,800 per month). The Studio card no longer advertises "team seats", which do not exist.
- **Legal pages:** the "Effective" date is now October 30, 2026, matching `LEGAL_VERSION` (the version users accept).
- **DEPLOYMENT.md:** removed leftover AI citation markers, replaced the stale "v2.9.3" title, added the full ordered list of database migrations, a "Payments with Pesapal" section and a legal/safety section, and marked the Stripe sections as Stripe-mode only.
- **README, LAUNCH, checklists, upload instructions:** one consolidated "what's new since v2.17.13" section; stale Stripe-only and "Asset and voice reliability" text corrected; every document now points to re-running `supabase-finance-reconciliation.sql` (v2.19.3) and `supabase-pesapal.sql` (v2.19.2).

## New safety net
`server/test/docs-consistency.test.js` fails when the current version is missing from any doc, a migration is undocumented, the legal date differs from `LEGAL_VERSION`, plan cards disagree with prices or credit allowances, the free-tier wording drifts, citation debris returns, or `render.yaml` has a variable `.env.example` does not document.

## No code behaviour changed
Server logic is unchanged since v2.19.3 (this release changes UI text, legal-page dates, documentation and tests only).
