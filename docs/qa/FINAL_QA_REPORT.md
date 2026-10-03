# Avirzo v2.8.2 Multi-Page Release Candidate QA

## Verified
- Multi-page AppShell and desktop sidebar are present.
- Mobile bottom navigation and More menu are present.
- Project workspace routing uses `project/<id>/<section>` routes.
- Project context is preserved while navigating between workspace sections.
- Direct project routes can reload the project when the authenticated user is available.
- All local frontend imports resolve to existing files.
- Render static certification checks pass.
- Version consistency remains 2.8.2.

## Not verified in this environment
- Full Vite production build (`npm run build`).
- npm dependency installation could not complete because the environment cannot reach/cache the npm registry dependencies.
- `package-lock.json` is still absent; generate it on a networked development machine before using strict `npm ci` in CI/Docker.

## Deployment rule
Do not replace the currently live Render Avirzo-1 deployment until a networked machine successfully runs `npm install` (or `npm ci` after generating the lockfile) and `npm run build` for this package.
