# Avirzo v2.8.2 — Compact UI Pass

This pass reduces visual and copy density without removing core functionality.

## Changes
- Reduced global sidebar to the primary product areas: Home, Studio, Projects, Heritage, Assets, Exports.
- Moved Story, Scenes, Voices and Timeline into the project workspace / More menu instead of showing every area globally.
- Removed the always-visible Health panel from the global shell.
- Studio now shows one working mode at a time: Story or Shot.
- Shortened page headings and descriptions.
- Reduced card heights, padding, typography and explanatory copy.
- Simplified the project workspace navigation to labels only.
- Preserved existing routes, Supabase integration, project context and production architecture.

## Verification
- Render validation: passed.
- Server syntax checks: passed.
- Full Vite build: not verified in this environment because npm dependency installation times out.
