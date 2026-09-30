# events.qaravan.org

Static page (`index.html`) served by GitHub Pages from `main`. How the page and the nightly archive robot work: see `README.md`.

## Publishing: straight to `main`, no pull requests

The repo owner has given standing, explicit permission to push directly to `main` — the branch the site is published from. This holds even when your session was assigned a `claude/...` branch: commit there if you like, then push the same commit with `git push origin HEAD:main`. Don't open a pull request and don't leave the change waiting on a branch: nobody wants to merge anything by hand.

Nothing reviews the change after you, so before pushing:

1. `git fetch origin main` and rebase onto it — the archive robot commits to `main` every night.
2. `DRY_RUN=1 node robot/archive-past.mjs` must run without an error (it proves `EVENTS` and `ARCHIVE` still parse and every event has both its `en` and `ru` halves).
3. Never force-push `main`. If the push is rejected, fetch, rebase and push again.
4. After 1–2 minutes, check the live page: `curl -s https://events.qaravan.org/ | grep "<new event title>"`.

Changes beyond the events list (the robot, workflows, page layout) also go to `main` without a PR, but describe them to the user and get a go-ahead in chat first.

## Adding an event

The page is bilingual with a RU / EN switch: every event carries a complete English half and a complete Russian half. Neither language is a translation afterthought.

- One block in `EVENTS`, in date order: `{ dates, time, type, en: { title, about, place }, ru: { title, about, place }, link }`. Same date: earlier `time` first.
- `dates`: `["2026-10-10"]`; several dates in one card for recurring groups.
- `time`: start time, 24-hour, `"17:00"` (trips: the meeting time). The page renders `17:00` in Russian and `5:00 PM` in English.
- `type`: the board's Category column: `support` (Support & wellbeing), `community`, `resources` (Resource navigation), `culture` (Education & culture), `action` (Action & pride). It sets the card's colour flag, per the design system.
- `en.title`: the English event name from Partiful, without emoji. `ru.title`: the board's "Name (Russian)", tidied in QARAVAN's voice.
- `about`: one short line in each language, about 35–56 characters, condensed from the board's "Short description". The Russian line in QARAVAN's voice (the qaravan-voice skill), the English one written as natural English, not word for word. Don't repeat the title.
- `place`: `Venue, Neighborhood` (`Kvartira Books, Crown Heights` / `Kvartira Books, Краун-Хайтс`). Trips: `Meeting point: Grand Central` / `Сбор: Grand Central`. Private address: the neighborhood only.
- `link`: the Partiful link (support groups link to their intake form).
- Never edit `ARCHIVE` by hand.
- Source of event details: the monday.com board "QARAVAN's Event Calendar" (id 4774572020), month groups like "October 2026". If the user's details conflict with the board or Partiful, go with the user and point out the conflict.

## Design

The page follows the QARAVAN design system (the org's default Design System artifact, 2026-09 revision): Fira Sans / Fira Sans Condensed from `assets/fonts/`, the official wordmark files in `assets/` (never redraw or retype the logo), white page, square hairline cards, brand colours only as category flags, ink text, no emoji. Check a layout change against the design system before proposing it.
