# Avirzo v2.9.1 — Production Hardening

A focused hardening release for careful production and community-facing rollout. No new creator-facing feature surface was added.

## Quotas
- Free: 20 generation, 20 voice, 5 export, 10 performance requests per hour.
- Creator: 3× free hourly limits.
- Studio: 10× free hourly limits.
- Production usage is durable through Supabase.
- Production fails closed if durable usage protection is unavailable.

## Behavioral safeguards
- Exact quota boundaries are tested.
- Quota window reset is tested.
- Unknown plans safely use free limits.
- Generation continuity preflight is verified to run before quota consumption.
- Existing community-review export gating remains protected.

## Identity guardrail
Avirzo remains deliberately focused on African heritage filmmaking: cultural roots, research provenance, continuity, community review, language and cinematic storytelling. This release adds hardening rather than feature sprawl.

## Verification
- `node --test server/test/*.test.js` — 19/19 passing.
- `node scripts/validate-render.mjs` — static Render certification passes; package-lock warning remains.
- `node check.mjs` — structural checks pass.
- `node --check server/src/routes/export.js` — passes.
- Full Vite production build is still not claimed until dependencies/package-lock are available on a networked machine.
