# Avirzo v2.10.3 — Generation URL recovery & export

## Bugs fixed
- **Lost video after success**: `findByProviderTask` omitted `payload`, so the stored provider video URL was dropped on later polls. Jobs now load full rows (including payload) for generation polling.
- **Film export blocked without archive**: exporter required `assetId` in production even when a usable `videoUrl` existed. Export now accepts either an archived asset or a valid video URL.
- **Missing task id**: client now fails fast with a clear message if Runway did not return a task id (usually missing `RUNWAYML_API_SECRET`).
- **Succeeded without URL race**: client retries briefly, then surfaces a clear error instead of hanging.

## Still required for live generation
- `RUNWAYML_API_SECRET` on Render
- Runway credits
- Signed-in user in production
