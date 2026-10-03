# Avirzo v2.8.1 — Character Continuity Engine

## What changed

- Added a persistent Character Continuity Engine audit.
- Checks recurring characters for visual identity, clothing/adornment, language/dialect, relationships, possessions and explicit continuity rules.
- Flags possible period conflicts in assigned scene prompts for pre-1994/period projects.
- Added character continuity fields for possessions, emotional baseline, age/appearance progression and deliberate changes.
- Added a dedicated continuity audit panel to the studio.
- Preserves the v2.8.0 African World Bible and its cultural/research guardrails.

## Product principle

Continuity protects established creative choices. It is not a substitute for historical or cultural verification. Research, source provenance and appropriate community review remain authoritative.

## Verification

- Server syntax checks passed for `server/src/routes/ai.js` and `server/src/services/core.js`.
- Client build remains environment-dependent until workspace dependencies are installed; this release does not claim a successful production browser build from this offline environment.
