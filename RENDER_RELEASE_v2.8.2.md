# Avirzo v2.8.2 — Render/GitHub Release

This package is prepared for uploading the **contents of the extracted folder** to the root of the Avirzo GitHub repository.

## Deployment corrections

- Docker now copies the verified server source from the build stage, avoiding the Render `server/src not found` source-context failure.
- The Docker build explicitly verifies `server/src/index.js`, `server/src/worker.js`, and `server/src/services/core.js`.
- The worker service receives the same public `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` build inputs as the web service.
- Provider and Supabase service-role secrets remain runtime environment variables; they are not placed in `VITE_*` values.
- Render validation is included in CI.
- All package/runtime version references are aligned to 2.8.2.

## GitHub upload structure

After extraction, the repository root should directly contain:

```text
.github/
client/
scripts/
server/
Dockerfile
render.yaml
package.json
supabase.sql
...
```

**Do not upload the outer ZIP folder itself as a nested directory.** Open the extracted package, select everything inside it, and upload those items to the GitHub repository root.

## Important

The release intentionally does not fabricate a `package-lock.json`. Generate/commit a real lockfile from a networked machine before switching production builds to strict `npm ci`.
