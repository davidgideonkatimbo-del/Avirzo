# Avirzo v2.12.3 — Workflow polish

## Changes
- When a signed-in user starts batch shot generation without a saved project, create the cloud project first so generated shots have a stable project ID for checkpointing.
- Save each completed shot's timeline and scene state to the cloud project before moving to the next shot.
- Keep a scene marked `blocked` when continuity checks stop generation, rather than overwriting the more useful status with `failed`.
- Align root, client, server, app, and service-worker cache versions at `2.12.3`.

## Validation
Run `npm test`, `npm run build`, `npm run validate:render`, and `npm run verify:production` in the target Node/npm environment. A successful local test suite does not replace live Supabase, Render, or video-provider verification.
