# Avirzo v2.9.3 — Procedure Guardrails

This release keeps the established Avirzo product and deployment procedure intact.

## Product guardrails
- Avirzo remains focused on African roots, cultures, languages, history, heritage and cinematic storytelling.
- The project/studio workflow remains the core experience.
- The first-film flow remains simple: create film → story → storyboard → first scene.
- Premium additions must not turn the interface back into a congested admin dashboard.

## Deployment guardrails
- Web service first.
- Worker remains optional and must not be deployed without explicit approval of its paid Render plan.
- Do not replace the live web service until a real `package-lock.json` exists and `npm ci` + `npm run build` pass.
- Test the updated build on Android before another major feature.

## v2.9.3 additions
- Stripe customer portal for subscription management.
- Protection against duplicate active subscriptions.
- Server-side AI-generation provenance metadata on exports.
- Cleaner Stripe return handling and billing rate limiting.

These additions are additive; they do not replace the existing production job, Supabase, FFmpeg, or project architecture.
