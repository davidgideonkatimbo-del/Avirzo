# Avirzo v2.17.13 — Asset and voice reliability

## Changes
- Map African language profiles to provider-specific locale codes; do not pass generic ISO codes to every provider.
- Reject unsupported profile/provider combinations before charging credits, and never silently substitute a different language.
- Expose provider-specific profile availability in the voice options response.
- Require a complete AWS credential configuration before reporting Amazon Polly as ready.
- Apply media-type-specific download limits and validate downloaded media signatures before archiving imports.
- Check asset storage deletion and signed-URL creation errors instead of reporting success when these operations fail.
- Attempt storage rollback if a database asset record cannot be created.
- Align runtime/package/cache version markers and add regression tests for voice mapping and asset validation.

## Staging checks still required
- Test each configured voice provider with actual credentials and provider-valid voice IDs.
- Have native speakers review generated samples before marketing a language as production-ready.
- Verify Supabase storage and database behavior with staging credentials; automated tests do not exercise the live storage service.
- Run the client production build in an environment with dependencies installed.
