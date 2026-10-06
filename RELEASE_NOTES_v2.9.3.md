# Avirzo v2.9.3 — Account-Based Annual Generation Quota

- Free video generation allowance: 20 generations per authenticated Avirzo account per calendar year.
- The allowance is tied to the Supabase account/user ID, so changing device or browser does not reset it.
- Annual reset occurs on January 1 UTC.
- Creator and Studio generation allowances scale from the same annual base.
- Asset deletion ownership fields fixed.
- Production refuses to boot without Supabase configuration.
- Production export runs inline unless `AVIRZO_WORKER_ENABLED=true`; the paid worker remains optional.
- Supabase usage RPC retry timing updated for annual generation windows.
