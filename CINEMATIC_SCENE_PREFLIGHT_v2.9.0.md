# Avirzo v2.9.0 — Cinematic Scene Preflight

The First Scene experience now includes a lightweight render-readiness check before a creator spends generation usage.

## Checks
- Opening shot prompt present
- Scene title present
- Visual direction present (style, camera, duration, format)
- Cultural profile / era context present

The client disables Scene 01 generation until the required inputs are present. Existing server-side validation, continuity checks, usage controls and provider workflows remain authoritative.

## Release verification
- `npm test`: 11/11 passed
- `node scripts/validate-render.mjs`: passed
- `package-lock.json`: still intentionally pending on a networked machine
