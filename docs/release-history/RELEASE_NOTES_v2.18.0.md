# Avirzo v2.18.0 — Launch safety: legal, consent, data rights, content policy

## Changes
- **Terms of Service and Privacy Policy** pages (`/terms.html`, `/privacy.html`), linked from the sidebar, sign-up and the consent dialog. Contact email and governing law (Uganda) can be edited in `client/public/*.html`.
- **Consent gate.** Signed-in users must accept the Terms/Privacy and a likeness rule before AI generation. Stored in `avirzo_consents`; enforced server-side (`CONSENT_REQUIRED`) in production. Bump `LEGAL_VERSION` in `server/src/routes/account.js` to ask everyone again after a legal change.
- **Account data rights.** `GET /api/account/export` downloads the user's data; `DELETE /api/account` (confirm with `DELETE`) cancels a Stripe subscription, deletes the user's media files, then deletes the account (database rows cascade).
- **Content policy.** Prompt screening on `/api/generate`, `/api/voice`, `/api/music`, `/api/performance` and `/api/ai` blocks sexual content involving minors, explicit sexual content, deepfake/face-or-voice-swap requests and weapon instructions (`422 CONTENT_POLICY`). Blocks are logged as `content_policy_blocked` security events. This is a first layer; Runway and ElevenLabs apply their own moderation.
- **Reporting.** `POST /api/report` stores reports in `avirzo_content_reports` and alerts the operator webhook.
- **Operator alerts.** 5xx errors, unhandled rejections, failed account deletions and new reports post to `AVIRZO_OPS_ALERT_WEBHOOK_URL` (falls back to `AVIRZO_FINANCE_ALERT_WEBHOOK_URL`).
- Profile page gains **Data & safety** (download data, report content, delete account).

## Required migration
Run `supabase-legal-safety.sql` in Supabase before deploying.

## Not changed
Payment provider (still Stripe), the paid worker plan, and the CSP report-only setting. See `LAUNCH.md`.

## Also fixed
- Service worker: opening `/terms.html` or `/privacy.html` no longer overwrites the offline copy of the app.
