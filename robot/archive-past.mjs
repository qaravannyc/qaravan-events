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
import { extract, checkEvent, name, byDate, serializeEvents, serializeArchive } from "./events-list.mjs";

const FILE = new URL("../index.html", import.meta.url);
const today = process.env.TODAY || new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error(`TODAY должен быть вида ГГГГ-ММ-ДД, а не «${today}»`);

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
