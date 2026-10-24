> **Historical note.** This file describes an earlier release. The current release is v2.17.2; see `RELEASE_NOTES_v2.17.2.md` in the project root.

# v2.12.7 — text-only scenes now generate

## Fixed
Scenes with no reference image were sent to Runway's `image_to_video` endpoint with no image, which Runway rejects.
They now go to `text_to_video` (Gen-4.5). Scenes with a reference image still use `image_to_video`.

Gen-4 Turbo cannot do text-only video, so the Draft option only applies when a reference image is attached.
Text-only scenes always use Gen-4.5 and are priced at the Gen-4.5 rate.

## Please test
Generate one text-only 5-second scene and one scene with a reference image on a real Runway key before launch.
The change follows Runway's published API notes; it has not been run against Runway from here.
