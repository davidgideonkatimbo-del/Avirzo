# Avirzo v2.10.2 — Generation reliability

Fixes shot/film generation failures when clicking **Generate shot** or exporting a film.

## Root causes fixed
- Runway task status `CANCELLED` (British spelling) was not treated as terminal → client polled until timeout.
- After Runway succeeded, a failed archive to Supabase kept the job as `running` forever so the UI never received a video URL.
- Weak provider error messages made failures look like generic timeouts.
- Client poll window was short; empty scene prompts failed without a clear message.

## Server
- `normalizeRunwayStatus` maps PENDING/RUNNING/SUCCEEDED/FAILED/CANCELLED/THROTTLED correctly.
- Ratio mapped to Runway pixel ratios (`1280:720` / `720:1280`); duration clamped to 2–10 seconds.
- On provider success: always return `videoUrl`; archive to private storage when possible, but **do not block** the shot if archive fails.
- Clearer Runway rejection messages passed through to the client.
- Media download timeout for archive increased to 120s.
- Film export accepts scenes with either `assetId` or `videoUrl`.

## Client
- Poll up to ~7.5 minutes with progressive backoff; surfaces provider status messages.
- Accepts `canceled` and `cancelled`.
- Scene prompt falls back to title/story; requires non-empty prompt before calling the API.
- Uses provider URL even when private archive is missing.

## Required for live generation
- `RUNWAYML_API_SECRET` must be set on the Render service.
- In production, sign in before generating (provider endpoints require auth).
- Runway account must have credits.
