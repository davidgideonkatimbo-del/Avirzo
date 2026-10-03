# Avirzo v2.6.0 — African Roots Intelligence

## Product direction
Avirzo remains an African-roots filmmaking platform. This release makes cultural identity a first-class production input rather than a marketing label.

## Added
- African Roots Foundation before storyboard generation.
- Community / cultural group field.
- Country / region and specific place fields.
- Story language field.
- Specific period field.
- Evidence-level classification: documented, oral, mixed, creative reconstruction.
- Cultural anchors for architecture, clothing, food, tools, music, landscape and social practice.
- Explicit creative-liberties field separating invention from historical claims.
- Community sensitivity / review notes.
- Roots data persisted inside project payloads and restored with projects.
- Director Copilot now consumes the Roots Foundation and reports missing roots requirements before rendering.

## Product principle
Avirzo should not generate generic “African-looking” content. The production context should identify the people, place, language, period and cultural anchors before expensive generation.

## Validation
- Server JavaScript syntax validation passed.
- npm lockfile generation remains an environment limitation because registry access timed out; do not fabricate a lockfile.
