# Avirzo v2.8.2 — Scene Continuity Guard

## Purpose
This release turns Character Continuity from a review-only feature into a pre-generation production safeguard.

## Added
- New `/api/ai/scene-continuity` preflight endpoint.
- Scene-level continuity audit before provider generation.
- Primary-character assignment check.
- Pre-1994 anachronism blocker for common modern references detected in scene text.
- Character continuity context injected into cinematic generation prompts.
- World Bible visual, costume, language and continuity locks carried into generation prompts.
- Scene continuity audit persisted on the local scene state for project save/load.

## Generation behavior
A scene is blocked before provider generation when the preflight detects a critical continuity conflict. Non-critical continuity information is added as prompt constraints and shown as warnings rather than silently changing the filmmaker's text.

## Cultural/research principle
Continuity locks protect established creative choices. They do not prove cultural or historical accuracy. Research, primary sources and appropriate community review remain authoritative.

## Validation
- Server JavaScript syntax checks passed for core services, AI routes and generation routes.
- Full client Vite build could not be completed in this environment because dependency installation timed out; no browser-build pass is claimed.
