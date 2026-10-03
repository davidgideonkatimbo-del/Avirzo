# Avirzo v2.2.1 — Panel modularization

## Theme
Complete extraction of remaining studio panels from the monolithic `main.jsx` into dedicated React components. Logic (auth, generation, export, jobs) stays in the App orchestrator; presentation is modular and maintainable.

## New components

| Component | Responsibility |
|-----------|----------------|
| `ProjectsPanel.jsx` | Auth, cloud workspace, project library, durable assets |
| `VoicesPanel.jsx` | Character voice IDs, dialogue, generation |
| `ResearchPanel.jsx` | Heritage research brief + Buganda/UNESCO example |
| `TimelinePanel.jsx` | Scene timeline, audio tracks, captions, export |
| `CharacterBible.jsx` | Character list, form, reference/performance uploads |
| `StoryComposer.jsx` | Story mode + single-shot mode, African cinema controls |
| `Storyboard.jsx` | Scene list, per-shot generate, reorder, previews |
| `FilmLookControls.jsx` | Style / camera / duration / format |

Already present from v2.2.0: `TemplatePicker`, `StudioNav`, `Control`, `JobCenter`, `HealthPanel`, `constants.js`.

## `main.jsx`
- ~31 KB orchestrator (down from ~50 KB+ dense UI)
- Imports panel components and wires state/handlers as props
- All production API flows preserved

## Upgrade
No database migration. Deploy client build as usual.

## Next
- Caption mode control + export package options in UI
- Project sharing (viewer links)
