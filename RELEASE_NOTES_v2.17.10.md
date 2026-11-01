# Avirzo v2.17.10 — Authentication recovery and sign-out fixes

## Fixes
- Password-reset emails now return to the clean application URL instead of embedding a hash route in the Supabase auth callback URL.
- The app waits for Supabase’s `PASSWORD_RECOVERY` event before navigating to the profile page, where the user can set a new password.
- Sign-out uses `scope: local`, ending the current device session without unexpectedly signing out other devices.
- Added regression assertions for reset redirect shape, recovery-event routing, and local sign-out.

## Validation
- `npm test`: 115 passed, 0 failed, 2 skipped (server integration tests require dependencies).
- `node scripts/validate-render.mjs`: passed.
- Production client build attempted but could not run because Vite is not installed; `npm ci` timed out in this environment.
- Live Supabase email recovery and sign-out behavior still require staging verification.
