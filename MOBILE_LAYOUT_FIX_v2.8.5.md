# Avirzo v2.9.3 — Mobile Layout Regression Fix

## Fixed
- Removed the hidden desktop sidebar width reservation on phones.
- Forced the mobile main shell to use the full viewport width.
- Prevented horizontal overflow caused by the stale 200px sidebar offset.
- Kept the top bar anchored to the full mobile viewport so the logo/title do not collide because of the offset.

## Root cause
A later compact-UI rule reintroduced the desktop `.app-main-shell` `margin-left: 200px` rule after the earlier mobile reset. Phones hide `.app-sidebar`, but the main shell continued reserving that space.

## Guardrail
The final mobile media block now explicitly resets the sidebar, main shell, top bar, and page content width. A release regression test verifies the reset remains present.


## Final mobile UX hardening
- Mobile form controls use 16px text to prevent iOS Safari auto-zoom.
- Long emails, project names, URLs and other user text can wrap safely.
- Plain project/profile actions use explicit Avirzo button styling.
- The fixed mobile bottom navigation hides while a form field is focused, then returns after focus leaves the field.
- These behaviors are covered by automated release tests.

## Final polish guardrails
- Narrow-phone media and code blocks are constrained to the viewport.
- Intentional data tables can scroll inside their own content area without moving the page sideways.
- Long headings and compact section controls wrap safely on small screens.
- Horizontal overscroll is suppressed at the document level.
