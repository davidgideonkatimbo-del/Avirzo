# Avirzo v2.12.8 — release notes

This release rolls up v2.12.5, v2.12.6, v2.12.7 and v2.12.8. Earlier notes are in `docs/release-history/`.

## Credit pricing (model-aware, cost-capped)
- 1 credit is about $0.01 of provider cost. Monthly credits: Free 60, Creator 600, Studio 1,800. Prices unchanged: Free $0, Creator $19/month, Studio $59/month.
- Video is quoted by model and duration: Gen-4.5 = 12 credits/second, Gen-4 Turbo = 5 credits/second (`RUNWAY_GEN45_CREDITS_PER_SECOND`, `RUNWAY_GEN4_TURBO_CREDITS_PER_SECOND`). The model is stored on the job.
- Character performance (Runway Act-Two): 5 credits per second of reference video, 3–30 s (`RUNWAY_ACT_TWO_CREDITS_PER_SECOND`). Uploaded videos are measured with ffprobe when installed; unknown length is billed at 30 s.
- Voice: 20 credits per 1,000 characters (`CREDITS_PER_1K_VOICE_CHARS`). Music: 1 credit per second (`CREDITS_PER_MUSIC_SECOND`). Check both against your real ElevenLabs plan.
- Fallback prices are worst-case (Gen-4.5 rate, 12,000-character voice, 30 s performance). A missing, non-numeric or failing quote can never mean free.
- Every credit debit stores a usage record: kind, plan, model, duration or characters, credits and estimated provider cost.

## Video generation
- Scenes with a reference image use Runway `image_to_video`. Scenes without one now use `text_to_video` (Gen-4.5). Gen-4 Turbo needs an image, so the Draft option applies only when an image is attached.
- New "Draft quality (Gen-4 Turbo)" checkbox in Film Look: about 60% fewer credits per clip.

## Free plan and top-ups
- Free credits need a confirmed email in production. Free uses Gen-4 Turbo when an image is attached. `FREE_GENERATION_ENABLED=false` pauses all free usage.
- Top-up packs default to 300 / 1000 / 3000 credits and are offered only when `CREDIT_PACK_<X>_PRICE_USD` is set and at least `MIN_PACK_USD_PER_CREDIT` ($0.015) per credit. Customers who already paid for a hidden pack still receive their credits.
- Yearly clip caps are now backstops (Free 5, Creator 1,500, Studio 5,000); credits are the real limit.

## Hardening
- Performance-video measuring runs asynchronously, only after sign-in and rate limit. Videos over 30 s are refused and refunded.
- Startup log prints each plan's worst-case provider cost and any hidden packs.

## Rollout notes
- Changing defaults does not change credits already granted this month. Existing `*_CREDITS_PER_MONTH` environment values override the defaults.
- Usage report (Supabase SQL editor):
```sql
select date_trunc('month', created_at) m, meta->>'kind' kind, meta->>'model' model,
       count(*) n, sum((meta->>'units')::int) credits,
       sum((meta->>'estimatedProviderCostUsd')::numeric) est_usd
from public.avirzo_credit_ledger
where meta ? 'estimatedProviderCostUsd'
group by 1,2,3 order by 1 desc, est_usd desc;
```

## Verification
- Server tests: 76 passed, 0 failed, 2 skipped. The client build and a live Runway call were not run in the authoring environment; do both before launch.
