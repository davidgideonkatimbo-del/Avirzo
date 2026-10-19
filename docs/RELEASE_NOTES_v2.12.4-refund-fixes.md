# v2.12.4 — credit and quota refund fixes

## Fixed
- **Voice, music and character-performance requests were charged credits and quota before validation and never refunded.** A missing voice ID, an unknown project, a missing provider key or any provider error cost the creator credits and an hourly slot. These routes now validate for free first, charge only afterwards, and give credits and quota back on every later failure.
- **Video clips that failed after the provider accepted them kept their credits.** When Runway failed or cancelled a task later, timed out, returned no output or no longer knew the task, the credits charged at the start were never returned. The web service and the worker now refund once per job (`refund:job:<job id>`).
- **A refused credit charge still used up the yearly clip quota.** An `INSUFFICIENT_CREDITS` or `CREDITS_UNAVAILABLE` answer now returns the quota unit it had taken.
- Failed video starts (provider rejected, no task id, exception) now return the quota as well as the credits.
- `safeFetch` no longer leaves a download timer running for up to two minutes after an oversized or aborted download.
- In-memory (non-Supabase) rate buckets are swept so they cannot grow without bound.

- **Saved projects lost their caption mode, export quality and SRT setting.** The studio sends `captionMode`, `exportQuality` and `includeSrt` when saving and reads them when reopening, but the server's `normalizeProject` dropped them, so they reset to defaults after every reload. They are now kept (with validation).

## Tests
- New `server/test/workflow.test.js` runs the real routes end to end: create, edit, reopen and list a project, then start a shot, poll it and receive the finished video (Runway mocked). It skips if dependencies are not installed.

## Database
Re-run `supabase.sql` (it is idempotent). It adds `refund_avirzo_usage`, makes `refund:job:*` credit refunds idempotent in `add_avirzo_credits`, and adds a unique index so two concurrent polls cannot refund the same job twice.

## Notes
- User-initiated cancellation of a running job is not refunded (the provider may already have billed for the work).
- Quota is returned for failures before the provider accepts the work, not for later provider failures; credits are returned for both.
