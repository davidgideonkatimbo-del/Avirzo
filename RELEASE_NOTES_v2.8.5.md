# Avirzo v2.8.5 — Billing Portal & Export Provenance

## Added
- **Manage subscription.** New `POST /api/billing/portal` opens the Stripe customer portal (change plan, update card, invoices, cancel). The Billing panel shows a "Manage subscription" button for accounts that have a Stripe customer. The summary route reports `billing.can_manage`.
- **AI-generated label on every export.** Exported MP4s carry metadata (`comment`, `description`) stating the film contains AI-generated video and synthetic voice and that cultural/historical content should be reviewed with community knowledge-holders. It is applied server-side and cannot be switched off by a client.
- **Friendly return from Stripe.** Returning from checkout/portal shows a clear message and the query string is cleaned from the URL.

## Fixed
- **Double billing risk.** Checkout now refuses (409) when the user already has an active/trialing/past-due subscription, directing them to the portal instead of creating a second subscription.
- Re-subscribing after cancellation reuses the existing Stripe customer instead of creating a duplicate.
- Checkout/portal return URLs are validated (no more `undefined/?billing=success` when the public URL is missing; returns 503 with a clear message).
- Billing session creation is rate limited per user (20/hour; durable in production) and Stripe errors are no longer echoed to users verbatim.

## Validation
- Billing routes simulated with mocked Stripe/Supabase: new checkout, already-subscribed refusal, resubscribe-after-cancel customer reuse, portal success, no-customer 404, rate limit 429, portal-not-enabled message, missing public URL 503.
- Real ffmpeg run: metadata present in 16:9 and 9:16 exports; captions, ducking and formats unchanged.
- All server files pass syntax checks; all 31 client files pass JSX parse and scope checks.
- NOT done: live Stripe test, `npm install`/`npm run build`, browser testing.

## Still open
`package-lock.json` and a real build on a networked machine; community-review workflow; visible (on-screen) AI disclosure option; base64 audio in project JSON; automated tests; voice-language coverage.
