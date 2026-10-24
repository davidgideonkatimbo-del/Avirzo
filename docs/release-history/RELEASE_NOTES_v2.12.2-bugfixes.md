> **Historical note.** This file describes an earlier release. The current release is v2.17.2; see `RELEASE_NOTES_v2.17.2.md` in the project root.

# Avirzo v2.12.2 — Bug fixes

- Fixed batch shot generation so each completed shot is immediately reflected in the editable timeline.
- Cloud projects are updated after each completed shot instead of waiting for the entire batch to finish.
- If a later shot fails, earlier completed clips remain available for review and retry.
- Bumped the app, server, client, and service-worker cache versions together.
- Added a regression test for incremental batch persistence.

## Verification limits

- Server-side automated tests and static Render validation are run locally for this archive.
- Frontend production build and live provider tests require dependency installation and configured external services; these are not represented as passed unless the release workflow confirms them.
- `package-lock.json` is still absent. The local environment could not reach the npm registry to generate it, so dependency installation must be completed in a networked CI/build environment.
