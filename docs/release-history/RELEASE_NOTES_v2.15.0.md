# Avirzo v2.15.0 — release notes

This release rolls up v2.12.5 to v2.15.0. Earlier notes are in `docs/release-history/`.

## New in v2.15.0: 1080p export, and a fix for the film finish
- **Fix:** in v2.14.0 the export route did not pass the Film finish and loudness choices on to the exporter, so every export used the default finish whatever was chosen in the screen. The route now passes `finish`, `normalizeLoudness` and `resolution` through, with a test.
- **1080p export (paid plans):** a "Picture size" choice in the export screen. 1080p enlarges the 720p scenes with a Lanczos scale and light sharpening. It adds no new detail, but many video sites give 1080p uploads a better encode. Free plans export at 720p. 1080p is slower and makes bigger files.
- **Runway price check:** Runway's published pricing page confirms the rates in this release: Gen-4.5 12 credits/second, Gen-4 Turbo 5, Act-Two 5, `gen4_image` 5 credits (720p) or 8 (1080p), `gen4_image_turbo` 2.
- **Not added: AI video upscaling.** Runway's current video upscaler (`magnific_video_upscaler_creative` on `/v1/video_upscale`) is billed per output frame: about 84 credits for a 5-second 24 fps clip at 1k, more than generating the clip. Revisit if you want a paid "final render" option.

## New in v2.14.0: film finish in the export
- **Colour grade, grain and soft edges, applied to every scene** so shots from different generations sit together. Choose Filmic (default), Warm, Cool, Natural or None in the export screen. Draft exports skip the finish unless one is chosen. The finish adds roughly 5% to the file size.
- **Even loudness:** the final audio mix is normalised to -16 LUFS, with a 1-second fade at the end. Turn off with `normalizeLoudness: false` in the export request.
- **Encode quality now applies to every scene.** Before, Draft / Standard / High only affected exports with burned-in captions; scenes were always encoded at ffmpeg's default quality.
- Tested with real ffmpeg: every preset runs and keeps the picture size.

## New in v2.13.0: keyframe-first film quality
- Optional "Keyframe first" step (on by default in Film Look): Runway's image model (`gen4_image`, `text_to_image`) first creates the scene's opening frame, using the character reference image, then `image_to_video` animates that frame. This should give steadier faces, costumes and look from shot to shot.
- Works with or without a character image. Because a keyframe is an image, Gen-4 Turbo drafts also work for scenes with no character image.
- Cost: 5 credits per scene for `gen4_image` (2 for `gen4_image_turbo` on Draft), added to the video cost. Set `RUNWAY_GEN4_IMAGE_CREDITS` and `RUNWAY_GEN4_IMAGE_TURBO_CREDITS` to match Runway's current pricing.
- One job covers both steps. The browser keeps polling the same task id; the video task id is stored in the job. If the browser stops polling, the background worker moves the job along. Cancelling stops whichever step is running. If either step fails, the whole scene is refunded.
- The first-frame image is shown in the poll response (`keyframeUrl`); Runway's image links expire after about a day, and the first frame is not yet saved to the project library.

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
- Server tests: 92 passed, 0 failed, 2 skipped. The client build and a live Runway call were not run in the authoring environment; do both before launch.
