# events.qaravan.org

Static page (`index.html`) served by GitHub Pages from `main`. How the page and the nightly archive robot work: see `README.md`.

## Publishing: straight to `main`, no pull requests

The repo owner has given standing, explicit permission to push directly to `main` — the branch the site is published from. This holds even when your session was assigned a `claude/...` branch: commit there if you like, then push the same commit with `git push origin HEAD:main`. Don't open a pull request and don't leave the change waiting on a branch: nobody wants to merge anything by hand.

Nothing reviews the change after you, so before pushing:

1. `git fetch origin main` and rebase onto it — the archive robot commits to `main` every night.
2. `DRY_RUN=1 node robot/archive-past.mjs` must run without an error (it proves `EVENTS` and `ARCHIVE` still parse).
3. Never force-push `main`. If the push is rejected, fetch, rebase and push again.
4. After 1–2 minutes, check the live page: `curl -s https://events.qaravan.org/ | grep "<new event title>"`.

Changes beyond the events list (the robot, workflows, page layout) also go to `main` without a PR, but describe them to the user and get a go-ahead in chat first.

## Adding an event

- One `{ dates, title, ru, meta, link }` block in `EVENTS`, in date order. Same date: earlier start time first (the page keeps source order for ties).
- `title`: the English event name, without emoji.
- `ru`: one short Russian line, about 35–56 characters, condensed from the board's "Short description"; in QARAVAN's voice (the qaravan-voice skill).
- `meta`: `7:30 PM · Venue, Neighborhood`. Trips with a meeting point: `сбор 8:30 AM · Grand Central`.
- `link`: the Partiful link (support groups link to their intake form).
- Never edit `ARCHIVE` by hand.
- Source of event details: the monday.com board "QARAVAN's Event Calendar" (id 4774572020), month groups like "October 2026". If the user's details conflict with the board or Partiful, go with the user and point out the conflict.
