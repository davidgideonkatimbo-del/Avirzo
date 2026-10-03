# Avirzo v2.2.0 — Heritage Studio UX

## Theme
Premium product layer on the existing production job/export architecture: guided heritage workflows, modular frontend, and a refined cinematic design system.

## What’s new

### Guided heritage templates
Six starter workflows seed story, language profile, era, story type, film look, research notes, and character continuity:

| Template | Intent |
|----------|--------|
| Oral Tradition Short | Elder → next generation; oral vs documented labeling |
| Documented History | Named places/dates with source scaffolding (Buganda/Kasubi example) |
| Folklore / Legend | Cultural legend framed as tradition, not verified history |
| Independence Era Portrait | Character-driven period portrait |
| Vertical Heritage Reel | 9:16 social-ready, still culturally grounded |
| Blank Studio | Empty project with African cinema mode ready |

Templates are applied from the studio nav (“Heritage templates”) or on first visit.

### Frontend modularization
- `client/src/constants.js` — styles, eras, profiles, research defaults, templates
- `components/TemplatePicker.jsx` — guided onboarding grid
- `components/StudioNav.jsx` — primary section navigation + template entry
- `components/Control.jsx` — shared control label
- `main.jsx` imports modules instead of inlining all constants and nav chrome

Existing generation, performance, voice, export, jobs, projects, and auth logic remain in the App orchestrator (production-safe incremental refactor).

### Design system
- CSS variables for surface, accent, warm heritage accent, radii, shadow
- Richer background gradients (violet + warm earth)
- Template cards, active-template chip, nav trigger, generate-button gradient
- Health strip and job progress polish

## Unchanged (still solid)
- Supabase Auth, RLS, private `avirzo-media` storage
- Durable jobs + dedicated worker
- FFmpeg export (formats, captions, ducking, limits)
- Runway + ElevenLabs server-side keys
- Shared-database-safe `avirzo_*` schema (v2.1.8)

## Upgrade path
1. Deploy as usual (Docker / Render blueprint).
2. No SQL migration required for v2.2.0 UI-only changes.
3. Clients should hard-refresh after deploy.

## Next recommended increments
- Split remaining App panels (Bible, Research, Timeline, Projects) into dedicated components
- Caption mode control in UI (`burned` / `soft`)
- Collaboration / sharing (phase 2 of original premium roadmap)
- Billing + usage dashboard
