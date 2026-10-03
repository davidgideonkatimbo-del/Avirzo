# Avirzo v2.4.0 — Premium Production Suite

- Added project version snapshots and restore.
- Added scene approval workflow: draft → review → approved → locked.
- Added project/scene review comments.
- Added Heritage Production Passport endpoint and UI.
- Added provider cost estimation endpoint.
- Added Stripe subscription webhook reconciliation with signed-event verification.
- Added production control panel.
- Added optional Google, Azure and Amazon Polly configuration documentation.
- Preserved existing collaboration, billing, caption, research, timeline, project and voice workflows.

Before deployment: apply `supabase.sql`, configure production secrets, then run `npm install && npm run build` and `npm run verify:production`.
