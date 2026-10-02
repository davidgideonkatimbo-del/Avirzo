# Avirzo v2.3.0 — Premium Studio workspace layer

## Delivered
- Studio panels are explicitly componentized through `StudioPanels.jsx`, keeping Bible, Research, Timeline and Projects isolated from the application shell.
- Collaboration panel with project invitations and owner/editor/commenter/viewer roles.
- Shared project loading and editing for editors, with owner-only destructive project deletion.
- Billing + usage dashboard backed by durable usage counters and a billing-account table.
- Optional Stripe Checkout integration using `STRIPE_SECRET_KEY`, `STRIPE_CREATOR_PRICE_ID` and `STRIPE_STUDIO_PRICE_ID`.
- Caption mode remains first-class in Timeline: Burned-in, Soft track and No captions, with SRT export.
- Multi-provider voice adapters for ElevenLabs, Google Cloud TTS, Azure Speech and Amazon Polly.
- Per-character provider, voice ID and optional provider language code are persisted in the project payload.
- Shared project media and job visibility follows project roles.
- Fixed the v2.2.2 `async async function exportFilm()` build-breaking declaration.

## Deployment
1. Run the updated `supabase.sql` against the Avirzo Supabase project.
2. Add provider secrets only for services you intend to use.
3. For billing, add Stripe secret + Creator/Studio price IDs. Billing stays informational until those values are configured.
4. Redeploy both web and worker services.
5. Run the production verification script against a real authenticated account.

## Important
Provider language availability varies. Avirzo now supports multiple provider adapters, but a language should only be advertised as production-verified after testing the exact provider voice and locale used by the project.
