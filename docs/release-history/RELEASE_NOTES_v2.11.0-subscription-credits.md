> **Historical note.** This file describes an earlier release. The current release is v2.17.2; see `RELEASE_NOTES_v2.17.2.md` in the project root.

# Subscription-included monthly production credits

Primary model: **the plan pays for production up to a monthly cap**.  
That protects Avirzo from unbounded provider costs without asking creators to fund every clip separately.

## Allowances (defaults, env-overridable)
| Plan | Credits / month | Approx. 5s clips |
|------|-----------------|------------------|
| Free (during trial) | 25 | ~5 |
| Creator | 300 | ~60 |
| Studio | 1000 | ~200 |

Env: `FREE_CREDITS_PER_MONTH`, `CREATOR_CREDITS_PER_MONTH`, `STUDIO_CREDITS_PER_MONTH`.

## Behaviour
- On first use each calendar month, grant is applied once (`monthly_grant:<plan>:YYYY-MM`).
- Generation / voice / performance debit the wallet (fail closed).
- When empty → upgrade plan (or wait until next month). Optional top-up packs only if Stripe pack prices are configured.
- Existing generation count limits remain as a second safety rail.

## Deploy
Re-run the credit section of `supabase.sql` (includes `monthly_grant:%` idempotency). Deploy web as usual.
