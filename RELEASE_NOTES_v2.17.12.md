# Avirzo v2.17.12 — Production settings alignment

## Changed
- Aligned web and worker free-plan settings: `FREE_GENERATIONS_PER_YEAR=2`, `FREE_CREDITS_PER_MONTH=0`, `FREE_GENERATION_MODEL=gen4_turbo`, free generation enabled, and verified email required.
- Added the same `PROVIDER_DAILY_BUDGET_USD=25` policy to the worker so provider spend is not governed by conflicting service defaults.
- Kept the existing 365-day free-access policy (`FREE_TRIAL_DAYS=365`, `FREE_TRIAL_POLICY_START=2026-10-09`) explicit on both services. This remains a business-policy choice; setting `FREE_TRIAL_DAYS=0` disables the time limit if the product owner later decides free scene access should not expire.
- Changed `AVIRZO_ALLOW_INLINE_EXPORTS_IN_PRODUCTION` to `false` in the Render web blueprint. Production exports now fail safely until the worker is deployed and `AVIRZO_WORKER_ENABLED=true` is configured.
- Added `ABUSE_HASH_SECRET` to the worker configuration. **Set the exact same strong random secret value on both web and worker services** so shared abuse telemetry hashes remain consistent.
- Removed duplicate assignments from `.env.example`; left CSP in report-only mode until live browser checks support enforcement.

## Deployment checklist
1. Review the actual Render web-service environment values; they override Blueprint defaults. Set `FREE_GENERATIONS_PER_YEAR=2`, `FREE_CREDITS_PER_MONTH=0`, `FREE_TRIAL_DAYS=365`, `FREE_TRIAL_POLICY_START=2026-10-09`, and `PROVIDER_DAILY_BUDGET_USD=25`.
2. If using queued production exports, deploy the optional paid `render.worker.yaml` service, configure all secrets, and use the same `ABUSE_HASH_SECRET` value on both services. Confirm worker health before setting `AVIRZO_WORKER_ENABLED=true` on the web service.
3. Keep `AVIRZO_ALLOW_INLINE_EXPORTS_IN_PRODUCTION=false`. If you have not deployed the worker, exports will return a controlled service-unavailable response rather than consuming resources in the web process.
4. Confirm Supabase provider-budget and abuse-monitoring migrations are applied, then test quota exhaustion, email verification, daily budget rejection and a queued export in staging.
5. Run `npm ci`, `npm test`, `npm run build`, and `npm run validate:render` in a network-enabled environment before production rollout.

## Validation limits
These changes align repository settings and static checks. They do not change live Render variables or verify live Supabase, Runway, or worker behavior.
