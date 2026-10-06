# Avirzo v2.9.0 — Premium Creator Foundation

## What changed

- Simplified the global desktop navigation around **Studio / Projects / Assets / Exports & Jobs**.
- Kept Story, Scenes, Timeline, Voices and Heritage available through the More/mobile surface and project workspace rather than competing with the global navigation.
- Added a new **From memory to cinema** creator journey on Home that explains the four-step Avirzo filmmaking method.
- Added direct first-run actions for starting a film and opening heritage paths.
- Bumped application version metadata to 2.9.0.
- Cleaned duplicate optional provider and Stripe keys from `.env.example`.

## Release gate still required

This package intentionally does **not** fabricate a `package-lock.json`. The final production gate remains:

1. Generate the real lockfile on a networked machine.
2. Run `npm ci`.
3. Run `npm run build`.
4. Run `npm test`.
5. Build the production Docker image.
6. Run production verification against a real configured environment.
7. Only then replace the live Render web deployment.

The Render web service remains configured as `free` in this package. Moving it to a paid instance is an infrastructure/cost decision and should be made separately from the code release.

## Premium Creator Foundation — follow-up hardening

### Performance
- Heavy filmmaking panels now use React lazy loading so Home, Projects and other lightweight surfaces do not eagerly load the full studio toolset.
- Added an accessible loading state while a project-scoped panel is being loaded.

### Creator economics
- Billing & Usage is now exposed directly from the More/Account area.
- Existing server-side hourly usage limits remain the source of truth; no fictional credit balance was introduced.

### Release discipline
- The real `package-lock.json` remains intentionally ungenerated until a networked machine can complete dependency resolution. Do not fabricate or manually synthesize it.

## Premium generation transparency pass

- Scene generation now surfaces the current hourly generation allowance and remaining usage before rendering.
- Full-film generation is disabled when the current allowance cannot cover the storyboard, preventing a misleading long-running request.
- Individual scene generation communicates that each generated scene consumes one generation usage unit.
- Usage is read from the existing server-side billing/usage summary; no client-side quota is treated as authoritative.
- Existing generation, continuity, provider, and job workflows are preserved.

### Verification

- `node --test server/test/*.test.js` — PASS (11/11)
- `npm run validate:render` — PASS
- `npm run build` — BLOCKED in packaging environment because `package-lock.json` is intentionally absent and Vite dependencies are not installed. Generate the real lockfile on a networked machine, then run `npm ci && npm run build && npm test` before production deployment.


## Generation reliability pass
- Job Center now explains queued/running/failed/canceled/dead-letter states in creator-friendly language.
- Added an explicit Refresh action for job status when a creator wants an immediate update instead of waiting for polling.
- Provider/error messages are separated visually from normal job guidance.
- Long-running jobs continue to use the durable worker path; no automatic regeneration was added, avoiding accidental duplicate paid generations.

## Cinematic creation flow
- Added a focused **First Scene** step after storyboard creation.
- Creators can refine Scene 01 title and opening-shot prompt before spending generation usage.
- Added a direct Scene 01 generation action and scene-board handoff.
- Added a compact visual progress cue to reinforce Story → First Scene → Scene Board → Film.
- Preserved existing continuity checks and generation safeguards.
- Mobile layout keeps the first-scene action touch-friendly.

Validation: `npm test` 11/11 passing; Render static certification passing. The real `package-lock.json` remains a networked-machine production gate.

## Character + World Continuity
- Added a protected `/api/ai/character-world-continuity` audit.
- Connected Character Bible + World Bible + roots context to scene-level continuity review.
- Flags unexplained recurring-character and scene transition drift while allowing deliberate changes to be recorded.
- Preserves the rule that research and community review, not AI analysis, establish cultural/historical authority.

## Research → Story → Production Bridge
- Added traceability between research material and scene planning.
- Surfaces evidence/verification status, source steward, roots anchors and relevant scenes.
- Keeps uncertainty visibly separate from documented and oral material.

### Community Review Production Gate
- Added an explicit production checkpoint for community review.
- Final export is server-blocked when review is enabled and any exported scene is not approved or locked.
- Production Review now shows approval readiness and scene-level approval controls.
- Solo creators can keep review disabled and retain the normal export workflow.
- Added `COMMUNITY_REVIEW_GATE_v2.9.0.md` documenting the behavior.
