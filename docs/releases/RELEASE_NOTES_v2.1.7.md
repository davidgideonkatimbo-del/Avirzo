# Avirzo v2.1.7 — Exporter: Formats, Captions, Ducking, Limits

## Fixes
- **9:16 exports.** The `format` field was dropped by the export route and ignored by the exporter, so vertical films were letterboxed into 1280x720. It now flows route -> job payload -> exporter; 9:16 renders 720x1280, 16:9 renders 1280x720.
- **Music/ambience ducking now works.** The gain expression is evaluated per frame (`eval=frame`) and runs *after* `adelay`, so dialogue times match the film timeline. Ducking is smooth (0.25s attack, 0.5s release) to -11 dB, and dialogue intervals are merged so long scripts stay within ffmpeg expression limits.
- **Captions are burned in by default** (visible on every platform). `captionMode: "soft"` keeps a selectable track; if the ffmpeg build lacks the subtitles filter it falls back to a soft track and the result reports `captionMode`.
- **Real cancellation.** A watcher polls the job every 3s and kills a running ffmpeg immediately instead of waiting for the current encode to finish.
- **Useful ffmpeg errors** (last stderr lines) replace opaque exec failures; the 1 MB output-buffer crash is gone (64 MB).
- **Disk guard:** total downloaded media is capped (`EXPORT_MAX_TOTAL_MB`, default 2000).
- **Upload guard:** final file size is checked before upload (`EXPORT_MAX_UPLOAD_MB`, default 500) with a clear message, and uploads use a file-backed Blob (Node >= 19.8) instead of loading the whole film into memory.
- Output uses `+faststart`; Docker image now installs `fontconfig` + `fonts-dejavu-core` so burned-in captions render.
- `processFilmExport` accepts an injectable `fetchBuffer` (used by the tests).

## Validated locally with real ffmpeg 6.1 (not Render/Supabase)
- 16:9 -> 1280x720, 9:16 -> 720x1280, mixed-size scenes normalized and concatenated, audio mixed.
- Ducking: music measured -21.5 dB before dialogue, -32.6 dB during, -21.5 dB after.
- Burned-in captions: pixel difference concentrated in the caption strip (5.7 vs 0.02 elsewhere); soft mode yields a `mov_text` track.

## Not yet verified
- Upload of large Blobs through supabase-js on Render (check with a real 100+ MB export; Supabase's per-file bucket limit also applies).
- Cancellation kill of a long in-flight ffmpeg (logic added, not exercised).
- Scenes with and without audio streams mixed in one film (Runway output is silent, so normal use is fine).
- Non-Latin captions need a font with those glyphs; DejaVu covers Latin/African-Latin diacritics.

## Still open
`package-lock.json`; live end-to-end test; `/api/assets/import` not task-idempotent; base64 audio in project JSON; client UI has no control for `captionMode` yet (defaults to burned-in).
