> **Historical note.** This file describes an earlier release. The current release is v2.17.2; see `RELEASE_NOTES_v2.17.2.md` in the project root.

# Avirzo v2.11.1 — Hardening release

## Product changes (Phases A–C + credits)
- Broader African profiles & heritage templates (Ghana, Ethiopia, Senegal, Egypt, diaspora)
- First-film CTA, expanded example gallery, sequence + continuity tips
- Community/classroom packs + template-pack import
- Social export presets, share/watch polish
- **Subscription-included monthly production credits** (cost cap for Avirzo)
  - Free 25 / Creator 300 / Studio 1000 per calendar month (env-overridable)
  - Debit before generation/voice/performance; refund if provider start fails
  - Optional Stripe top-up packs only if price IDs are set

## Deploy
1. Run **full** `supabase.sql` in Supabase (includes credit tables + RPCs + monthly_grant idempotency).
2. Env (optional): `FREE_CREDITS_PER_MONTH`, `CREATOR_CREDITS_PER_MONTH`, `STUDIO_CREDITS_PER_MONTH`, `CREDITS_ENABLED`.
3. `npm ci` && `npm run build` on a networked machine; commit lockfiles if required by procedure.
4. Deploy **web** first. Worker stays optional (`render.worker.yaml`).
5. Android first-film smoke test before the next major feature (procedure guardrail).

## Verify
- `cd server && node --test test/behavior.test.js` → 23 passing
- Billing shows balance + monthly included
- Generate with empty credits → 402 upgrade message
- Home → Make my first film applies template

## Cost protection
Monthly credit grants + existing generation rate limits bound provider spend to plan allowances.
