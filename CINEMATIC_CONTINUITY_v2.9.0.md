# Avirzo v2.9.0 — Cinematic Continuity

## What changed
- Added scene-level continuity anchors to the Scene Board.
- Scene 01 is explicitly treated as the visual foundation.
- Later scenes surface inherited project profile and era context.
- Later scenes show camera-language continuity and character-reference carry-forward status.
- Missing visual action or changed character reference is surfaced as a review item rather than silently treated as a continuity failure.
- Mobile styling keeps the continuity rail compact and wrap-safe.

## Design principle
Avirzo should help creators maintain a coherent film without forcing every scene to be identical. A change in camera, character, or visual language is therefore surfaced for deliberate review, not automatically overwritten.

## Validation
- `npm test`: 11/11 passing.
- `node scripts/validate-render.mjs`: passing.
- Production `npm ci` / Vite build remains gated on generating a real `package-lock.json` on a networked machine.
