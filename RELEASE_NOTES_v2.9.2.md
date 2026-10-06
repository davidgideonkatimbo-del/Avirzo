# Avirzo v2.9.2 — Production Hardening: Core Safety & Quota

## Fixed
- Asset deletion now selects and checks `storage_path`, `project_id`, and `user_id`.
- Production export runs inline on the web service when `AVIRZO_WORKER_ENABLED=false`, avoiding permanently queued exports when the optional worker is not deployed.
- Production boot now refuses to start without Supabase URL, publishable key, and service-role key; local JSON project storage is development-only.
- Free video generation is now a 20-generation monthly credit budget instead of an hourly allowance. Creator and Studio multipliers remain applied.
- Durable usage RPC retry timing now matches the generation monthly window.

## Validation
- 24/24 automated tests pass.
- Render static certification passes.
- No production build is claimed until a real `package-lock.json` is generated on a networked machine.
