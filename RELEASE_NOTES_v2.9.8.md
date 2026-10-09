# Avirzo v2.9.8 — Faster loading, safer uploads, link previews

- Route panels (Projects, Heritage, Timeline, Voices, Assets, Settings, Profile, project workspace and more) now load on demand, so the first screen downloads much less JavaScript.
- In production, large request bodies (up to 60 MB) are only accepted from requests that present a bearer token; anonymous callers are limited to 1 MB.
- Added Open Graph / Twitter link-preview tags, a canonical link and a noscript message.
- Service worker now precaches the app shell for offline opening, caches the latest page for offline use, and uses a versioned cache name.
- Version strings unified at 2.9.8 (packages, server, studio header, README); `validate:render` now derives the expected version from the root package.json.
- Includes the v2.9.7 new-project button fix and the v2.9.3–2.9.6 changes.
