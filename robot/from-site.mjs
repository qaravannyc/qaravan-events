// Один источник событий (владелец, 2026-11-07: «events.qaravan.org and the events section on the website are feeding from the
// same source of truth»). Источник — события, которые команда ведёт на qaravan.org (Site management, Events; файлы
// content/events в qaravan-site). Сайт отдаёт их опубликованными в https://www.qaravan.org/data/site-events.json, вместе с
// изменениями, сохранёнными минуту назад. Этот робот переписывает по нему список EVENTS в index.html: каждое событие сайта
// с датами от сегодняшнего дня (Нью-Йорк) — один блок в прежнем формате, который читает Telegram-бот в events-robot.
// Руками EVENTS больше не правят: следующий прогон вернёт список к тому, что на qaravan.org.
//
//   link: страница события на qaravan.org; у группы поддержки и сопровождения (анкеты gina и simon) прежние ссылки на
//         feedback.qaravan.org/support/<анкета>, у события с внешней записью — её адрес. По ссылке бот находит строку на
//         доске monday и помнит отправленные напоминания, от неё зависит UID в календарях, поэтому она не меняется.
//   place: то, что сайт показывает всем до записи (точный адрес сайт отдаёт только записавшимся).
//   Событие без выбранной даты (dateTbd) в EVENTS не идёт: у страницы и бота нет «дата уточняется», а условную дату
//         бот принял бы за настоящую и напомнил бы накануне. Оно появится, как только команда поставит дату.
//
// Запускается из .github/workflows/archive-past.yml каждые 15 минут, после robot/archive-past.mjs (прошедшие даты сначала
// уезжают в ARCHIVE; если в EVENTS остались прошедшие даты, робот не пишет ничего). Сайт не ответил: index.html не
// трогается, прогон зелёный, следующий попробует снова. Ответил не списком событий или событие не проходит проверку
// (те же правила, что у ночного робота): index.html не трогается, прогон красный.
//
// Вручную: node robot/from-site.mjs
//   DRY_RUN=1                  — показать изменения, файл не записывать
//   TODAY=2026-11-20           — притвориться, что сегодня другой день (Нью-Йорк)
//   SITE_EVENTS_FILE=путь.json — взять события из файла, а не с qaravan.org
import { readFileSync, writeFileSync } from "node:fs";
import { extract, checkEvent, name, byDate, serializeEvents } from "./events-list.mjs";

const FILE = new URL("../index.html", import.meta.url);
const SOURCE = process.env.SITE_EVENTS_URL || "https://www.qaravan.org/data/site-events.json";
const today = process.env.TODAY || new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error(`TODAY должен быть вида ГГГГ-ММ-ДД, а не «${today}»`);
const FORM_LINKS = { gina: "https://feedback.qaravan.org/support/gina", simon: "https://feedback.qaravan.org/support/simon" };

async function load() {
  if (process.env.SITE_EVENTS_FILE) return JSON.parse(readFileSync(process.env.SITE_EVENTS_FILE, "utf8"));
  let last;
  for (const wait of [0, 5000, 15000]) {
    if (wait) await new Promise(r => setTimeout(r, wait));
    try {
      const res = await fetch(SOURCE, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) { last = e; }
  }
  throw new Error(`${SOURCE} не ответил (${last && last.message}): index.html не тронут`);
}

// Текст в одну строку, без угловых скобок (они могли бы закрыть <script> страницы).
const clean = s => String(s == null ? "" : s).replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
function linkOf(x) {
  const r = x.registration || {};
  if (r.mode === "form" && FORM_LINKS[r.form]) return FORM_LINKS[r.form];
  if (r.mode === "external" && /^https:\/\//.test(r.url || "")) return r.url;
  return `https://www.qaravan.org/events/${encodeURIComponent(x.id)}/`;
}
function itemOf(x) {
  const dates = [...new Set(x.dates || [])].filter(d => typeof d === "string" && d >= today).sort();
  if (!dates.length) return null;
  const half = l => ({ title: clean(x[l] && x[l].title), about: clean(x[l] && x[l].about), place: clean(x[l] && x[l].place) });
  const item = { dates, ...(x.time ? { time: x.time } : {}), type: x.type, en: half("en"), ru: half("ru"), link: linkOf(x) };
  if (x.end) item.end = x.end;
  return item;
}

// Сайт не ответил: список остаётся прежним до следующего прогона (через 15 минут), прогон не красный.
const site = await load().catch((e) => { console.log(`::warning::${e.message}`); process.exit(0); });
if (!Array.isArray(site) || !site.length || !site.every(x => x && typeof x.id === "string" && Array.isArray(x.dates))) {
  throw new Error(`${SOURCE}: ожидался непустой список событий, index.html не тронут`);
}
const events = [], left = [];
for (const x of site) {
  if (/^test-/.test(x.id)) continue;   // проверочные события сайта (только на превью)
  if (x.dateTbd) { left.push(`${clean(x.en && x.en.title)} (дата не выбрана)`); continue; }
  const item = itemOf(x);
  if (!item) continue;
  checkEvent(item, "EVENTS");          // тот же контракт, что у ночного робота и Telegram-бота: ошибка останавливает запись
  events.push(item);
}
events.sort(byDate);

const html = readFileSync(FILE, "utf8");
const ev = extract(html, "EVENTS"), ar = extract(html, "ARCHIVE");
if (ev.end > ar.start) throw new Error("EVENTS должен идти в файле раньше ARCHIVE");
const stale = ev.value.flatMap(e => (e.dates || []).filter(d => d < today).map(d => `${name(e)} ${d}`));
if (stale.length) throw new Error(`В EVENTS остались прошедшие даты (${stale.join(", ")}): сначала node robot/archive-past.mjs, иначе они не попадут в архив`);

const out = html.slice(0, ev.start) + serializeEvents(events) + html.slice(ev.end);
// Записанное читается обратно тем же способом, ARCHIVE и остальной файл не изменились.
const back = extract(out, "EVENTS").value;
if (JSON.stringify(back) !== JSON.stringify(events)) throw new Error("EVENTS не читается обратно так же: файл не записан");
if (out.slice(ev.start + serializeEvents(events).length) !== html.slice(ev.end) || out.slice(0, ev.start) !== html.slice(0, ev.start)) throw new Error("Задето что-то кроме EVENTS: файл не записан");

if (left.length) console.log(`Не в EVENTS, пока нет даты: ${left.join("; ")}`);
const key = e => `${e.link} ${e.dates.join(",")}`;
const was = new Map(ev.value.map(e => [e.link, e])), now = new Map(events.map(e => [e.link, e]));
for (const e of events) if (!was.has(e.link)) console.log(`+ ${name(e)} (${e.dates.join(", ")})`);
for (const e of ev.value) if (!now.has(e.link)) console.log(`− ${name(e)} (${e.dates.join(", ")})`);
for (const e of events) { const o = was.get(e.link); if (o && JSON.stringify(o) !== JSON.stringify(e)) console.log(`~ ${name(e)}${key(o) !== key(e) ? ` (даты: ${o.dates.join(", ")} → ${e.dates.join(", ")})` : ""}`); }

if (out === html) console.log(`Сегодня ${today}: EVENTS уже совпадает с qaravan.org (${events.length} событий), index.html не тронут.`);
else if (process.env.DRY_RUN === "1") console.log(`DRY_RUN: в EVENTS было бы ${events.length} событий, файл не записан.`);
else { writeFileSync(FILE, out); console.log(`Готово: в EVENTS ${events.length} событий с qaravan.org, index.html обновлён.`); }
