# Avirzo v2.10.0 — First-film path, persistence polish, cold-start shell

Builds on v2.9.9 project persistence with product and UX hardening from the review recommendations.

## First film path
- Studio shows a **First film path** strip: Story → Storyboard → First scene → Preview, with step-aware hints.
- Home adds **Example first films** cards (oral elder, documented history, vertical heritage) that apply a template and open Studio.
- Keeps the heritage-first workflow; does not add admin-dashboard clutter.

## Persistence polish
- **Last saved** timestamp after manual save, autosave, load, and successful save-on-sign-out.
- Sign-out that creates a *new* cloud project now says so clearly (name included when available).
- Projects panel surfaces the same last-saved note when signed in.

## Cold start & shell
- HTML boot card while the app mounts: “Opening Avirzo…” with a short note about wake-up after idle time (Render free tier).
- Improved noscript message.
- Service worker cache bumped to `avirzo-static-v2.10.0`.

## Version & docs
- Unified version **2.10.0** (packages, `APP_VERSION`, studio eyebrow, SW).
- Added `RELEASE_NOTES_v2.9.9.md` and this file.
- Release tests extended for first-film strip, last-saved, and example paths.

## Still out of scope (ops / follow-up)
- Live Render deploy remains a manual step.
- Generating and committing a real `package-lock.json` still requires a networked `npm install` on a developer machine, then switch CI/Docker to `npm ci`.
- Durable multi-instance usage quotas remain a later production hardening item.
