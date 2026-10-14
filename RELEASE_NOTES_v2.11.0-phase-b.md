# Avirzo v2.11.0 — Phase B (additive gaps)

Continues Phase A. Still **no** changes to jobs, worker, Supabase schema, billing limits, or the protected production procedure.

## What was added

### 1. Community & classroom packs
- `communityPacks` in `constants.js` — curated groups (oral, documented, social, classroom, regional).
- Template picker shows pack chips; selecting a pack filters the template grid.
- **Import shared pack JSON** uses the existing `POST /api/heritage/template-pack/import` (no new endpoint).

### 2. Classroom template
- `classroom-heritage` — teacher + students at a named heritage site, research labels, discussion framing.
- Linked from Home example gallery and the Classroom community pack.

### 3. Continuity tip on Scenes
- When 2+ scenes exist, a short callout reminds the user to use Heritage Bible / continuity audit so character identity travels across shots.
- No new AI or API — guidance only.

### 4. Social / platform export presets
- Timeline → Share presets: Reels/TikTok/Shorts, YouTube/festival, WhatsApp.
- Each preset only sets existing `format`, `captionMode`, and `exportQuality` (same export pipeline).

## Files touched
- `client/src/constants.js` — classroom template + `communityPacks`
- `client/src/components/TemplatePicker.jsx` — packs UI + JSON import
- `client/src/components/TimelinePanel.jsx` — social presets + optional `setFormat`
- `client/src/main.jsx` — wire props, classroom card, continuity tip, `setFormat` in timeline props
- `client/src/styles.css` — pack grid + social preset spacing

## What was not changed
- Server routes beyond existing template-pack import
- Job system, worker, RLS, free-tier quotas
- Core workflow and heritage-first identity

## Deploy
Same as v2.11.0 web deploy. No new SQL.
