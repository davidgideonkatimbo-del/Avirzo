# Avirzo automated testing

The release gate now includes a dependency-light Node test suite so core behavior can be checked without requiring a browser or paid provider credentials.

Run:

```bash
npm test
npm run build
npm run validate:render
```

The suite covers project normalization/defaults, heritage prompt construction, export dimensions, audio ducking, and explicit language-support claims.

Production procedure remains unchanged: tests/build must pass before replacing the live web service, then the updated web build is tested on Android. The paid worker is still optional and requires explicit approval.
