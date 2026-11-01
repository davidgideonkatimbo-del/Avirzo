# Avirzo commercial model: Runway Dev/API

## Principle

Avirzo owns the customer relationship, credit wallet, retail prices, and margin. Runway Dev/API is a metered production dependency. Never use a Runway consumer website subscription as a substitute for validating API access, terms, throughput, model availability, and current API credit prices. Keep provider keys server-side.

## Free-generation exposure

Planning assumption: one completed five-second video shot, no keyframe image, no music/voice, no retries, and no storage or infrastructure cost. At the currently configured reference rates, Gen-4.5 is 12 credits/second ($0.12/second at $0.01 per credit) and Gen-4 Turbo is 5 credits/second ($0.05/second). These are planning inputs and must be rechecked against the live Runway Dev pricing page before launch.

| Free accounts | Gen-4 Turbo, 5 s ($0.25/shot) | Gen-4.5, 5 s ($0.60/shot) |
|---:|---:|---:|
| 1,000 | $500 | $1,200 |
| 10,000 | $5,000 | $12,000 |
| 100,000 | $50,000 | $120,000 |

This is the maximum annual allowance exposure if every account consumes all 2 free shots at the assumed cost. It is not an actual-spend forecast. A ten-second shot costs twice as much; keyframes, retries, music, voice, performance, storage, egress, support, taxes, and payment fees are excluded. Turbo availability may depend on the generation path and reference-image requirements.

## Retail pricing examples

For one five-second Gen-4.5 shot with an estimated provider cost of $0.60:

| Retail price | Remainder after video API cost | Gross margin before other costs |
|---:|---:|---:|
| $1.50 | $0.90 | 60% |
| $2.00 | $1.40 | 70% |
| $2.50 | $1.90 | 76% |

Formula: `gross margin = (retail price - direct provider cost) / retail price`. These are illustrations, not final prices. Avirzo must include retries, keyframe generation, music/voice, infrastructure, payment processing, taxes, refunds, and support before setting a price.

## Operational safeguards required before launch

1. Quote and reserve credits before calling a provider; never trust a client-supplied cost.
2. Reconcile the final model, duration, and provider usage after generation.
3. Refund failed eligible jobs exactly once; make webhooks and retries idempotent.
4. Enforce both the annual free-generation counter and credit-wallet budget. Free access is 2 scene generations total per account, subject to available credits and model/duration costs.
5. Record per-job estimated provider cost, retail revenue, model, duration, retries, and final status. Review gross margin by model and plan.
6. Add global spend limits, alerts, and a kill switch for free generation.
7. Confirm all Render environment values: environment variables override code defaults. Updating this repository alone does not change an already configured deployment.

## Pricing source

Check the official [Runway Dev pricing page](https://dev.runwayml.com/pricing) and current API documentation before deployment. Re-run the calculations whenever a model rate or credit schedule changes.
