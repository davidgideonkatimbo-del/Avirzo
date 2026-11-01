# Avirzo v2.19.3 — Whole-system audit fixes

## Fixed
- **Finance alerts repeated instead of finishing.** `avirzo_provider_budget_alerts.next_attempt_at` was NOT NULL, but the app sets it to NULL once an alert is delivered or dead-lettered. The database rejected that update, so a delivered alert was treated as failed and re-sent on every retry (up to 8 times). `supabase-finance-reconciliation.sql` now drops the NOT NULL. **Re-run that file in Supabase** (safe to repeat).
- **Silent failure creating projects.** Project creation tried to insert an `owner` row into `avirzo_project_members`, whose CHECK only allows editor / commenter / viewer. The error was swallowed, so the row never existed. Owners are identified by `avirzo_projects.user_id`, so the dead insert was removed.

## New safety net
`server/test/schema-consistency.test.js` (runs with `npm test`) fails when the code and database drift apart: tables or columns the server queries that no SQL file creates, `null` written to NOT NULL columns, values outside a CHECK list, relative imports that do not resolve or name something not exported (a startup crash), and client API calls with no matching server route.

## Audit results (no change needed)
Static analysis for undefined names, all 104 imports, 44/44 client calls matched to routes, all spend/data routes authenticate, no secrets or `.env` files in the package, JSON/CSS/HTML well-formed.

## Not covered
The 2 tests that need installed dependencies, the client build, the live server and the Pesapal sandbox could not be run in the authoring environment.
