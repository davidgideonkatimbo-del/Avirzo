> **Historical note.** This file describes an earlier release. The current release is v2.17.2; see `RELEASE_NOTES_v2.17.2.md` in the project root.

# v2.12.6 — credit safety fixes

## Fixed
1. **Performance, voice and music now cost what they really cost.**
   - Performance (Runway Act-Two): 5 credits per second of the reference video (3–30 s). Uploaded videos are measured on the server with ffprobe; unknown length is billed at 30 s (150 credits). The client now sends the video length.
   - Voice: 20 credits per 1,000 characters (`CREDITS_PER_1K_VOICE_CHARS`).
   - Music: 1 credit per second (`CREDITS_PER_MUSIC_SECOND`).
   - **Check the voice and music rates against your real ElevenLabs plan** and adjust the env values.
2. **Top-up packs are price-checked.** A pack is offered only if `CREDIT_PACK_<X>_PRICE_USD` is set and is at least `MIN_PACK_USD_PER_CREDIT` (default $0.015) per credit. Defaults are now 300 / 1000 / 3000 credits (suggested $6 / $20 / $55). Hidden packs are logged at startup. A customer who already paid for a pack still gets their credits.
3. **Free-plan guard.** Free credits need a confirmed email in production. Free uses Gen-4 Turbo when a reference image is attached. `FREE_GENERATION_ENABLED=false` pauses all free usage. Removed the unused `FREE_INCLUDED_CREDITS`.
4. **Yearly clip caps no longer block paid users.** They were 60 (Creator) and 200 (Studio) per year, which ran out before the credits did. They are now backstops (1500 / 5000).
5. **Worst-case fallbacks.** If a route forgets to pass a quote, generation is billed at the Gen-4.5 rate, voice at 12,000 characters, performance at 30 s.
6. **Draft quality option.** A "Draft quality (Gen-4 Turbo)" checkbox in Film Look uses about 60% fewer credits per clip. It needs a character reference image.
7. **Usage records.** Every credit debit stores kind, plan, model, duration or characters, credits, and estimated provider cost in the ledger.

## Not changed
- Plan prices ($19 / $59) and monthly credits (600 / 1800).
- Existing accounts keep this month's grant (monthly grants are once per plan per month). To top one up, insert a credit through `add_avirzo_credits` with a new reason.

## Usage report (Supabase SQL editor)
```sql
select date_trunc('month', created_at) m, meta->>'kind' kind, meta->>'model' model,
       count(*) n, sum((meta->>'units')::int) credits,
       sum((meta->>'estimatedProviderCostUsd')::numeric) est_usd
from public.avirzo_credit_ledger
where meta ? 'estimatedProviderCostUsd'
group by 1,2,3 order by 1 desc, est_usd desc;
```

## Verified / not verified
Server tests pass (72 passed, 2 skipped). The client build was not run (no dependencies installed here). Please run `npm run build` before deploying.
