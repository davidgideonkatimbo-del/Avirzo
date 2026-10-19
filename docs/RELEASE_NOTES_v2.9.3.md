# Avirzo v2.9.3 — Account-Based Annual Generation Quota

- Free video generation allowance: 20 generations per authenticated Avirzo account per calendar year.
- The allowance is tied to the Supabase account/user ID, so changing device or browser does not reset it.
- Annual reset occurs on January 1 UTC.
- Creator and Studio generation allowances scale from the same annual base.
- Asset deletion ownership fields fixed.
- Production refuses to boot without Supabase configuration.
- Production export runs inline unless `AVIRZO_WORKER_ENABLED=true`; the paid worker remains optional.
- Supabase usage RPC retry timing updated for annual generation windows.
- Render fixes: numeric env values in `render.yaml` are now quoted strings; `AVIRZO_WORKER_ENABLED` is explicit (`"false"`) on the web service.
- Inline film exports are created as `running` so a deployed worker can never claim and re-render the same job.
- `.env.example` duplicate keys removed; `validate:render` now rejects unquoted numeric env values.
- Production boot error now names SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and SUPABASE_SERVICE_ROLE_KEY.
