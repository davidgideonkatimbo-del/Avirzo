# Avirzo v2.11.0 — Phase C (additive gaps)

Closes remaining high-value product gaps from the gap analysis. Still **no** changes to jobs, worker, Supabase schema, billing limits, or the protected production procedure.

## What was added

### 1. Clearer free-tier messaging
- Billing panel: “What free always keeps” callout (projects, research, templates, export of existing work after trial).
- Plan copy updated for Free (30-day trial · 5 clips · work retained).
- Home hero: short line on free month + offline templates after first visit.
- **Limits unchanged** (5 clips / 30 days) — messaging only.

### 2. Public / share polish
- Collaboration invite: **Copy link** + native **Share…** when `navigator.share` exists.
- Export result: **Watch · Share** card with film title, heritage credit, format summary, Share / Download / **Copy link**.

### 3. Offline templates
- Service worker cache bumped to `avirzo-static-v2.11.0-phase-c`.
- Documented that heritage templates live in the client bundle and remain available offline after first online load (no new storage layer).

## Files touched
- `client/src/components/BillingPanel.jsx`
- `client/src/components/CollaborationPanel.jsx`
- `client/src/components/TimelinePanel.jsx`
- `client/src/main.jsx`
- `client/src/styles.css`
- `client/public/sw.js`
- `RELEASE_NOTES_v2.11.0-phase-c.md`

## What was not changed
- Server billing logic, quotas, trial calculation
- Job system, worker, Render blueprints
- Core workflow and heritage-first identity

## Deploy
Same web deploy path. Users get a new SW cache version on next visit.
