# Avirzo v2.11.0 — Phase A (additive gaps)

Closes high-impact product gaps **without** changing architecture, job system, worker, Supabase schema, or the protected production procedure.

## What was added

### 1. Broader African coverage
- New `africanProfiles` (client + server): Ghana (English, Twi), Ethiopia (Amharic, English), Senegal (Français, Wolof), Egypt (Arabic, English), Diaspora English.
- Matching `voiceLanguageSupport` entries with honest verified vs unverified notes (same pattern as existing languages).

### 2. New heritage templates
- `ghana-kente-memory` — oral tradition, Twi, intergenerational cloth story
- `ethiopia-highland-path` — landscape & belonging, Amharic
- `senegal-griots-dusk` — griot performance, Wolof
- `egypt-nile-memory` — Nile contemplative moment, Egyptian Arabic

All follow existing template shape (story, research, characters, era, storyType). Blank Studio and prior templates unchanged.

### 3. First-film magic on Home
- Primary CTA: **Make my first film** → applies oral-elder template and opens Studio on the existing First film path.
- Dashboard primary card points at the same 3-tap start.
- Example gallery expanded to seven paths (original three + Ghana, Ethiopia, Senegal, Egypt).
- Shared `startFirstFilm(templateId)` helper; no new routing.

### 4. Light sequence helper
- Timeline panel shows a short, dynamic tip: how many scenes you have and that export already stitches them into one short.
- Reuses existing timeline + export pipeline only. No new jobs or services.

### 5. CSS
- Example grid uses `auto-fill` so more cards layout cleanly on desktop and still stack on mobile.
- Subtle style for the sequence helper callout.

## What was not changed
- Job claim, priorities, worker, Render blueprints
- Auth, billing, free-tier limits, RLS
- Core workflow: create film → story → storyboard → first scene
- Heritage-first identity and procedure guardrails
- No new npm dependencies

## Deploy
Same as v2.11.0: deploy web after `npm ci` + `npm run build`. No new SQL required for Phase A.
