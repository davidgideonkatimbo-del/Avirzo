# Avirzo v2.8.4 — Builds Again, Security Ported, Accessibility Pass

Base: the v2.8.2 "premium cinematic" multi-page build.

## Build blockers fixed
- `CharacterContinuity.jsx` and `StoryIntelligencePanel.jsx` had unbalanced JSX (an extra `</div>` in each, and the second file was missing its closing `</section>;` and `}`), so `npm run build` could not succeed. Both now parse. All 31 client source files pass a TypeScript JSX syntax check and a scope check (no undefined names).

## Security & billing (ported from the v2.8.3 review fixes)
- Project ownership is immutable (trigger): editors can no longer take over a project.
- Role lookups are caller-bound (`avirzo_my_project_role`); the two-argument function is service-role only.
- Invitations: plain unique index on `(project_id, email)` (the expression index broke upserts), confirmed email required to claim, token no longer returned.
- Billing webhook rewritten: checkout no longer overwrites the plan with `free`; plan comes from `customer.subscription.*`; subscriptions carry `metadata.user_id`; duplicate and out-of-order events ignored; rotated signatures accepted; unmatched events return 500 so Stripe retries; plan-scaled quotas (`PLAN_LIMIT_MULTIPLIER`, **please confirm 1x / 3x / 10x**); usage meters now read real counters.
- Server-side scene-continuity guard inside `/api/generate` (shared `services/continuity.js`), enforced before quota is consumed; word-bounded anachronism detection.
- `/api/ai/*` requires sign-in in production; JSON body limit is 1 MB except routes that need large payloads; `/api/health` is a cheap public probe (no DB, no project ref) with full detail for signed-in users.
- Security headers, JSON error handler, graceful SIGTERM shutdown, version history capped at 50.

## Accessibility
- Skip-to-content link and focusable `<main id="main-content">`.
- `aria-current="page"` on all navigation (sidebar, account, More sheet, mobile bar); decorative icons hidden from screen readers.
- More sheet is a modal dialog (`aria-modal`), closes with Escape; More button exposes `aria-expanded`.
- 61 form controls that relied on placeholders or had no name now have accessible labels (51 from placeholders, 10 written by hand with scene/track/character context).
- Scene move buttons (↑ ↓) have descriptive labels; video/audio elements and asset previews have labels/alt text.
- Global status messages are announced (`role="status"`, `aria-live="polite"`).
- Touch targets are at least 44px on touch devices.
- ARIA attributes in the client: 18 -> 100.

## Housekeeping
- 23 old notes/QA files moved to `docs/releases` and `docs/qa`. Version strings and the render validator updated to 2.8.4.

## Validation performed (static only)
- Server: syntax checks pass on all files; v2.8.3 logic was unit/simulation-tested earlier (continuity guard, Stripe webhook with in-memory Supabase).
- Client: TypeScript JSX parse of all 31 files, scope analysis, import resolution, `validate-render.mjs` and `check.mjs`.
- NOT done: `npm install` / `npm run build` (no network here), the SQL was not executed on Postgres, no browser or screen-reader testing, no live Stripe/Supabase/Runway test.

## Before you deploy
1. On a networked machine: `npm install`, `npm run build`, commit `package-lock.json`.
2. Run `supabase.sql` in Supabase (idempotent) BEFORE deploying this code.
3. Deploy to a staging Render service first; run `scripts/verify-production.mjs`; then switch.
4. Test with a screen reader (VoiceOver/TalkBack) and on a real phone.

## Still open
Stripe customer portal / cancel UI; community-review step and "AI-generated" disclosure on exports; base64 audio inside project JSON; no automated tests; voice-language coverage (only some profiles can produce voice).
