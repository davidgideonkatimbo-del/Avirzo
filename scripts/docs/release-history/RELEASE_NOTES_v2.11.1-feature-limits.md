> **Historical note.** This file describes an earlier release. The current release is v2.17.2; see `RELEASE_NOTES_v2.17.2.md` in the project root.

# Feature factory limits (v2.11.1)

Longer sequences via **more scenes**, not longer AI clips (provider still 5–10s).

## Caps by plan
| Plan | Storyboard scenes | Export scenes | Assembled length |
|------|-------------------|---------------|------------------|
| Free | 24 | 24 | 15 min |
| Creator | 80 | 80 | 45 min |
| Studio | 200 | 200 | **90 min** |

Env overrides: `*_MAX_STORYBOARD_SCENES`, `*_MAX_EXPORT_SCENES`, `*_MAX_EXPORT_SECONDS`.

## How feature length works
1. Write a longer story → storyboard splits into more scenes (up to plan cap).
2. Generate each scene (uses monthly production credits).
3. Timeline orders them; export stitches into one film up to plan duration.

Monthly credits still bound **provider** cost. Scene/export caps bound **assembly** scale.
