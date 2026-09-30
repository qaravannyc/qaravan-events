// Ночной робот events.qaravan.org: убирает прошедшие события из списка EVENTS
// в index.html и складывает их в ARCHIVE по месяцам, чтобы наверху страницы
// оставались только те, что ещё впереди. У события с несколькими датами
// прошедшие даты уезжают в архив, будущие остаются в карточке.
//
// Запускается по расписанию из .github/workflows/archive-past.yml. Трогает
// только два списка в index.html, всё остальное в файле остаётся как было.
//
// Вручную: node robot/archive-past.mjs
//   TODAY=2026-10-01 — притвориться, что сегодня другой день (Нью-Йорк)
//   DRY_RUN=1        — только показать, что переедет, файл не записывать
import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";

const FILE = new URL("../index.html", import.meta.url);
const today = process.env.TODAY || new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error(`TODAY должен быть вида ГГГГ-ММ-ДД, а не «${today}»`);

// Находит `const NAME = [ … ];` в html и возвращает границы литерала и его значение.
function extract(html, name) {
  const at = html.indexOf(`const ${name} = [`);
  if (at < 0) throw new Error(`В index.html не найден список ${name}`);
  const start = html.indexOf("[", at);
  const close = html.indexOf("\n];", start);
  if (close < 0) throw new Error(`Не найден конец списка ${name} («];» в начале строки)`);
  const end = close + 2;
  let value;
  try {
    value = vm.runInNewContext("(" + html.slice(start, end) + ")", Object.create(null), { timeout: 1000 });
  } catch (e) {
    throw new Error(`Список ${name} не читается (лишняя запятая или кавычка?): ${e.message}`);
  }
  if (!Array.isArray(value)) throw new Error(`${name} должен быть списком`);
  return { start, end, value };
}

function checkDates(e, where) {
  if (!Array.isArray(e.dates) || !e.dates.length || !e.dates.every(d => /^\d{4}-\d{2}-\d{2}$/.test(d))) {
    throw new Error(`${where}: у события «${name(e)}» dates должны быть списком дат вида "ГГГГ-ММ-ДД"`);
  }
  return [...new Set(e.dates)].sort();
}

// Страница двуязычная: у каждого события должны быть обе половины, en и ru.
const TYPES = ["support", "community", "resources", "culture", "action"];
const LANG_KEYS = ["title", "about", "place"];
const name = e => (e && e.en && e.en.title) || (e && e.ru && e.ru.title) || (e && e.title) || "без названия";
function checkEvent(e, where) {
  const problems = [];
  if (!TYPES.includes(e.type)) problems.push(`type должен быть одним из: ${TYPES.join(", ")}`);
  if (e.time != null && !/^([01]?\d|2[0-3]):[0-5]\d$/.test(e.time)) problems.push(`time должно быть вида "19:30", а не «${e.time}»`);
  for (const lang of ["en", "ru"]) {
    if (!e[lang] || typeof e[lang] !== "object") { problems.push(`нет блока ${lang}: { title, about, place }`); continue; }
    for (const k of LANG_KEYS) if (typeof e[lang][k] !== "string" || !e[lang][k].trim()) problems.push(`пустое ${lang}.${k}`);
  }
  if (typeof e.link !== "string" || !e.link.trim()) problems.push("пустая ссылка link");
  if (problems.length) throw new Error(`${where}: у события «${name(e)}» ${problems.join("; ")}`);
  return checkDates(e, where);
}

const hhmm = t => String(t || "").padStart(5, "0");
const byDate = (a, b) => a.dates[0].localeCompare(b.dates[0]) || hhmm(a.time).localeCompare(hhmm(b.time));
const KEYS = ["dates", "time", "type", "en", "ru", "link"];
const str = s => JSON.stringify(String(s));

function langText(block, pad) {
  const keys = [...LANG_KEYS.filter(k => block[k] != null), ...Object.keys(block).filter(k => !LANG_KEYS.includes(k))];
  return `{\n${keys.map(k => `${pad}  ${k}: ${typeof block[k] === "string" ? str(block[k]) : JSON.stringify(block[k])}`).join(",\n")}\n${pad}}`;
}
function eventText(e, indent) {
  const pad = " ".repeat(indent), outer = " ".repeat(indent - 2);
  const lines = [`${pad}dates: [${e.dates.map(str).join(", ")}]`];
  for (const k of KEYS.slice(1)) {
    if (e[k] == null) continue;
    lines.push(`${pad}${k}: ${k === "en" || k === "ru" ? langText(e[k], pad) : str(e[k])}`);
  }
  for (const k of Object.keys(e)) if (!KEYS.includes(k)) lines.push(`${pad}${k}: ${JSON.stringify(e[k])}`);
  return `${outer}{\n${lines.join(",\n")}\n${outer}}`;
}
const serializeEvents = events => events.length ? `[\n${events.map(e => eventText(e, 4)).join(",\n")}\n]` : "[\n]";
const serializeArchive = archive => `[\n${archive.map(m =>
  `  {\n    month: ${str(m.month)},\n    events: [\n${m.events.map(e => eventText(e, 8)).join(",\n")}\n    ]\n  }`
).join(",\n")}\n]`;

const html = readFileSync(FILE, "utf8");
const ev = extract(html, "EVENTS"), ar = extract(html, "ARCHIVE");
if (ev.end > ar.start) throw new Error("EVENTS должен идти в файле раньше ARCHIVE");

// Делим каждое событие на прошедшие и будущие даты.
const upcoming = [], moved = [];
for (const e of ev.value) {
  const dates = checkEvent(e, "EVENTS");
  const past = dates.filter(d => d < today), future = dates.filter(d => d >= today);
  if (past.length) moved.push({ ...e, dates: past });
  if (future.length) upcoming.push({ ...e, dates: future });
}

if (!moved.length) {
  console.log(`Сегодня ${today}: прошедших событий в списке нет, index.html не тронут.`);
  process.exit(0);
}

// Складываем прошедшее в архив: по месяцам, одно и то же событие (английское
// название + ссылка) внутри месяца — одной карточкой со всеми его датами.
const archive = ar.value.map(m => {
  if (!/^\d{4}-\d{2}$/.test(m.month)) throw new Error(`ARCHIVE: month должен быть вида "ГГГГ-ММ", а не «${m.month}»`);
  return { ...m, events: (m.events || []).map(e => ({ ...e, dates: checkEvent(e, "ARCHIVE") })) };
});
for (const e of moved) {
  console.log(`→ в архив: ${name(e)} (${e.dates.join(", ")})`);
  for (const d of e.dates) {
    const month = d.slice(0, 7);
    let m = archive.find(x => x.month === month);
    if (!m) archive.push(m = { month, events: [] });
    const same = m.events.find(x => name(x) === name(e) && x.link === e.link);
    if (same) same.dates = [...new Set([...same.dates, d])].sort();
    else m.events.push({ ...e, dates: [d] });
  }
}
archive.sort((a, b) => b.month.localeCompare(a.month));
for (const m of archive) m.events.sort(byDate);
upcoming.sort(byDate);

const out = html.slice(0, ev.start) + serializeEvents(upcoming)
  + html.slice(ev.end, ar.start) + serializeArchive(archive) + html.slice(ar.end);

// Проверяем, что записанное читается обратно и ничего не потерялось.
const check = { events: extract(out, "EVENTS").value, archive: extract(out, "ARCHIVE").value };
const count = (list) => list.reduce((n, e) => n + e.dates.length, 0);
const before = count(ev.value) + ar.value.reduce((n, m) => n + count(m.events), 0);
const after = count(check.events) + check.archive.reduce((n, m) => n + count(m.events), 0);
if (before !== after) throw new Error(`Потерялись даты: было ${before}, стало ${after} — файл не записан`);

if (process.env.DRY_RUN === "1") {
  console.log(`DRY_RUN: впереди остаётся ${upcoming.length} событий, файл не записан.`);
} else {
  writeFileSync(FILE, out);
  console.log(`Готово: впереди ${upcoming.length} событий, index.html обновлён.`);
}
