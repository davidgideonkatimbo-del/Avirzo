# Avirzo studio layout refactor

This build is based on the production-ready Avirzo v2.8.2 codebase and reorganizes the client into a standard multi-page studio experience without changing the server/worker architecture.

## Added
- Home dashboard
- Persistent desktop sidebar navigation
- Mobile bottom navigation
- Hash-based routes for direct page navigation
- Dedicated pages for Studio, Projects, Heritage Bible, Story, Scenes, Voices, Timeline, Assets, Exports, Profile and Settings
- Creator profile page
- Workspace settings page
- Page-level headings and reduced one-page scrolling

## Preserved
- Supabase authentication and storage flow
- Existing generation, job, export and worker APIs
- Existing filmmaking panels and African heritage workflows
- Render/Docker/server architecture

## Next organization layer
1. Add persistent project folders and folder navigation.
2. Give each project its own workspace route with Story, Heritage, Characters, Scenes, Voices, Assets, Timeline and Exports as sub-pages.
3. Expand creator profile fields and account preferences.
4. Add route guards for signed-in project areas.
5. Test desktop and mobile navigation before merging to production.

This is a layout refactor candidate and should be validated locally/through CI before replacing the live deployment.
