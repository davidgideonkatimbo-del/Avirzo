# Avirzo v2.17.3 — Two Free Scenes

- Free accounts receive exactly two accepted scene-generation requests per account lifetime.
- The durable generation quota is server-enforced; requests rejected before provider acceptance refund the quota through the existing provider failure path.
- Free video generation does not debit the production-credit wallet, so the two free scenes remain available even when monthly free credits are set to zero.
- Free recurring monthly production credits are disabled (`FREE_CREDITS_PER_MONTH=0`). Creator and Studio monthly allowances are unchanged.
- After the two free scenes, free users need an active paid plan or purchased credits to generate more. The two-scene allowance itself does not expire after one year.

Deployment note: Render environment variables override repository defaults. Confirm `FREE_GENERATIONS_PER_YEAR=2` and `FREE_CREDITS_PER_MONTH=0` in the live service before deploying. The two-scene allowance is enforced per authenticated account; it is not device-level identity verification and does not prevent a determined user from creating multiple accounts.
