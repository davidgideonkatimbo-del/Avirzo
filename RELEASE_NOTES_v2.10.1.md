# Avirzo v2.10.1 — Bugfix pass

## Client
- **Safer API responses**: `readApiJson` handles HTML/empty bodies (e.g. Render cold start) with a clear wake-up message instead of a cryptic JSON parse error.
- **Load project clears stale media**: loading a film resets video/export URLs, generating/exporting flags, and active job IDs so the previous project’s media cannot leak.
- **Delete active project**: deleting the open film fully resets the workspace.
- **Generation**: auto-assigns primary character when missing; functional state updates when a scene finishes; `generateAll` saves the project when signed in; double-start guards while a render is in progress.
- **Continuity soft-fail**: if the continuity service is down, generation is not hard-blocked (warnings only).
- **Template apply** clears export/generation residual state.
- **Export** uses the safer JSON path and always clears the exporting flag on success/failure for inline exports.

## Server
- **Continuity**: falls back to the first character instead of blocking when no primary is set (warning only).
- **Project create**: upserts an owner row in `avirzo_project_members` so collab-aware listing stays consistent.

## Tests
- Regression test for the above bugfixes.
