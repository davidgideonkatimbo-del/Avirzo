# Avirzo v2.17.3 — Two Free Scenes

- Free accounts receive two accepted video scene generations total per account, enforced by the server-side usage counter.
- Free video generations do not debit wallet credits; failed provider requests refund the quota through the existing refund path.
- Free recurring monthly wallet credits are disabled (`FREE_CREDITS_PER_MONTH=0`). Creator and Studio monthly credit allowances are unchanged.
- After the two free scenes, users need an active paid plan or purchased credits to generate more.
- The two free scene generations do not expire after one year; the server-side two-scene account quota is the limit for free video generation.

## Deployment checks

Before deploying, confirm Render uses `FREE_GENERATIONS_PER_YEAR=2` and `FREE_CREDITS_PER_MONTH=0`. Hosting environment variables override repository defaults. Verify actual generation, failure-refund, quota exhaustion, and paid credit purchase on staging before enabling real customer traffic. The account-level quota does not prevent determined users from creating multiple accounts.
