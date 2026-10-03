# Avirzo v2.2.2 — Caption mode & export package options

## Theme
Production export packaging is now controllable from the Timeline UI, with matching server support.

## Caption mode (UI + API + exporter)
| Mode | Behavior |
|------|----------|
| **Burned-in** (default) | Hard-coded subtitles via ffmpeg `subtitles` filter |
| **Soft track** | Selectable `mov_text` subtitle stream in the MP4 |
| **None** | Video/audio only (no subtitle stream or burn) |

If burn is requested but the ffmpeg build lacks the subtitles filter, the exporter falls back to a soft track (same as before).

## Encode quality presets
| Preset | Encoder |
|--------|---------|
| **Draft** | ultrafast · CRF 28 |
| **Standard** (default) | veryfast · CRF 21 |
| **High** | medium · CRF 18 |

## SRT side-car
- `includeSrt` (default on) returns the generated SRT text in the export response.
- Timeline shows **Download captions.srt** when available.

## API payload (`POST /api/export/film`)
```json
{
  "captionMode": "burn | soft | none",
  "quality": "draft | standard | high",
  "includeSrt": true,
  "duckMusic": true,
  "format": "16:9 | 9:16",
  "scenes": [],
  "audioTracks": [],
  "captions": []
}
```

## Project persistence
`captionMode`, `exportQuality`, and `includeSrt` are saved and restored with the project payload.

## UI
Timeline → **Export package** card with caption mode, quality, SRT toggle, and live package summary.

## Upgrade
No SQL migration. Redeploy web + worker so both pick up exporter changes.
