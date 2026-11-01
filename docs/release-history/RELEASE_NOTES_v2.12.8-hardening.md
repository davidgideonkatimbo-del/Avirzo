> **Historical note.** This file describes an earlier release. The current release is v2.17.2; see `RELEASE_NOTES_v2.17.2.md` in the project root.

# v2.12.8 — polish and hardening

- **A bad price can never mean free.** If a route's credit quote is missing or not a number, the worst-case default for that kind is charged. A quote that throws returns a clean error and gives back the usage quota.
- **Performance videos are measured safely.** The ffprobe length check now runs asynchronously (it no longer blocks the server) and only after the caller is signed in and within their rate limit. A reference video over 30 seconds is refused and refunded.
- **Startup log** shows each plan's worst-case provider cost per month, and lists any top-up packs that are hidden because of their price.
- Tests: 75 passed, 2 skipped. The probe was tested on a real 4-second video (measured 4 s).

Still to do before launch: run `npm run build` for the client, and test one text-only and one image-based scene on your real Runway key.
