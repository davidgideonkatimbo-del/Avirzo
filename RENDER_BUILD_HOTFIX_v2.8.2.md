# Avirzo v2.8.2 Render build hotfix

## Fixed

`client/src/components/CharacterContinuity.jsx` was rewritten from a compressed JSX expression into structured JSX after Render/Vite reported:

`Unterminated regular expression` at `CharacterContinuity.jsx:18`.

The component behavior is preserved: it submits the continuity audit, displays score/character/scene/flag counts, shows warnings and character flags, and retains the heritage continuity guidance.

## Deployment

Replace the existing repository contents with this release, commit the change, push to `main`, and redeploy Avirzo on Render.

Do not change API keys to address this particular error. It is a frontend source compilation error.
