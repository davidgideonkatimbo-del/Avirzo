# v2.12.5 — shot planner and prompt-budget counter (changes on top of v2.12.4)

## Added
- **Shot planner for "Make storyboard".** The storyboard used to paste two sentences into each scene with a generic title and camera. It now plans shots (`server/src/services/shotPlanner.js`, no external AI provider, no extra cost):
  - one shot per paragraph beat (a blank line in the story starts a new beat; short neighbouring sentences in one paragraph are packed together; over-long sentences are split at clause breaks);
  - narrator lead-ins such as "Legend tells of" are dropped from the shot text;
  - a camera move chosen from the action (chase/search → Handheld, sky/mist/hill → Crane reveal, battle/archers/march → Wide tracking, watching/realising → Static, shrine/ritual → Orbit), never the same move three times in a row;
  - a suggested clip length (10 sec for battle/strike/procession beats, otherwise 5 sec);
  - a short title and the primary character matched by name.
  Blank-line paragraphs are the main control: write one visual beat per paragraph.
- **Prompt-budget counter on every scene card.** Avirzo's fixed prompt block (shot identity, setting/era, quality rules) is about 600-615 characters of the 1000-character provider limit, so the scene action has roughly 370 characters before it is cut. The counter shows green up to 220 (room left for cultural/character notes), amber up to 370 (the action fits but optional notes are dropped) and red above 370 (the end of the shot is cut off).
- **Clip length per scene** (5 or 10 sec) on each scene card, and a total-seconds / credits estimate in the storyboard header (1 credit ≈ 1 second).
- **Template: "Legend Thriller: Kibuuka Omumbale"** (folklore, pre-colonial, Luganda profile, open ending) with research (verified facts vs oral tradition), World Bible, and three characters. Added to the East & West Africa pack.

## Changed
- `POST /api/storyboard` returns `duration`, `primaryCharacterName` and `limits` per scene/response; the client maps `primaryCharacterName` to the matching character id.
- Added `SCENE_PROMPT_LIMITS` to `videoPrompt.js` (server) and `constants.js` (client). Keep the two in sync.

## Generate shot / Generate film: fewer failed films
Audit of the generate flow found avoidable ways a creator ended up with a failed or half-made film. Fixed:
- **One failed scene no longer ends the whole film.** "Generate film" used to stop at the first failure and throw the rest away. It now marks that scene failed, carries on with the others and ends with a summary ("5 of 6 scenes are ready; scene 4 could not be rendered: ...").
- **Pressing Generate film again only renders what is missing.** Scenes that already have a clip are skipped, so nothing finished is re-rendered or charged twice.
- **One automatic retry for provider-side failures** (a task the provider fails, a busy/5xx provider, a "succeeded" task with no output). Credits for the failed try are refunded by the server (v2.12.4). Safety/moderation refusals are not retried; the message tells the creator to reword the shot.
- **Out of credits, free month over, or signed out stops the batch immediately** with a clear message (every later scene would fail the same way).
- **A finished clip that only came back as an archived asset (no direct URL) is no longer reported as a failure.**
- **Waiting time raised** from about 7.5 to about 12 minutes before "taking longer than expected" (the task keeps running and shows in Exports & Jobs).
- Generate shot and Generate film now share one submit path (`submitShot`, `finalizeShot`, `shotRequestBody` in `main.jsx`); the rules live in `client/src/shotFlow.js` with unit tests (`server/test/generate-flow.test.js`).
- Limits that remain outside Avirzo's control: the video provider can still refuse or fail a clip, and a free account that is out of credits or clip quota cannot render. A retry after a failed provider task uses one more clip-quota unit (credits are returned; quota is not, per v2.12.4).

## Templates removed
Removed `independence-portrait`, `ghana-kente-memory`, `ethiopia-highland-path`, `senegal-griots-dusk` and `egypt-nile-memory`, their Home cards, and the "East & West Africa" and "Horn & Nile" packs. Kept: `oral-elder`, `documented-history`, `folklore-legend`, `vertical-heritage`, `classroom-heritage`, `kibuuka-legend`, `blank-studio`. Packs are now Oral memory & legend, Documented places, Vertical social and Classroom lesson. To bring a template back, restore its object in `client/src/constants.js` (see v2.11.0-phase-a notes) and its Home card.

## Tests
- New `server/test/shotplanner.test.js` and `server/test/generate-flow.test.js`.
- Three assertions in `release.test.js` were updated because they matched exact code text that moved into the shared helpers (same behaviour: single-shot and batch both pass the new cloud project id; poll timeout 90 -> 150 attempts).
- Full suite: 81 pass, 2 skipped (they need installed dependencies). All client and server source files also parse cleanly with TypeScript's parser (no `npm ci`/Vite build was possible offline).

## Not done / notes
- The client was not rebuilt here (no network for `npm ci`). Run `npm ci && npm run build` before deploying.
- The planner is rule-based, so it will not rewrite narration into pure visual shots. Review and edit the planned shots in Scenes; the counter shows when one is too long.
