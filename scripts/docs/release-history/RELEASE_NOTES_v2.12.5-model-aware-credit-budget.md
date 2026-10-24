> **Historical note.** This file describes an earlier release. The current release is v2.17.2; see `RELEASE_NOTES_v2.17.2.md` in the project root.

# v2.12.5 — model-aware production credits

## Business economics and safeguards

- Video generation credits are quoted on the server using the selected Runway model and requested duration, rather than charging one credit per second regardless of provider cost.
- Default rate assumptions: Gen-4.5 = 12 provider credits/second; Gen-4 Turbo = 5 provider credits/second. These defaults must be rechecked if the Runway model/pricing contract changes.
- Default monthly budgets: Free 60, Creator 600, Studio 1,800 credits. Subscription prices remain Free $0, Creator $19/month and Studio $59/month.
- Voice and performance continue to share the same production-credit wallet; their current fixed costs remain unchanged in this release.
- Existing provider-failure refund handling is preserved. Model selected for generation is also stored in the job payload for later debugging and cost review.
- Added environment overrides: `RUNWAY_GEN45_CREDITS_PER_SECOND`, `RUNWAY_GEN4_TURBO_CREDITS_PER_SECOND`, and updated `FREE_CREDITS_PER_MONTH`, `CREATOR_CREDITS_PER_MONTH`, `STUDIO_CREDITS_PER_MONTH` defaults.

## Expected video budget (video only)

At the default rates, a 5-second Gen-4.5 clip costs 60 credits and a 10-second Gen-4.5 clip costs 120 credits. A 5-second Gen-4 Turbo clip costs 25 credits and a 10-second clip costs 50 credits. Voice and performance reduce the remaining shared balance.

## Important rollout note

Changing defaults does not retroactively change credits already granted to accounts for the current calendar month. Existing `FREE_CREDITS_PER_MONTH`, `CREATOR_CREDITS_PER_MONTH`, or `STUDIO_CREDITS_PER_MONTH` environment values override these defaults and must be updated in the hosting environment if they are set.

## Verification

- Server test suite: 68 passed, 0 failed, 2 skipped (the skipped tests require server dependencies not installed in this working environment).
- Client production build could not be run in this environment because Vite is not installed (`vite: not found`).
