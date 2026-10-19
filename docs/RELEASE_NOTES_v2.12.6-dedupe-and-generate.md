# v2.12.6 — duplicate templates and more reliable generation

## Templates
- `dedupeTemplates()` in `client/src/constants.js`: a template can appear only once (same id, same title, or same story opening). `heritageTemplates` is built through it, the Template picker filters through it again, and pack `templateIds` are de-duplicated and limited to templates that exist.
- No template content was deleted. If two *different* templates feel redundant (for example `folklore-legend` and `kibuuka-legend`), say which to drop.

## Generate shot / film
- The provider request now has a 45 s timeout. A hung provider returns 504 (the client already retries that once, and the credits are refunded) instead of leaving the shot spinning.
- If the provider rejects a shot because of the reference image (400/422, not a safety refusal), the server retries once without the reference image so the shot still renders from the text prompt.

## Tests
- New `server/test/templates.test.js`.

## Also in v2.12.6 (follow-up round)
- **No double charges on a repeated request.** Each shot attempt carries an `idempotencyKey`. `POST /api/generate` checks it before charging: the same key returns the already-running task (`duplicate: true`) instead of starting a second clip. A dropped connection is resent up to 3 times with the same key. Keys live in the job payload (no schema change). Limit: the check is per server process plus the jobs table, so two simultaneous first requests on different servers could still both pass.
- **Applying a template starts a new film.** It no longer keeps the open project's id, so autosave can't overwrite that film with the template.
- **Video provider adapter** (`server/src/services/videoProvider.js`): the Runway call, 45 s timeout, prompt cut and reference-image fallback live behind `provider.submit()`.
- **Poll loop extracted** to `client/src/generationPoll.js` (pure, unit-tested in `generation-poll.test.js`).
- **"Shorten to fit"** button on any shot over the prompt limit (`client/src/shotTighten.js`, rule-based, free).
- Version bumped to 2.12.6 everywhere (service-worker cache name too). Release notes moved to `docs/`. CI uses `npm ci`. Version assertions in tests now read `package.json`.

## Not done
- Server-side "Generate film" batch job (the loop still runs in the browser tab).
- Continuity blockers are still advisory (the guard never blocks); left as is so shots don't fail.
- Splitting the rest of `main.jsx`, a second video provider, and a model-based shot rewrite.
