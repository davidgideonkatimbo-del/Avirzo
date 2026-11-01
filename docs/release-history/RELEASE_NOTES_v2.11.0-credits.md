> **Historical note.** This file describes an earlier release. The current release is v2.17.2; see `RELEASE_NOTES_v2.17.2.md` in the project root.

# Avirzo — Production credit wallet (creator-funded)

Production costs (Runway, voices, performance) are **paid by the film creator**, not by Avirzo owners.

## Model
- **Platform plans** (Free / Creator / Studio) = product access, collaboration, safety quotas.
- **Production credits** = wallet that funds generation (≈1 credit / second), voice, performance.
- Insufficient balance → **402 INSUFFICIENT_CREDITS** before any provider call (fail closed).
- Free users get a one-time **included_grant** (`FREE_INCLUDED_CREDITS`, default 25) so a first film path is possible without buying packs.

## Deploy steps
1. Run the new block at the end of `supabase.sql` in the Supabase SQL editor (credit tables + RPCs).
2. Optional env:
   - `CREDITS_ENABLED=true` (default on in production)
   - `FREE_INCLUDED_CREDITS=25`
   - `STRIPE_CREDIT_PACK_*_PRICE_ID` for one-time packs
3. Deploy web as usual. No worker change required.

## API
- `GET /api/billing/summary` → `credits: { balance, enabled, packs, note }`
- `POST /api/billing/credits/checkout` → `{ packId }` → Stripe one-time session
- Webhook `checkout.session.completed` + `mode=payment` → `add_avirzo_credits`

## Safety
- Ledger + balance use `SECURITY DEFINER` RPCs; only `service_role` can mutate.
- Users can **select** their own balance/ledger via RLS; cannot self-credit.
- Plan rate limits still apply as abuse caps on top of credits.
