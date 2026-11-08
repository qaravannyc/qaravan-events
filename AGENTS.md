# AGENTS.md: qaravan-events (the retired events.qaravan.org)

Read this whole file before you change anything here. Claude Code reads it
through `CLAUDE.md`; Codex, Cursor, Copilot, Gemini and other agents read it
directly. It holds the owner's rules for this repository and the contracts
other QARAVAN systems rely on. Keep it true: see "Keeping this file live".

## QARAVAN's repositories

| Repository | What it is | Runs on |
| - | - | - |
| `qaravannyc/qaravan-events` (this one) | Retired (owner, 2026-11-07: "kill events.qaravan.org"). Holds the code of the bio page's server (`bio-worker/`) and the old events page's files as a record; nothing here is served | the bio server on a Cloudflare Worker deployed from events-robot; GitHub Pages no longer has a custom domain |
| `qaravannyc/qaravan-site` | www.qaravan.org, and since 2026-11-07 events.qaravan.org too (a custom domain of its Worker) | Cloudflare Worker `qaravan-site` |
| `qaravannyc/events-robot` | Robots between Partiful, monday.com, Gmail, Google Photos and Slack; the Telegram bot @qaravan_door_bot | GitHub Actions, Cloudflare Workers |
| `qaravannyc/qaravan-forms` | feedback.qaravan.org: feedback and survey forms, photo upload, support-group intake forms, monday webhooks | Vercel |

## Where everything went (2026-11-07)

- **events.qaravan.org** is a custom domain of qaravan-site's Worker (`routes` in its wrangler.jsonc, `EVENTS_HOST` in its worker/index.mjs). It answers `/qaravan-events-en.ics` and `/qaravan-events-ru.ics` itself and sends every other address by 301 to its page on www.qaravan.org: `/` to /events/ (or /ru/events/), `/bio/`, `/newsletter/oct13/`, `/oct27/`, `/quiz/`, `/oct19/` to /files/ucheba-v-ssha.pdf, anything else to /events/.
- **The calendar feeds** are made by qaravan-site (`worker/calendar-feed.mjs`, a port of `robot/build-calendar.mjs` here) from qaravan.org's events and the history in its `worker/calendar-archive.json` (copied from `ARCHIVE` here). Every event keeps the UID this repo gave it, so subscribers see no duplicates.
- **The Telegram bot** reads https://www.qaravan.org/data/site-events.json (events-robot `eventsFromSite`), not this repo.
- **The pages** `/bio/`, `/newsletter/oct13/`, `/oct27/` and `/quiz/` and the PDF guide live in qaravan-site (`site/bio/`, `site/newsletter/oct13/`, `site/oct27/`, `site/quiz/`, `site/files/ucheba-v-ssha.pdf`). The copies here are the old ones, served nowhere: a change to them never reaches anyone. Change the qaravan-site files instead.
- **Events** are made and edited on qaravan.org only (Site management, Events). `EVENTS` and `ARCHIVE` in `index.html` stopped on 2026-11-07 and nothing reads them. The robots that kept them (`archive-past.yml`, `calendar.yml`) are gone; their scripts stay in `robot/` as a record.

## What still depends on this repository

- **The bio page's server.** Cloudflare Worker `qaravan-bio` at https://qaravan-bio.jolly-bar-b5ed.workers.dev (QARAVAN's Cloudflare account, the same one as the Telegram bot; KV namespace `qaravan-bio-links`, binding `BIO`) stores the `/bio/` link list and the team password. Its code is `bio-worker/worker.mjs` here; the `bio worker` workflow in events-robot (`bio/deploy.mjs`, with that repo's `CLOUDFLARE_API_TOKEN`) deploys the file from this repo's `main`. After changing `bio-worker/worker.mjs`, push here, then run that workflow. The page that uses it is qaravan-site's `site/bio/`; the origins the server accepts are `ORIGINS` in events-robot `bio/deploy.mjs` (www.qaravan.org, qaravan.org, events.qaravan.org).
- No secrets in this repository. The bio password is kept only as a salted hash in the Worker's KV: never write the password into a file, a commit, a page, a log or a workflow input.

## Checks before every push

- `node --test bio-worker/worker.test.mjs` when `bio-worker/` changed (the worker's password, versions and validation rules).

## Incidents and the rule each one taught

- 2026-11-05: after qaravan.org moved to the new site, `EVENTS` links still pointed to the old `qaravan-site.jolly-bar-b5ed.workers.dev` host, and the Telegram bot posted them. Rule: event links use https://www.qaravan.org only.
- 2026-09-30, commit e7b50c2: `EVENTS` items moved to the bilingual shape. The robots and docs here were updated, the Telegram bot was not. It showed events without names, and its 6 PM run sent subscribers a private reminder about two October 3 events with no titles or times. Rule: the item shape is a contract with events-robot (see above).

## Keeping this file live

- Change this file in the same commit as anything it describes: the bio server's contract, a URL others hold, an owner's rule.
- When the change affects another repository listed above, change that repository too, or tell the user exactly what will break there. Update that repository's `AGENTS.md` section about this one.
- After something breaks, add one line under Incidents: the date, what broke, the rule it taught.
- Write only what an agent can't learn quickly from the code: contracts, who reads what, IDs, schedules, rules and their reasons. No changelog, no tutorials. Delete lines that stop being true. Keep the file under about 200 lines.

## The owner's rules for this repository

### Talking to the owner

Owner, 2026-11-08 ("speak like that always, in all chats"): everything you write to the owner is in plain, everyday language. Say what happens, to whom and when, in short sentences, the way you would explain it to someone who doesn't build websites. Example: "When someone signs in, the site remembers them on that phone or computer for 90 days. After 90 days, it asks them to sign in again with a new code." Not: "the session runs out after 90 days." No jargon, code names or file names unless the owner asks for them; when a technical word can't be avoided, say what it means in the same sentence. This holds in every chat, in all four QARAVAN repositories.

### Publishing: straight to `main`, no pull requests

The repo owner has given standing, explicit permission to push directly to `main`. This holds even when your session was assigned a `claude/...` branch: commit there if you like, then push the same commit with `git push origin HEAD:main`. Don't open a pull request. Never force-push `main`. A change beyond the bio server's code needs the user's go-ahead in chat first.

### Adding or changing an event

Never here. Events are added, edited, moved and canceled on qaravan.org (Site management, Events, or the event page's own tools): qaravan-site's `content/events/<id>.json` and its AGENTS.md.

### Link in bio (`/bio/`)

The Instagram bio page is https://www.qaravan.org/bio/ (qaravan-site `site/bio/index.html`; events.qaravan.org/bio/ redirects there): wordmark, RU / EN switch, one narrow column of links, nothing else. The team edits it in the browser (footer button "Edit links" or `/bio/#edit`), not in git. The list lives in the Worker's KV (`bio-worker/worker.mjs`: `GET /links` and `GET /status` public, `POST /setup` once, `POST /login`, `POST /password`, `PUT /links`, `GET /history`); the page's `links.json` (qaravan-site `site/bio/links.json`) is only the fallback when the Worker is unreachable or empty; the live list in KV is the team's to change.

- Item: `{ id, type: "link" | "heading", title: {en, ru}, url, note: {en, ru}, badge: {en, ru}, tier: "feature" | "standard" | "quiet", flag, hidden, from, until }`. A missing language falls back to the other. `from` / `until` are inclusive New York dates; the Worker also drops hidden and out-of-schedule items from the public list. The shape is validated in `validateItems` (Worker, here) and `normalize` (the page, in qaravan-site): change both together, and the tests.
- Importance (`tier`) is the "highlight" control: featured is the ink button, standard the framed card, quiet a line of text. `flag` is one brand colour square, the only use of colour. Every card carries the same safety rules as qaravan.org's events: no emoji, no middle dot, no RUSA.
- Password: one shared team password, at least 8 characters. KV keeps `auth` = a random salt and an HMAC of the password, never the password. `POST /setup` set the first one (it refuses once a password exists); the team changes it in the editor ("Change password", `POST /password`, needs the current one). Lost password: delete the `auth` key in the KV namespace in the Cloudflare dashboard and call `/setup` again. The Worker issues a 12 hour token (HMAC keyed by the stored hash, so a new password signs everybody out), allows 8 wrong tries per 15 minutes per hashed IP, keeps the last 40 versions with who and when, and answers 409 when two people publish over each other.
- No "Russian" anywhere on the bio page (the owner's rule, 2026-10-02): no tagline under the handle, and the editor labels the two languages RU / EN.
- The page renders every team-written string as text (`h()`), accepts only http(s) addresses, and sets no cookies; `API_URL` in it is this Worker's address.
- Try the Worker locally with no Cloudflare account: `EDIT_PASSWORD=test-password node bio-worker/dev-server.mjs`, open http://localhost:8787/bio/ (it serves the old copy of the page in `bio/` here).
- If the page moves to another domain, add it to `ORIGINS` in events-robot `bio/deploy.mjs` and run the `bio worker` workflow.

Never use RUSA anywhere (links, text, handles): the organization is QARAVAN. Telegram: https://t.me/+KkHErPk38VA3Yzgy

Never use the middle dot (`·`, `•`) anywhere: not as a separator, not in titles, labels, feeds or comments. Write a sentence, a comma, a slash between the two languages, or a muted second line instead.
