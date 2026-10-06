# Avirzo v2.8.5 — Multi-page Studio structure

Avirzo is organized as an application shell rather than a single scrolling studio.

## Main pages
- Home — dashboard and quick actions
- Studio — active filmmaking workspace
- Projects — saved film workspaces
- Heritage Bible — roots, world rules, research and character continuity
- Story — story development and story intelligence
- Scenes — scene planning and generation
- Voices — character voice management
- Timeline — editing, audio and captions
- Assets — project media library
- Exports — production jobs and finished exports
- Profile — authentication and creator account
- Settings — film defaults and workspace preferences

## Navigation
- Desktop: fixed sidebar + top bar.
- Mobile: compact top bar + five-item bottom navigation + More sheet for the remaining pages.
- Navigation uses hash routes (for example `#/projects`) so the current server deployment does not require a new server-side router configuration.

## Project organization
Projects remain the durable unit of work. Assets are now presented in a dedicated Assets page and are scoped to the current project. The existing project API/storage model is preserved.

Folder/subfolder persistence is intentionally not invented in this UI pass because it requires a database schema and API contract. It can be added as a separate migration without changing the page architecture.

## v2.9.0 performance boundary
Heavy project tools are lazy-loaded from `client/src/main.jsx`. Home, navigation and the application shell can render without eagerly downloading Storyboard, Timeline, Heritage, Research, Voices, Assets, Projects and other large panels.

Billing & Usage is exposed through the account More sheet and continues to use the server's durable hourly usage counters as the source of truth.
