# Avirzo v2.12.1 — Cinematic quality and scene heritage music

## Added
- Scene Music Studio on the existing editing timeline.
- Original instrumental scene scores generated through the ElevenLabs Music API (`music_v2_5`).
- Scene mood, duration, director notes, music direction, and instrument guidance controls.
- Music prompts incorporate the project's Roots Foundation and World Bible soundscape notes.
- Explicit cultural guardrails: do not flatten African cultures into a single sound; do not invent sacred or restricted practices; prefer restraint when historical evidence is uncertain.
- Generate one scene's music at a time, or explicitly start a sequential batch for all timeline scenes. Completed tracks remain available if a later batch item fails.
- Generated scores become editable music tracks on the existing timeline and are saved with the project. Archived audio uses the existing private `avirzo-media` storage and is re-resolved by asset ID after project reload.

## Configuration
- Set `ELEVENLABS_API_KEY` in the server's secret environment. ElevenLabs Music API access requires a qualifying paid ElevenLabs account/plan.
- Supabase and the `avirzo-media` storage bucket must be configured to archive generated audio permanently to a saved project. Without a saved project, a temporary audio preview is returned where size permits.

## Workflow preserved
- Avirzo still creates and edits individual shots/scenes.
- Batch music is an explicit, optional sequential action; it is not whole-film one-click generation.
- Existing scene, audio, timeline, and export workflow is retained.


## Cinematic quality safeguards
- Video prompts include explicit direction for natural motion, believable physics, stable faces/anatomy, consistent wardrobe/props, coherent exposure and colour, and fewer temporal artefacts.
- Prompt assembly protects the scene action and prioritizes cultural grounding / World Bible notes within the provider's 1,000-character limit.
- Added automated tests for long prompts, quality constraints, and cultural context retention.
- These are prompt-level safeguards, not a guarantee of perfect generated footage; review each shot before editing/export.
