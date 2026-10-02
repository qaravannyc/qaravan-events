# AGENTS.md: qaravan-events (events.qaravan.org)

Read this whole file before you change anything here. Claude Code reads it
through `CLAUDE.md`; Codex, Cursor, Copilot, Gemini and other agents read it
directly. It holds the owner's rules for this repository and the contracts
other QARAVAN systems rely on. Keep it true: see "Keeping this file live".

## QARAVAN's three repositories

| Repository | What it is | Runs on |
| - | - | - |
| `qaravannyc/qaravan-events` (this one) | events.qaravan.org: the events page, its `EVENTS` and `ARCHIVE` lists, the embeds on qaravan.org, the `.ics` calendar feeds, the link-in-bio page `/bio/` | GitHub Pages from `main`; the bio page's backend (`bio-worker/`) on a Cloudflare Worker deployed from events-robot |
| `qaravannyc/events-robot` | Robots between Partiful, monday.com, Gmail, Google Photos and Slack; the Telegram bot @qaravan_door_bot, which reads this page every hour | GitHub Actions, Cloudflare Workers |
| `qaravannyc/qaravan-forms` | feedback.qaravan.org: feedback and survey forms, photo upload, support-group intake forms, monday webhooks | Vercel |

## What other systems depend on here

**`EVENTS` is an API, not only page content.** The Telegram bot in
`events-robot` (`telegram/worker.mjs`: `extractEvents`, `normalizeEvent`)
downloads https://events.qaravan.org/ every hour and parses `EVENTS` out of the
HTML. From it the bot builds the monthly and weekly overviews, the day-before
reminders in the community chat and the private-message reminders. A push here
is live in about a minute; nobody reviews what the bot then sends.

- Current item shape: `{ dates, time, type, en: { title, about, place }, ru: { title, about, place }, link }`, optional `end`. The bot also still reads the older shape (`title`, a Russian line in `ru`, `meta` with time and place).
- The list starts with the exact text `const EVENTS = [` and ends at the first line that begins with `];`. No line inside it may begin with `];`. `EVENTS` stays above `ARCHIVE`, inline in `index.html` at `/`.
- Inside the list only literals: objects, arrays, quoted strings, numbers, `true`, `false`, `null`, comments, trailing commas. No variables, function calls, `+`, template strings, or line breaks inside a string: the bot's parser rejects them.
- Every date is `"YYYY-MM-DD"`. One bad date makes the bot reject the whole list. `time` is `"HH:MM"`, 24-hour, New York time.
- Identity: the bot finds an event's monday row by `link` or by `en.title` (the board item's name) and remembers sent reminders by date plus `link`. Changing the link or English title of an event that already got reminders can make the bot remind again. The `.ics` UID depends on date, time, link and type.

**Changing the shape of an item** (a field renamed, moved, added as required,
or its format changed) needs, in the same piece of work: `normalizeEvent` and
`telegram/worker.test.mjs` in events-robot, merged and deployed before this
page changes; here `robot/archive-past.mjs` (`TYPES`, `LANG_KEYS`, `KEYS`,
`checkEvent`, the serializers), `robot/build-calendar.mjs`, the page code
(`text()`, `typeOf()`, `TYPES`, `card()`, `render()`), every `ARCHIVE` item,
`README.md`, the instructions inside `index.html`, and this file. The list of
types lives in three places: `index.html`, `archive-past.mjs`,
`build-calendar.mjs`. If you can't change events-robot, stop and tell the user
exactly what the bot will lose.

**URLs other people and systems hold:**
- `/qaravan-events-en.ics` and `/qaravan-events-ru.ics`: every calendar subscription is tied to them. Never rename.
- `?embed=1&lang=en` (qaravan.org home) and `?embed=page` (qaravan.org/events): the embed code lives on Wix, not here. Keep both parameters and `lang` working.
- Support-group `link`s point to `https://feedback.qaravan.org/support/<name>`, served by qaravan-forms (`gina` and `simon` exist). Don't link a new name there before the form exists.
- The page links the bot as `https://t.me/qaravan_door_bot`; a plain `/start` opens the reminder settings.
- `https://events.qaravan.org/bio/`: the link in the Instagram bio of @qaravan_org. Keep the path. (There is no qaravan.org/insta or other short address for it.)

## What this repository depends on

- Content: the monday.com board "QARAVAN's Event Calendar" (id 4774572020) is where event details come from (Category to `type`, "Name (Russian)" to `ru.title`, "Short description" to `about`). No code here reads monday.
- qaravan-forms for the `/support/<name>` intake pages; Partiful for event links.
- Cloudflare Worker `qaravan-bio` at https://qaravan-bio.jolly-bar-b5ed.workers.dev (QARAVAN's Cloudflare account, the same one as the Telegram bot; KV namespace `qaravan-bio-links`, binding `BIO`) stores the `/bio/` link list and the team password. Its code is `bio-worker/worker.mjs` here, but it is deployed by the `bio worker` workflow in events-robot (`bio/deploy.mjs`, with that repo's `CLOUDFLARE_API_TOKEN`), which takes the file from this repo's `main`. After changing `bio-worker/worker.mjs`, push here, then run that workflow (it also runs on changes to its own files there).
- No secrets in this repository. Both workflows use only `GITHUB_TOKEN`. The bio password is kept only as a salted hash in the Worker's KV: never write the password into a file, a commit, a page, a log or a workflow input.

## Robots and schedules

- `.github/workflows/archive-past.yml`: cron `30 8 * * *` (UTC), but GitHub starts it late, in practice between about 8:30 AM and 1 PM New York. It runs `robot/archive-past.mjs` (moves past dates from `EVENTS` into `ARCHIVE`, rewrites both lists in a fixed format and drops comments inside them), then `robot/build-calendar.mjs`, and commits `index.html` and both feeds to `main`. Past events stay on the page until it runs.
- `.github/workflows/calendar.yml`: on a push to `main` touching `index.html` or `robot/build-calendar.mjs`, rebuilds the feeds and commits them if they changed.

## Checks before every push

- `DRY_RUN=1 node robot/archive-past.mjs` (validates `EVENTS`; `ARCHIVE` items only on days something moves) and `TODAY=2099-01-01 DRY_RUN=1 node robot/archive-past.mjs` (validates every item).
- `CHECK=1 node robot/build-calendar.mjs` exits 1 when the feeds are stale; `node robot/build-calendar.mjs` rebuilds them.
- `node --test bio-worker/worker.test.mjs` when `bio-worker/` or `bio/` changed (the worker's password, versions and validation rules).
- When `EVENTS` changed and events-robot is checked out next to this repo, the bot must still read every event:
  `node --input-type=module -e "import { extractEvents } from '../events-robot/telegram/worker.mjs'; import fs from 'node:fs'; const e = extractEvents(fs.readFileSync('index.html', 'utf8')); const bad = e.filter((x) => !x.title || !x.meta); console.log(e.length, 'events,', bad.length, 'unreadable'); if (bad.length) process.exit(1);"`

## Incidents and the rule each one taught

- 2026-09-30, commit e7b50c2: `EVENTS` items moved to the bilingual shape. The robots and docs here were updated, the Telegram bot was not. It showed events without names, and its 6 PM run sent subscribers a private reminder about two October 3 events with no titles or times. Rule: the item shape is a contract with events-robot (see above).

## Keeping this file live

- Change this file in the same commit as anything it describes: an `EVENTS` field or format, a URL others hold, a workflow or schedule, an owner's rule.
- When the change affects another repository listed above, change that repository too, or tell the user exactly what will break there. Update that repository's `AGENTS.md` section about this one.
- After something breaks, add one line under Incidents: the date, what broke, the rule it taught.
- Write only what an agent can't learn quickly from the code: contracts, who reads what, IDs, schedules, rules and their reasons. No changelog, no tutorials. Delete lines that stop being true. Keep the file under about 200 lines.

## The owner's rules for this repository

### Publishing: straight to `main`, no pull requests

The repo owner has given standing, explicit permission to push directly to `main` — the branch the site is published from. This holds even when your session was assigned a `claude/...` branch: commit there if you like, then push the same commit with `git push origin HEAD:main`. Don't open a pull request and don't leave the change waiting on a branch: nobody wants to merge anything by hand.

Nothing reviews the change after you, so before pushing:

1. `git fetch origin main` and rebase onto it — the archive robot commits to `main` every night.
2. `DRY_RUN=1 node robot/archive-past.mjs` must run without an error (it proves `EVENTS` and `ARCHIVE` still parse and every event has both its `en` and `ru` halves). Then `node robot/build-calendar.mjs` to rebuild the calendar feeds in the same commit (the calendar Action would otherwise commit them right after your push).
3. Never force-push `main`. If the push is rejected, fetch, rebase and push again.
4. After 1–2 minutes, check the live page: `curl -s https://events.qaravan.org/ | grep "<new event title>"`.

Changes beyond the events list (the robot, workflows, page layout) also go to `main` without a PR, but describe them to the user and get a go-ahead in chat first.

### Adding an event

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

### Design

The page follows the QARAVAN design system (the org's default Design System artifact, 2026-09 revision): Fira Sans / Fira Sans Condensed from `assets/fonts/`, the official wordmark files in `assets/` (never redraw or retype the logo), white page, square hairline cards, brand colours only as category flags, ink text, no emoji. Check a layout change against the design system before proposing it.

`?embed=1` (qaravan.org home) and `?embed=page` (qaravan.org/events) are one component: white cards straight on the Wix section (no background, no scrollbar), every card the same size (the tallest of all upcoming and past events at that width), descriptions in full. It shows as many whole rows as fit the Wix box and pages through the rest in place with «Ещё N событий» / «Назад» — no new tabs. Home adds a white-strip heading «Ближайшие события / Events calendar» with the count; the events page adds «Ближайшие / Прошедшие» tabs and the type filter (its heading is Wix's). RU / EN switch top right; `lang=en` in the Wix code is the default. First layout waits for the fonts (max 2.5 s), then the cards rise in (off with reduced motion). Under the cards, on the same grid as the cards (each button under a card column), sit «Подпишитесь на нас в» / «Follow us on» plus the white Partiful logo `assets/partiful-logo.png` (from Partiful's own site, only scaled down; never recolour or redraw it) on the ink button and «Получайте напоминания в Telegram» (Маргоша on the left, the official Telegram logo file unmodified on the right, never merged with the mascot; the bot's name is «Qaravan Bot Margosha (they/them)», keep copy gender-neutral). Box heights at ~970px wide: home 740px = 6 cards, 1060px = 9, 1370px = all 11; events page 800 / 1110 / 1420px; mobile (~260px wide) home ≈1310px = 3 cards. After any change to cards or embeds, test both at 240–1280px wide and several heights, both languages, every page of the pager, nothing cut.

### Calendar feeds

`qaravan-events-en.ics` and `qaravan-events-ru.ics` (calendar name «Qaravan Events») are built by `robot/build-calendar.mjs` from `EVENTS` + `ARCHIVE`: one event per date, the `about` line, a request to register and the Partiful link on its own line. `.github/workflows/calendar.yml` rebuilds them on every push that changes `index.html`; the nightly robot rebuilds them too. Keep the two URLs forever (every subscription is tied to them). Optional `end: "21:00"` on an event sets its end time in the feeds (default: 2 hours). The feeds start at `FROM = "2026-08-01"` in the script: the history before it (imported from Partiful into `ARCHIVE`) stays on the page but out of subscribers' calendars.

### Counting subscribers and clicks

`COUNTER` in `index.html` is the GoatCounter site code (`qaravan` means https://qaravan.goatcounter.com); empty switches counting off. It counts views of the page and both embeds (`/`, `/embed/home`, `/embed/events`), opening the calendar panel (`calendar-open`), each way to subscribe with the feed language (`calendar-google-en`, `calendar-apple-ru`, `calendar-outlook-…`, `calendar-copy-…`), Partiful (`partiful-follow`) and Telegram (`telegram-reminders`) clicks, and `calendar-unique-people` / `partiful-unique-people` / `telegram-unique-people`, sent once per device (a localStorage flag) to count different people. No cookies, no personal data, nothing under Do Not Track / Global Privacy Control or outside events.qaravan.org. Never add Google Analytics or anything that identifies a person: this community's privacy comes first. To count another button, give it `data-count="name"` (plus `data-once="name"` for a once-per-device count) and a title in `COUNT_TITLES`.

### Link in bio (`/bio/`)

`bio/index.html` is the Instagram bio page: wordmark, RU / EN switch, one narrow column of links, nothing else. The team edits it in the browser (footer button "Edit links" or `/bio/#edit`), not in git. The list lives in the Worker's KV (`bio-worker/worker.mjs`: `GET /links` and `GET /status` public, `POST /setup` once, `POST /login`, `POST /password`, `PUT /links`, `GET /history`); `bio/links.json` is only the first list and the fallback when the Worker is unreachable or empty.

- Item: `{ id, type: "link" | "heading", title: {en, ru}, url, note: {en, ru}, badge: {en, ru}, tier: "feature" | "standard" | "quiet", flag, hidden, from, until }`. A missing language falls back to the other. `from` / `until` are inclusive New York dates; the Worker also drops hidden and out-of-schedule items from the public list. The shape is validated in `validateItems` (Worker) and `normalize` (page): change both together, and the tests.
- Importance (`tier`) is the "highlight" control: featured is the ink button, standard the framed card, quiet a line of text. `flag` is one brand colour square, the only use of colour. Every card carries the same safety rules as the events page: no emoji, no middle dot, no RUSA.
- Password: one shared team password, at least 8 characters. KV keeps `auth` = a random salt and an HMAC of the password, never the password. `POST /setup` set the first one (it refuses once a password exists); the team changes it in the editor ("Change password", `POST /password`, needs the current one). Lost password: delete the `auth` key in the KV namespace in the Cloudflare dashboard and call `/setup` again. The Worker issues a 12 hour token (HMAC keyed by the stored hash, so a new password signs everybody out), allows 8 wrong tries per 15 minutes per hashed IP, keeps the last 40 versions with who and when, and answers 409 when two people publish over each other.
- No "Russian" anywhere on the bio page (the owner's rule, 2026-10-02): no tagline under the handle, and the editor labels the two languages RU / EN.
- Page code renders every team-written string as text (`h()`), accepts only http(s) addresses, and sets no cookies. `API_URL` in `bio/index.html` is the Worker address (empty = the page is read-only and shows `links.json`). The page counts clicks through the same GoatCounter `COUNTER` rules as `index.html` (`bio-link-<title>`, `bio-unique-people`; off while editing).
- Try it locally with no Cloudflare account: `EDIT_PASSWORD=test-password node bio-worker/dev-server.mjs`, open http://localhost:8787/bio/.
- If the page moves to another domain, add it to `ALLOWED_ORIGINS` in events-robot `bio/deploy.mjs` and run the `bio worker` workflow.

Never use RUSA anywhere (links, text, handles): the organization is QARAVAN. Telegram: https://t.me/+KkHErPk38VA3Yzgy

Never use the middle dot (`·`, `•`) anywhere: not as a separator, not in titles, labels, feeds or comments. Write a sentence, a comma, a slash between the two languages, or a muted second line instead.
