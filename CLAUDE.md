# events.qaravan.org

Static page (`index.html`) served by GitHub Pages from `main`. How the page and the nightly archive robot work: see `README.md`.

## Publishing: straight to `main`, no pull requests

The repo owner has given standing, explicit permission to push directly to `main` — the branch the site is published from. This holds even when your session was assigned a `claude/...` branch: commit there if you like, then push the same commit with `git push origin HEAD:main`. Don't open a pull request and don't leave the change waiting on a branch: nobody wants to merge anything by hand.

Nothing reviews the change after you, so before pushing:

1. `git fetch origin main` and rebase onto it — the archive robot commits to `main` every night.
2. `DRY_RUN=1 node robot/archive-past.mjs` must run without an error (it proves `EVENTS` and `ARCHIVE` still parse and every event has both its `en` and `ru` halves). Then `node robot/build-calendar.mjs` to rebuild the calendar feeds in the same commit (the calendar Action would otherwise commit them right after your push).
3. Never force-push `main`. If the push is rejected, fetch, rebase and push again.
4. After 1–2 minutes, check the live page: `curl -s https://events.qaravan.org/ | grep "<new event title>"`.

Changes beyond the events list (the robot, workflows, page layout) also go to `main` without a PR, but describe them to the user and get a go-ahead in chat first.

## Adding an event

The page is bilingual with a RU / EN switch: every event carries a complete English half and a complete Russian half. Neither language is a translation afterthought.

- One block in `EVENTS`, in date order: `{ dates, time, type, en: { title, about, place }, ru: { title, about, place }, link }`. Same date: earlier `time` first.
- `dates`: `["2026-10-10"]`; a recurring group keeps all its dates in one block, and every calendar (page and embeds) shows each date as its own card.
- `time`: start time, 24-hour, `"17:00"` (trips: the meeting time). The page renders `17:00` in Russian and `5:00 PM` in English.
- `type`: the board's Category column: `support` (Support & wellbeing), `community`, `resources` (Resource navigation), `culture` (Education & culture), `action` (Action & pride). It sets the card's colour flag, per the design system.
- `en.title`: the English event name from Partiful, without emoji. `ru.title`: the board's "Name (Russian)", tidied in QARAVAN's voice.
- `about`: the event's short description in each language, up to 280 characters; every card shows it in full (the robot rejects longer ones). Use the user's text when they give one; otherwise condense the board's "Short description". The Russian in QARAVAN's voice (the qaravan-voice skill), the English written as natural English, not word for word. Don't repeat the title.
- `place`: `Venue, Neighborhood` (`Kvartira Books, Crown Heights` / `Kvartira Books, Краун-Хайтс`). Trips: `Meeting point: Grand Central` / `Сбор: Grand Central`. Private address: the neighborhood only.
- `link`: the Partiful link (support groups link to their intake form).
- Never edit `ARCHIVE` by hand.
- Source of event details: the monday.com board "QARAVAN's Event Calendar" (id 4774572020), month groups like "October 2026". If the user's details conflict with the board or Partiful, go with the user and point out the conflict.

## Design

The page follows the QARAVAN design system (the org's default Design System artifact, 2026-09 revision): Fira Sans / Fira Sans Condensed from `assets/fonts/`, the official wordmark files in `assets/` (never redraw or retype the logo), white page, square hairline cards, brand colours only as category flags, ink text, no emoji. Check a layout change against the design system before proposing it.

`?embed=1` (qaravan.org home) and `?embed=page` (qaravan.org/events) are one component: white cards straight on the Wix section (no background, no scrollbar), every card the same size (the tallest of all upcoming and past events at that width), descriptions in full. It shows as many whole rows as fit the Wix box and pages through the rest in place with «Ещё N событий» / «Назад» — no new tabs. Home adds a white-strip heading «Ближайшие события / Events calendar» with the count; the events page adds «Ближайшие / Прошедшие» tabs and the type filter (its heading is Wix's). RU / EN switch top right; `lang=en` in the Wix code is the default. First layout waits for the fonts (max 2.5 s), then the cards rise in (off with reduced motion). Under the cards, on the same grid as the cards (each button under a card column), sit «Подпишитесь на нас в» / «Follow us on» plus the white Partiful logo `assets/partiful-logo.png` (from Partiful's own site, only scaled down; never recolour or redraw it) on the ink button and «Получайте напоминания в Telegram» (Маргоша on the left, the official Telegram logo file unmodified on the right, never merged with the mascot; the bot's name is «Qaravan Bot Margosha (they/them)», keep copy gender-neutral). Box heights at ~970px wide: home 740px = 6 cards, 1060px = 9, 1370px = all 11; events page 800 / 1110 / 1420px; mobile (~260px wide) home ≈1310px = 3 cards. After any change to cards or embeds, test both at 240–1280px wide and several heights, both languages, every page of the pager, nothing cut.

## Calendar feeds

`qaravan-events-en.ics` and `qaravan-events-ru.ics` (calendar name «Qaravan Events») are built by `robot/build-calendar.mjs` from `EVENTS` + `ARCHIVE`: one event per date, the `about` line, a request to register and the Partiful link on its own line. `.github/workflows/calendar.yml` rebuilds them on every push that changes `index.html`; the nightly robot rebuilds them too. Keep the two URLs forever (every subscription is tied to them). Optional `end: "21:00"` on an event sets its end time in the feeds (default: 2 hours). The feeds start at `FROM = "2026-08-01"` in the script: the history before it (imported from Partiful into `ARCHIVE`) stays on the page but out of subscribers' calendars.

## Counting subscribers and clicks

`COUNTER` in `index.html` is the GoatCounter site code (`qaravan` means https://qaravan.goatcounter.com); empty switches counting off. It counts views of the page and both embeds (`/`, `/embed/home`, `/embed/events`), opening the calendar panel (`calendar-open`), each way to subscribe with the feed language (`calendar-google-en`, `calendar-apple-ru`, `calendar-outlook-…`, `calendar-copy-…`), Partiful (`partiful-follow`) and Telegram (`telegram-reminders`) clicks, and `calendar-unique-people` / `partiful-unique-people` / `telegram-unique-people`, sent once per device (a localStorage flag) to count different people. No cookies, no personal data, nothing under Do Not Track / Global Privacy Control or outside events.qaravan.org. Never add Google Analytics or anything that identifies a person: this community's privacy comes first. To count another button, give it `data-count="name"` (plus `data-once="name"` for a once-per-device count) and a title in `COUNT_TITLES`.

Never use RUSA anywhere (links, text, handles): the organization is QARAVAN. Telegram: https://t.me/+KkHErPk38VA3Yzgy

Never use the middle dot (`·`, `•`) anywhere: not as a separator, not in titles, labels, feeds or comments. Write a sentence, a comma, a slash between the two languages, or a muted second line instead.
