# Avirzo optimizations (on top of v2.11.0 fixes-7)

## 1. Relevance-ranked continuity context (`continuity.js`)
- The continuity lock is now *selected* instead of concatenated and cut at 900 characters: primary character always; other characters only when the scene names them or overlaps their identity text (max 3); world-bible fields and individual continuity locks ranked by overlap with the scene text and filled best-first within the budget.
- Pure lexical scoring: no embedding API, no vector store, no network. `continuity.js` never called an LLM, so there was no token cost to cache; the real constraint is the 1000-character Runway prompt window, which this protects.
- Response now includes `includedCharacters`.

## 2. Model fallback (`services/modelFallback.js`, `routes/generation.js`)
- The video submit call tries the primary model, then `GENERATION_FALLBACK_MODELS` (default `gen4_turbo`, only when a reference image exists) on network failure, timeout (`PROVIDER_SUBMIT_TIMEOUT_MS`) or 408/429/5xx.
- 400/401/402/403/404/422 are returned immediately: another model would fail the same way.
- The job payload records `model` and `fallbackUsed`. Usage is counted once per request, not per attempt.
- `safeFetch.js` is unchanged: it is the SSRF-safe media downloader, not the provider client.

## 3. Live collaboration (`hooks/useProjectRoom.js`, `supabase.sql`)
- Private Supabase Realtime channel per project (`avirzo:project:<uuid>`): Broadcast for field patches (story, notes, world bible, characters, roots) and Presence for who is online.
- **Run the new `v2.12` block in `supabase.sql`.** It adds `realtime.messages` policies: members can listen, only owner/editor can send. It only adds `avirzo_`-named objects scoped to `avirzo:project:*` topics and changes no dashboard setting, so other apps in the same Supabase project are unaffected.
- Per-field last-writer-wins; a remote change is held back while you are typing in that field. Broadcast is transient: saving still persists work.
- Solo projects open no connection.
