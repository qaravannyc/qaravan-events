// Общее для роботов, которые пишут списки EVENTS и ARCHIVE в index.html: как их найти и прочитать,
// какие поля обязательны (тот же контракт, что читает Telegram-бот в events-robot) и как записать
// в одном и том же формате. Пользуются robot/archive-past.mjs и robot/from-site.mjs.
import vm from "node:vm";

// Находит `const NAME = [ … ];` в html и возвращает границы литерала и его значение.
export function extract(html, name) {
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

// Страница двуязычная: у каждого события должны быть обе половины, en и ru.
export const TYPES = ["support", "community", "resources", "culture", "action"];
export const LANG_KEYS = ["title", "about", "place"];
export const ABOUT_MAX = 280;   // карточки рассчитаны на описание до 280 знаков, показанное целиком
export const name = e => (e && e.en && e.en.title) || (e && e.ru && e.ru.title) || (e && e.title) || "без названия";

function checkDates(e, where) {
  if (!Array.isArray(e.dates) || !e.dates.length || !e.dates.every(d => /^\d{4}-\d{2}-\d{2}$/.test(d))) {
    throw new Error(`${where}: у события «${name(e)}» dates должны быть списком дат вида "ГГГГ-ММ-ДД"`);
  }
  return [...new Set(e.dates)].sort();
}

export function checkEvent(e, where) {
  const problems = [];
  if (!TYPES.includes(e.type)) problems.push(`type должен быть одним из: ${TYPES.join(", ")}`);
  if (e.time != null && !/^([01]?\d|2[0-3]):[0-5]\d$/.test(e.time)) problems.push(`time должно быть вида "19:30", а не «${e.time}»`);
  for (const lang of ["en", "ru"]) {
    if (!e[lang] || typeof e[lang] !== "object") { problems.push(`нет блока ${lang}: { title, about, place }`); continue; }
    for (const k of LANG_KEYS) if (typeof e[lang][k] !== "string" || !e[lang][k].trim()) problems.push(`пустое ${lang}.${k}`);
    if (typeof e[lang].about === "string" && [...e[lang].about].length > ABOUT_MAX) problems.push(`${lang}.about длиннее ${ABOUT_MAX} знаков (${[...e[lang].about].length})`);
  }
  // У будущих событий ссылка обязательна. В ARCHIVE у старой истории (до июля 2023,
  // перенесённой с доски monday) ссылки может не быть: карточка тогда без кнопки.
  const needLink = where === "EVENTS" || e.link != null;
  if (needLink && (typeof e.link !== "string" || !e.link.trim())) problems.push("пустая ссылка link");
  if (problems.length) throw new Error(`${where}: у события «${name(e)}» ${problems.join("; ")}`);
  return checkDates(e, where);
}

const hhmm = t => String(t || "").padStart(5, "0");
export const byDate = (a, b) => a.dates[0].localeCompare(b.dates[0]) || hhmm(a.time).localeCompare(hhmm(b.time));
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
export const serializeEvents = events => events.length ? `[\n${events.map(e => eventText(e, 4)).join(",\n")}\n]` : "[\n]";
export const serializeArchive = archive => `[\n${archive.map(m =>
  `  {\n    month: ${str(m.month)},\n    events: [\n${m.events.map(e => eventText(e, 8)).join(",\n")}\n    ]\n  }`
).join(",\n")}\n]`;
