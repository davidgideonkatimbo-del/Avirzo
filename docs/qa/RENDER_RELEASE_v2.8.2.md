# Avirzo v2.8.2 — Render-ready release

This release is prepared for deployment from the repository root.

## Deployment corrections
- Keeps the complete `server/src` tree inside the Docker build context and validates the required server entry points before the client build.
- Runtime server files are copied from the verified build stage rather than relying on a second source-context copy.
- Synchronizes root, client, server and runtime application versions to `2.8.2`.
- Updates the Render validation script from the stale 2.6.0 checks to 2.8.2.
- Ensures the background worker receives the same public `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` build inputs through Render service references.
- Keeps Runway, ElevenLabs, Supabase service-role and other provider credentials runtime-only.
- Adds Render static validation to CI.

## Important
This archive intentionally does **not** contain a fabricated `package-lock.json`. Generate a real lockfile on a networked development machine and commit it when ready; the Dockerfile/CI will automatically switch to `npm ci` when the lockfile exists.

## Render source requirement
Push the **contents of this archive** to the repository root. Do not put the archive itself inside the repository, and do not omit `server/src`.

## Final studio polish pass

This release also includes a product-wide UI/UX and reliability polish pass:

- stabilized the authenticated API client so child panels do not restart polling effects on every React render;
- improved mobile studio navigation with touch-safe targets, horizontal tab scrolling, safe-area support, and reduced accidental horizontal overflow;
- added visible keyboard focus states and reduced-motion support;
- added a recovery screen for unexpected React rendering errors instead of leaving a blank studio;
- corrected the footer version to v2.8.2;
- corrected World Bible completeness to count all 11 continuity rule fields;
- reset the full editor state when starting a new project so old film settings cannot leak into a new project;
- prevented cloud project saves from being attempted while signed out;
- hardened character validation error handling;
- fixed scene-generation failure handling when reference media cannot be resolved;
- made timeline placement respect the selected scene duration and use archived media URLs when available;
- retained the African heritage, research, community-review and continuity-first product direction.

The release remains subject to the same verification note: generate a real `package-lock.json` on a networked development machine before switching production CI/Docker to strict `npm ci`.
