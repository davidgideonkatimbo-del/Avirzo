# Avirzo v2.9.0 — Production Gate

This package is a **Premium Creator Foundation** release candidate, not a certified production replacement.

## Verified in the packaging environment

- Render static certification passes.
- All existing release tests pass (11/11).
- Root, client and server versions are synchronized at 2.9.0.
- Existing routes/features were preserved; the global navigation was simplified without adding routes.
- `.env.example` optional provider/Stripe entries were deduplicated.

## Still required on a networked machine

The package intentionally does not contain a fabricated `package-lock.json`.

Run from a clean checkout:

```bash
npm install --package-lock-only --ignore-scripts --no-audit --no-fund
npm ci
npm run build
npm test
```

Then build the production Docker image and run the real production verification script against a configured environment.

**Do not replace the live Render service until every step above succeeds.**

## Infrastructure decision kept separate

The Render Blueprint still declares the web service as `free`. That is the source of the cold-start risk. Moving the web service to a paid instance (and deciding whether to activate the starter worker) is intentionally left as an explicit infrastructure/cost decision rather than silently changing billing configuration in the code package.
