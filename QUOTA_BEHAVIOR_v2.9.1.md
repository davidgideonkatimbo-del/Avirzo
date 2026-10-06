# Avirzo v2.9.1 — Quota & Behavioral Hardening

This release does not add a new product feature. It hardens the existing production controls before community-facing rollout.

## Quota policy
- Free: 20 generation, 20 voice, 5 export, 10 performance requests per hour.
- Creator: 3× the free hourly limits.
- Studio: 10× the free hourly limits.
- Production usage is durable through Supabase and fails closed if the durable counter is unavailable.
- Continuity/preflight blockers run before provider quota consumption.

## Behavioral coverage
- Exact quota boundaries are tested.
- Window reset behavior is tested.
- Unknown plans safely fall back to free limits.
- Generation preflight ordering is tested so blocked scenes do not consume generation quota.
- Production usage protection is tested for fail-closed behavior.

The goal is controlled rollout, not feature expansion. Avirzo remains centered on African heritage filmmaking, provenance, continuity, community review, and reliable production.
