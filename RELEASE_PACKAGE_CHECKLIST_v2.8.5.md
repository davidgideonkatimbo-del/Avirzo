# Avirzo v2.8.5 Release Package Checklist

This package is intended to be pushed to `main` before production deployment.

## CI release gate

GitHub Actions will:

1. Generate `package-lock.json` if it is missing.
2. Install with `npm ci`.
3. Run `npm test`.
4. Run the production client build.
5. Run Render static certification.
6. Check server syntax.
7. Build the production Docker image.
8. Only after all checks pass, commit the generated lockfile.

The lockfile commit is deliberately last so a Render auto-deploy cannot be triggered by an unverified dependency graph.

## Deployment procedure

**Build → automated tests → production build → verified lockfile → web deployment → Android test → worker only when explicitly approved.**

The Render worker remains optional and is not enabled by this package.
