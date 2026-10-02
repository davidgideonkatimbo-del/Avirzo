# Avirzo v2.1.8 — Shared-database safe schema

## Why
The old `supabase.sql` used generic names (`projects`, `assets`, `jobs`, `set_updated_at`, `jobs_type_check`). In a Supabase project that already hosts another app, `create table if not exists` would silently skip over the other app's tables, `create or replace function set_updated_at` would overwrite its function, and the constraint-drop step could remove its constraints.

## Changes
- All Avirzo tables, indexes, triggers, constraints, policies and helper functions are now prefixed `avirzo_`; the server code uses the new names.
- Constraint changes are scoped to `avirzo_jobs` only.
- Clients can no longer insert/update/delete `avirzo_jobs` (revoked); worker RPCs stay service-role only.
- `supabase-migrate-from-unprefixed.sql`: optional guarded rename for anyone who already ran the old script.

## Validation
Server syntax checks pass and no `.from('<old name>')` references remain. The SQL was written to be idempotent but was NOT executed against Postgres here — run it in Supabase and check for errors before deploying. Deploy order: SQL first, then the new code (old code will not find the new table names).
