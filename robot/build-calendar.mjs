// Календарь «Qaravan Events» для подписки в Google, Apple и Outlook: два файла —
// qaravan-events-en.ics (по-английски) и qaravan-events-ru.ics (по-русски) в корне сайта.
// Читает те же списки EVENTS и ARCHIVE из index.html, что и страница: каждая дата —
// отдельное событие (у группы поддержки — по событию на каждую встречу), в описании —
// строка о событии, просьба зарегистрироваться и прямая ссылка на страницу в Partiful.
//
// Длительность: если у события есть end ("21:00") — до этого времени, иначе 2 часа.
// Запускается сам (.github/workflows/calendar.yml) после каждого изменения index.html.
// Вручную: node robot/build-calendar.mjs   (CHECK=1 — только проверить, что файлы свежие)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import vm from "node:vm";

const ROOT = new URL("../", import.meta.url);
const html = readFileSync(new URL("index.html", ROOT), "utf8");

function extract(name) {
  const at = html.indexOf(`const ${name} = [`);
  if (at < 0) throw new Error(`В index.html не найден список ${name}`);
  const start = html.indexOf("[", at), close = html.indexOf("\n];", start);
  if (close < 0) throw new Error(`Не найден конец списка ${name}`);
  return vm.runInNewContext("(" + html.slice(start, close + 2) + ")", Object.create(null), { timeout: 1000 });
}
const events = [...extract("EVENTS"), ...extract("ARCHIVE").flatMap(m => m.events || [])];

const TYPES = { support: "Support groups", community: "Community", resources: "Resource navigation", culture: "Education & culture", action: "Action & pride" };
const TEXT = {
  en: {
    desc: "QARAVAN community events in New York. New events appear here automatically.",
    register: "Please register in advance, it helps us plan:",
    apply: "To join, fill in the short form:",
    more: "All our events:",
  },
  ru: {
    desc: "События сообщества QARAVAN в Нью-Йорке. Новые события появляются здесь сами.",
    register: "Пожалуйста, зарегистрируйтесь заранее, так нам проще всё подготовить:",
    apply: "Чтобы присоединиться, заполните короткую анкету:",
    more: "Все наши события:",
  },
};
const ALL_EVENTS = { en: "https://www.qaravan.org/events", ru: "https://www.qaravan.org/events" };

// RFC 5545: экранирование текста и перенос строк длиннее 75 байт (не разрывая UTF-8)
const esc = s => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n");
function fold(line) {
  const out = []; let cur = "", bytes = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch);
    if (bytes + b > (out.length ? 74 : 75)) { out.push(cur); cur = ""; bytes = 0; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join("\r\n ");
}
const pad = n => String(n).padStart(2, "0");
const local = (date, time) => date.replace(/-/g, "") + "T" + (time || "00:00").split(":").map(pad).join("") + "00";

// Нью-Йорк: правила перехода на летнее время США с 2007 года
const VTIMEZONE = [
  "BEGIN:VTIMEZONE", "TZID:America/New_York", "X-LIC-LOCATION:America/New_York",
  "BEGIN:DAYLIGHT", "TZOFFSETFROM:-0500", "TZOFFSETTO:-0400", "TZNAME:EDT", "DTSTART:19700308T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU", "END:DAYLIGHT",
  "BEGIN:STANDARD", "TZOFFSETFROM:-0400", "TZOFFSETTO:-0500", "TZNAME:EST", "DTSTART:19701101T020000", "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU", "END:STANDARD",
  "END:VTIMEZONE",
];

function build(lang) {
  const t = TEXT[lang];
  const perDate = events.flatMap(e => [...new Set(e.dates)].sort().map(d => ({ e, d })))
    .sort((a, b) => a.d.localeCompare(b.d) || String(a.e.time || "").padStart(5, "0").localeCompare(String(b.e.time || "").padStart(5, "0")));
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//QARAVAN//Qaravan Events//" + lang.toUpperCase(), "CALSCALE:GREGORIAN",
    "NAME:Qaravan Events", "X-WR-CALNAME:Qaravan Events", "DESCRIPTION:" + esc(t.desc), "X-WR-CALDESC:" + esc(t.desc),
    "X-WR-TIMEZONE:America/New_York", "REFRESH-INTERVAL;VALUE=DURATION:PT6H", "X-PUBLISHED-TTL:PT6H",
    ...VTIMEZONE,
  ];
  for (const { e, d } of perDate) {
    const half = e[lang] || e.en || {}, link = String(e.link || "");
    // UID не меняется от правки текста: дата, время, ссылка и язык файла
    const id = createHash("sha1").update(link + "|" + (e.type || "")).digest("hex").slice(0, 10);
    const hhmm = String(e.time || "allday").replace(":", "");
    const cta = e.type === "support" ? t.apply : t.register;
    const description = [half.about, "", cta, link, "", t.more, ALL_EVENTS[lang]].filter(x => x != null).join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${d}-${hhmm}-${id}-${lang}@events.qaravan.org`,
      "DTSTAMP:20260930T000000Z",
      e.time ? `DTSTART;TZID=America/New_York:${local(d, e.time)}` : `DTSTART;VALUE=DATE:${d.replace(/-/g, "")}`,
      e.time && e.end ? `DTEND;TZID=America/New_York:${local(d, e.end)}` : e.time ? "DURATION:PT2H" : "DURATION:P1D",
      "SUMMARY:" + esc(half.title || ""),
      "LOCATION:" + esc(half.place || ""),
      "DESCRIPTION:" + esc(description),
      "URL:" + link,
      "CATEGORIES:" + esc(TYPES[e.type] || "Community"),
      "STATUS:CONFIRMED",
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

let stale = 0;
for (const lang of ["en", "ru"]) {
  const file = new URL(`qaravan-events-${lang}.ics`, ROOT), out = build(lang);
  const same = existsSync(file) && readFileSync(file, "utf8") === out;
  if (process.env.CHECK === "1") { if (!same) { stale++; console.log(`устарел: qaravan-events-${lang}.ics`); } continue; }
  if (!same) writeFileSync(file, out);
  console.log(`${same ? "без изменений" : "обновлён"}: qaravan-events-${lang}.ics (${out.split("BEGIN:VEVENT").length - 1} событий)`);
}
if (stale) { console.log("Запустите node robot/build-calendar.mjs"); process.exit(1); }
