# Avirzo v2.17.9 — Authentication and profile management

## Changes
- Added display-name collection during account creation.
- Improved sign-in input validation and clearer success/error feedback.
- Improved session restoration and sign-out failure handling.
- Kept the existing save-before-sign-out behavior so the current film is saved before the session ends when possible.
- Added editable display name and email address through Supabase Auth user metadata. Email changes may require confirmation depending on Supabase Auth settings.
- Added password-reset email requests and signed-in password updates.
- Improved accessible status feedback and responsive profile forms.

## Configuration notes
- Supabase Auth must be configured in the client with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Add the deployed Avirzo profile URL to Supabase Auth's allowed redirect URLs for password-reset links.
- Email confirmation and email-change confirmation depend on the project's Supabase Auth settings and email delivery configuration.

## Verification caveats
Automated tests, syntax checks, package version checks and Render static checks must pass before staging. A live Supabase sign-up, sign-in, sign-out, password recovery, and email-confirmation round trip still requires testing in the configured staging project.
