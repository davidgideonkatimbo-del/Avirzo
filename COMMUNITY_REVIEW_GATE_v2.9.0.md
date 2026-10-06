# Avirzo v2.9.0 — Community Review Gate

Avirzo's community-review workflow is now a real production checkpoint when a creator explicitly enables review.

## Behavior

- Review remains optional for solo creators.
- When `review.enabled` is false, the normal export workflow is unchanged.
- When `review.enabled` is true, final export requires every exported scene to be `approved` or `locked`.
- `review` is for production clearance and discussion; it does not establish cultural or historical truth by itself.
- Research evidence, provenance, and community/source review remain the authority for culturally sensitive claims.
- The server re-checks approval state from the stored project before creating the final export job.

## Scene states

`draft` → `review` → `approved` → `locked`

A creator can move a scene back to `review` if a new question appears before export.
