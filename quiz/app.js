/* QARAVAN quiz: «Учёба в США: что вам подходит».
   Everything runs in the browser. Answers live only in memory: nothing is sent, stored or counted.
   Program data: programs.js (window.QV_PROGRAMS), built from the guide «Учёба в США для просителей убежища» (2026-10-19). */
(function () {
  "use strict";

  var PROGRAMS = window.QV_PROGRAMS || [];
  var GUIDE_URL = "https://events.qaravan.org/oct19/";
  var QUIZ_URL = "https://events.qaravan.org/quiz/";
  var DATA_DATE = "2026-10-19";
  var TODAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());

  /* ---------- small helpers ---------- */

  var MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  function ruDate(iso, withYear) {
    var p = iso.split("-");
    var s = +p[2] + " " + MONTHS[+p[1] - 1];
    return withYear === false ? s : s + " " + p[0] + " года";
  }
  function daysBetween(a, b) {
    return Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 864e5);
  }
  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function safeUrl(u) { return /^https?:\/\//.test(u) ? u : "#"; }
  /* Inline markup used in steps and facts: [text](url) and **bold**. */
  function md(s) {
    return esc(s)
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, t, u) {
        return '<a href="' + esc(safeUrl(u.replace(/&amp;/g, "&"))) + '" target="_blank" rel="noopener">' + t + "</a>";
      })
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  }
  function shortUrl(u) { return u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""); }
  function has(set, v) { return !!set && set.indexOf(v) !== -1; }
  function any(set, list) { for (var i = 0; i < list.length; i++) if (has(set, list[i])) return true; return false; }

  /* ---------- questions ---------- */

  var CUNY = {
    "Колледжи CUNY с двухлетними программами": [["bmcc", "BMCC"], ["bronxcc", "Bronx Community College"], ["guttman", "Guttman Community College"], ["hostos", "Hostos Community College"], ["kingsborough", "Kingsborough Community College"], ["laguardia", "LaGuardia Community College"], ["queensborough", "Queensborough Community College"]],
    "Четырёхлетние колледжи CUNY": [["baruch", "Baruch College"], ["brooklyn", "Brooklyn College"], ["ccny", "City College"], ["citytech", "City Tech"], ["csi", "College of Staten Island"], ["hunter", "Hunter College"], ["jjay", "John Jay College"], ["lehman", "Lehman College"], ["medgar", "Medgar Evers College"], ["queens", "Queens College"], ["york", "York College"]],
    "Другие школы CUNY": [["sps", "CUNY School of Professional Studies"], ["sph", "CUNY School of Public Health"], ["cunylaw", "CUNY School of Law"], ["gc", "CUNY Graduate Center"], ["macaulay", "Macaulay Honors College"], ["cuny_other", "Другой колледж CUNY"]],
    "Другие вузы": [["suny", "Колледж или университет SUNY"], ["columbia", "Columbia University"], ["nyu", "New York University"], ["newschool", "The New School"], ["fordham", "Fordham University"], ["mercy", "Mercy University"], ["private_ny", "Другой частный вуз в штате Нью-Йорк"], ["other", "Вуз в другом штате"]]
  };
  var CUNY_CODES = [];
  ["Колледжи CUNY с двухлетними программами", "Четырёхлетние колледжи CUNY", "Другие школы CUNY"].forEach(function (g) {
    CUNY[g].forEach(function (o) { CUNY_CODES.push(o[0]); });
  });
  var CC_CODES = CUNY["Колледжи CUNY с двухлетними программами"].map(function (o) { return o[0]; });

  var GPA = { none: null, g1: [0, 1.99], g2: [2.0, 2.49], g3: [2.5, 2.99], g4: [3.0, 3.29], g5: [3.3, 3.49], g6: [3.5, 3.69], g7: [3.7, 4.0] };

  var Q = [
    {
      id: "goals", type: "multi", title: "Чего вы хотите?", hint: "Можно выбрать несколько.",
      options: [
        ["first", "Получить первое высшее образование", "Associate degree в community college или бакалавриат"],
        ["grad", "Поступить в магистратуру", "В том числе MBA, MSW, MPH и юридическую школу"],
        ["phd", "Поступить в докторантуру или заниматься исследованиями"],
        ["career", "Быстро освоить профессию без диплома вуза", "Бесплатные курсы IT, медицины, строительства и других профессий"],
        ["license", "Работать по своей специальности", "Оценить иностранный диплом, получить лицензию"],
        ["english", "Подтянуть английский"],
        ["fellow", "Найти fellowship", "Оплачиваемые программы для журналистов, учёных, юристов, людей искусства и общественных лидеров с опытом"]
      ]
    },
    {
      id: "edu", type: "single", title: "Какое у вас образование?", hint: "Выберите самый высокий уровень.",
      options: [
        ["none", "Школу не окончили"],
        ["school_abroad", "Школьный аттестат из другой страны"],
        ["school_ny", "Окончили школу в Нью-Йорке", "Учились там два года и больше"],
        ["school_us", "Окончили школу в другом штате США"],
        ["hse", "Нью-йоркский аттестат HSE (экзамен GED)"],
        ["some_college", "Учились после школы, но диплома бакалавра нет", "Колледж, техникум или вуз, в том числе незаконченный"],
        ["bachelor", "Диплом бакалавра или специалиста"],
        ["master", "Магистратура"],
        ["phd", "Учёная степень", "PhD, кандидат или доктор наук"]
      ]
    },
    {
      id: "enrolled", type: "single", title: "Вы сейчас учитесь в колледже или вузе в США?",
      options: [
        ["no", "Нет"],
        ["cc", "Да, в community college"],
        ["ba", "Да, на бакалавриате"],
        ["grad", "Да, в магистратуре или юридической школе"],
        ["phd", "Да, в докторантуре"]
      ]
    },
    {
      id: "college", type: "select", title: "Где вы учитесь?", hint: "У некоторых колледжей есть свои стипендии.",
      when: function (a) { return a.enrolled && a.enrolled !== "no"; }
    },
    {
      id: "gpa", type: "single", title: "Какой у вас средний балл (GPA)?", hint: "У многих стипендий есть минимальный средний балл.",
      when: function (a) { return a.enrolled && a.enrolled !== "no"; },
      options: [["none", "Оценок ещё нет"], ["g1", "Ниже 2.0"], ["g2", "2.0–2.4"], ["g3", "2.5–2.9"], ["g4", "3.0–3.2"], ["g5", "3.3–3.4"], ["g6", "3.5–3.6"], ["g7", "3.7 и выше"]]
    },
    {
      id: "status", type: "multi", title: "Какой у вас иммиграционный статус?", hint: "Отметьте всё, что подходит. Ответы остаются на вашем устройстве, мы их не видим.",
      options: [
        ["asylum_uscis", "Подали на убежище в USCIS, решения ещё нет", "Affirmative, через миграционную службу"],
        ["asylum_court", "Дело об убежище в иммиграционном суде"],
        ["i220a", "Вышли из иммиграционного задержания с I-220A"],
        ["cbp", "Пароль через CBP One"],
        ["u4u", "Пароль U4U или повторный пароль, ещё действует"],
        ["tps", "TPS, например украинский, или подали на TPS"],
        ["i485", "Подали на грин-карту (I-485)"],
        ["asylee", "Убежище уже одобрено"],
        ["b_visa", "Туристическая виза B-1 или B-2 ещё действует"],
        ["fj", "Раньше была студенческая виза F-1 или виза J-1"],
        ["other", "Другое"]
      ]
    },
    {
      id: "ead", type: "single", title: "Есть ли у вас разрешение на работу (EAD)?",
      options: [
        ["c08", "Да, действующий EAD категории C08", "По делу об убежище"],
        ["other", "Да, действующий EAD другой категории", "Например, по паролю или TPS"],
        ["expired", "EAD истёк, продление на рассмотрении"],
        ["no", "Нет"]
      ]
    },
    {
      id: "res", type: "single", title: "Где вы живёте?", hint: "От этого зависит, сколько вы заплатите в государственных вузах.",
      options: [
        ["nyc12", "В городе Нью-Йорк, в штате живу год и больше"],
        ["nyc", "В городе Нью-Йорк, в штате живу меньше года"],
        ["nys12", "В штате Нью-Йорк, но не в городе, живу здесь год и больше"],
        ["nys", "В штате Нью-Йорк, но не в городе, живу здесь меньше года"],
        ["other", "В другом штате"]
      ]
    },
    {
      id: "move", type: "single", title: "Готовы переехать в другой штат, если там оплачивают учёбу или fellowship?",
      when: function (a) { return any(a.goals, ["first", "grad", "phd", "fellow"]) || (a.enrolled && a.enrolled !== "no"); },
      options: [["yes", "Да, готовы переехать"], ["no", "Нет, хочу остаться в Нью-Йорке"]]
    },
    { id: "age", type: "number", title: "Сколько вам лет?", hint: "У некоторых программ есть ограничения по возрасту." },
    {
      id: "english", type: "single", title: "Как у вас с английским?",
      options: [
        ["low", "Пока почти не говорю"],
        ["mid", "Объясняюсь, но учиться на английском пока трудно"],
        ["fluent", "Свободно, могу учиться на английском"]
      ]
    },
    {
      id: "fields", type: "multi", title: "Какие специальности вам интересны?", hint: "Можно несколько. Если пока не знаете, так и отметьте.",
      when: function (a) { return any(a.goals, ["first", "grad", "phd", "career", "license", "fellow"]) || (a.enrolled && a.enrolled !== "no"); },
      options: [
        ["it", "IT и программирование"],
        ["stem", "Инженерия, естественные науки, математика"],
        ["health", "Медицина и уход за людьми"],
        ["psych", "Психология и социальная работа"],
        ["law", "Право"],
        ["business", "Бизнес, бухгалтерия, финансы"],
        ["media", "Журналистика, PR, редактура, маркетинг"],
        ["arts", "Искусство, дизайн, музыка, кино"],
        ["lit", "Литература, писательство, перевод"],
        ["edu", "Педагогика и работа с детьми"],
        ["trades", "Строительство, техника, транспорт"],
        ["food", "Кухня и рестораны"],
        ["humanities", "История, политика и другие гуманитарные науки"],
        ["unknown", "Пока не знаю"]
      ]
    },
    {
      id: "me", type: "multi", optional: true, title: "Что из этого про вас?", hint: "Можно несколько или ничего. Это нужно, чтобы показать стипендии для отдельных групп.",
      options: [
        ["lgbtq", "Вы ЛГБТК+ человек"],
        ["trans", "Вы трансгендерный, небинарный или интерсекс-человек"],
        ["woman", "Вы женщина или идентифицируете себя как женщина"],
        ["parent", "Вы растите детей или содержите семью"],
        ["firstgen", "Вы первыми в семье получаете высшее образование"],
        ["lowinc", "Вам не хватает денег на учёбу"],
        ["activist", "Вы занимаетесь волонтёрством, активизмом или общественной работой"],
        ["poc", "Вы небелый человек (person of color)"],
        ["employee", "Вы работаете в Amazon, Starbucks, Uber, Walmart, Target, Chipotle, McDonald's, Disney, Lowe's, Hilton или Northwell"]
      ]
    },
    {
      id: "origin", type: "multi", optional: true, title: "Ваше происхождение", hint: "Есть стипендии для отдельных общин. Отметьте, если что-то про вас, или пропустите.",
      options: [
        ["armenian", "Армянское"],
        ["ukrainian", "Украинское"],
        ["jewish", "Еврейское"],
        ["slavic", "Польское или другое славянское"],
        ["centralasia", "Из Кыргызстана, Таджикистана или Афганистана"],
        ["api", "Азиатское или тихоокеанское (API)"],
        ["black", "Чернокожие (Black)"],
        ["latin", "Латиноамериканское, или вы работаете на благо латиноамериканского сообщества"]
      ]
    }
  ];

  /* ---------- derived answers ---------- */

  function derive(a) {
    var d = {};
    d.goals = a.goals || [];
    d.status = a.status || [];
    d.me = a.me || [];
    d.origin = a.origin || [];
    d.fields = (a.fields || []).filter(function (f) { return f !== "unknown"; });
    d.fieldsUnknown = !d.fields.length;
    d.pending = any(d.status, ["asylum_uscis", "asylum_court"]);
    d.asylumTrack = d.pending || any(d.status, ["i220a", "cbp"]);
    d.asylee = has(d.status, "asylee");
    d.workAuth = a.ead === "c08" || a.ead === "other" || d.asylee;
    d.hasSchool = a.edu && a.edu !== "none";
    d.hasBachelor = any([a.edu], ["bachelor", "master", "phd"]);
    d.hasMaster = any([a.edu], ["master", "phd"]);
    d.nyc = a.res === "nyc" || a.res === "nyc12";
    d.nys = a.res && a.res !== "other";
    d.year = a.res === "nyc12" || a.res === "nys12";
    d.cuny = has(CUNY_CODES, a.college);
    d.enrolled = a.enrolled && a.enrolled !== "no";
    d.instate = d.nys && ((a.ead === "c08" && d.year) || any(d.status, ["tps", "u4u", "i485"]) || (d.asylee && d.year));
    var lv = [];
    if (has(d.goals, "first")) lv.push("cc", "ba");
    if (has(d.goals, "grad")) { lv.push("ma"); if (has(d.fields, "law")) lv.push("law"); }
    if (has(d.goals, "phd")) lv.push("phd");
    if (has(d.goals, "career")) lv.push("cert");
    if (has(d.goals, "english")) lv.push("eng");
    if (has(d.goals, "license")) lv.push("lic");
    if (has(d.goals, "fellow")) lv.push("fel");
    if (a.enrolled === "cc") lv.push("cc");
    if (a.enrolled === "ba") lv.push("ba");
    if (a.enrolled === "grad") lv.push("ma", "law");
    if (a.enrolled === "phd") lv.push("phd");
    if (a.english === "low" || a.english === "mid") lv.push("eng");
    d.lv = lv;
    d.studyLv = a.enrolled === "cc" ? ["cc"] : a.enrolled === "ba" ? ["ba"] : a.enrolled === "grad" ? ["ma", "law"] : a.enrolled === "phd" ? ["phd"] : [];
    d.gpa = a.gpa ? GPA[a.gpa] : null;
    return d;
  }

  /* ---------- matching ---------- */

  var FIELD_LABEL = { it: "IT", stem: "STEM", health: "медицина", psych: "психология и социальная работа", law: "право", business: "бизнес", media: "журналистика и коммуникации", arts: "искусство", lit: "литература и перевод", edu: "педагогика", trades: "рабочие профессии", food: "кухня", humanities: "гуманитарные науки" };
  var ORIGIN_LABEL = { armenian: "армянское происхождение", ukrainian: "украинское происхождение", jewish: "еврейское происхождение", slavic: "славянское происхождение", centralasia: "Центральная Азия и Афганистан", api: "азиатское происхождение", black: "Black", latin: "латиноамериканское сообщество" };
  var EMPLOYER = { amazon: "Amazon", starbucks: "Starbucks", uber: "Uber", walmart: "Walmart", target: "Target", chipotle: "Chipotle", mcdonalds: "McDonald's", disney: "Disney", lowes: "Lowe's", hilton: "Hilton", northwell: "Northwell" };

  /* in these sections a program counts as «именно вам» only when one of your answers matched it */
  var GENERIC_SEC = ["any", "bold", "private", "lgbt", "women", "field", "origin", "loan"];

  function nextDate(p) {
    var ds = (p.deadlines || []).filter(function (x) { return x >= TODAY; }).sort();
    return ds[0] || null;
  }

  function match(p, a, d) {
    var r = p.r || {};
    var res = { p: p, why: [], warn: [], state: "now" };
    if (!any(p.lv || [], d.lv)) return null;
    if (r.closed) return null;
    if (r.asylee && !d.asylee) return null;
    if (r.move && a.move !== "yes") return null;
    if (r.noBachelor && d.hasBachelor) return null;
    if (r.bachelor && !d.hasBachelor && a.enrolled !== "ba") return null;
    if (r.noMaster && (d.hasMaster || a.enrolled === "grad")) return null;
    if (r.phdHeld && a.edu !== "phd") return null;
    if (r.firstTime && (a.edu === "some_college" || d.hasBachelor || d.enrolled)) return null;
    if (r.lgbtq === true && !any(d.me, ["lgbtq", "trans"])) return null;
    if (r.lgbtq === "ally" && !any(d.me, ["lgbtq", "trans"])) res.warn.push("Подать могут и союзники ЛГБТК+ людей.");
    if (r.lgbtq && any(d.me, ["lgbtq", "trans"])) res.why.push("ЛГБТК+");
    if (r.trans) { if (!has(d.me, "trans")) return null; res.why.push("транс, небинарные и интерсекс-люди"); }
    if (r.woman) { if (!has(d.me, "woman")) return null; res.why.push("для женщин"); }
    if (r.parent) { if (!has(d.me, "parent")) return null; res.why.push("для родителей"); }
    if (r.firstgen && r.lowinc) {
      if (!any(d.me, ["firstgen", "lowinc"])) return null;
    } else {
      if (r.firstgen) { if (!has(d.me, "firstgen")) return null; res.why.push("первые в семье в вузе"); }
      if (r.lowinc && has(d.me, "lowinc")) res.why.push("при нехватке денег");
    }
    if (r.activist) { if (!has(d.me, "activist")) return null; res.why.push("общественная работа"); }
    if (r.poc) { if (!has(d.me, "poc")) return null; res.why.push("people of color"); }
    if (r.black) { if (!has(d.origin, "black")) return null; res.why.push("Black"); }
    if (r.origin) { if (!has(d.origin, r.origin)) return null; res.why.push(ORIGIN_LABEL[r.origin] || r.origin); }
    if (r.employer) { if (!has(d.me, "employee")) return null; res.state = "employer"; res.why.push(EMPLOYER[r.employer] || r.employer); }
    if (r.tps) { if (!has(d.status, "tps")) return null; res.why.push("TPS"); }
    if (r.field && r.field.length) {
      var hit = r.field.filter(function (f) { return has(d.fields, f); });
      if (hit.length) res.why.push(hit.map(function (f) { return FIELD_LABEL[f] || f; }).join(", "));
      else if (d.fieldsUnknown) res.fieldUnknown = true;
      else return null;
    }
    if (r.age) {
      var age = +a.age;
      if (r.age[0] != null && age < r.age[0]) return null;
      if (r.age[1] != null && age > r.age[1]) return null;
      res.why.push("ваш возраст");
    }
    if (r.gpa) {
      if (d.gpa) {
        if (d.gpa[1] < r.gpa) return null;
        if (d.gpa[0] < r.gpa) res.warn.push("Нужен средний балл от " + r.gpa.toFixed(r.gpa * 100 % 10 ? 2 : 1) + ".");
      } else {
        res.warn.push("Нужен средний балл от " + r.gpa.toFixed(r.gpa * 100 % 10 ? 2 : 1) + ".");
      }
    }
    if (r.english === "fluent" && a.english !== "fluent") {
      if (a.english === "low") return null;
      res.warn.push("Нужен свободный английский.");
    }
    if (r.english === "mid" && a.english === "low") res.warn.push("Нужен хотя бы разговорный английский.");
    if (r.nyc && !d.nyc) return null;
    if ((r.nys || r.ny_area) && !d.nys) return null;
    if (r.college && r.college.length) {
      if (has(r.college, a.college)) res.why.push("ваш колледж");
      else if (d.enrolled) return null;
      else { res.state = "study"; res.warn.push("Только для студентов колледжей, которые названы в условиях."); }
    }
    if (r.cuny) {
      if (d.cuny) res.why.push("CUNY");
      else if (d.enrolled) return null;
      else if (any(d.goals, ["first", "grad", "phd", "english"])) res.state = "study";
      else return null;
    }
    if (r.enrolled && res.state === "now") {
      var studyHit = any(p.lv || [], d.studyLv);
      if (!d.enrolled || !studyHit) res.state = "study";
    }
    if (r.instate && !d.instate) {
      if (d.asylumTrack && a.ead !== "c08" && res.state === "now") res.state = "ead";
      res.warn.push("Нужна ставка для жителей штата: в CUNY для неё нужны действующий EAD категории C08 и 12 месяцев жизни в штате.");
    }
    if (r.ead) {
      if (a.ead === "expired" && !d.asylee) res.warn.push("Нужен действующий EAD: дождитесь продления.");
      else if (!d.workAuth) {
        if (res.state === "now") res.state = "ead";
        if (res.fieldUnknown || res.state !== "ead") res.warn.push("Нужно разрешение на работу.");
      }
    }
    if (r.j1) res.warn.push("Программа оформляет визу J-1 или требует выезда из США. Выезд без advance parole обычно считается отказом от заявления на убежище, поэтому до подачи поговорите с адвокатом.");
    if (p.note) res.warn.push(p.note);
    res.specific = res.why.some(function (w) { return w !== "ваш возраст"; }) || !has(GENERIC_SEC, p.sec);
    res.next = nextDate(p);
    res.opens = p.opens && p.opens > TODAY ? p.opens : null;
    res.passed = !res.next && (p.deadlines || []).length > 0;
    return res;
  }

  function sortKey(m) {
    if (m.passed) return "9";
    if (m.next) return "1" + m.next;
    if (m.opens) return "2" + m.opens;
    return "3";
  }

  function results(a) {
    var d = derive(a);
    var all = [];
    PROGRAMS.forEach(function (p) { var m = match(p, a, d); if (m) all.push(m); });
    all.sort(function (x, y) {
      var kx = sortKey(x), ky = sortKey(y);
      return kx < ky ? -1 : kx > ky ? 1 : 0;
    });
    var groups = {
      top: all.filter(function (m) { return m.state === "now" && !m.fieldUnknown && m.specific; }),
      open: all.filter(function (m) { return m.state === "now" && !m.fieldUnknown && !m.specific; }),
      study: all.filter(function (m) { return m.state === "study" && !m.fieldUnknown; }),
      ead: all.filter(function (m) { return m.state === "ead" && !m.fieldUnknown; }),
      employer: all.filter(function (m) { return m.state === "employer"; }),
      field: all.filter(function (m) { return m.fieldUnknown && m.state !== "employer"; })
    };
    var soon = groups.top.concat(groups.open).filter(function (m) { return m.next && daysBetween(TODAY, m.next) <= 60; })
      .sort(function (x, y) { return x.next < y.next ? -1 : x.next > y.next ? 1 : 0; }).slice(0, 8);
    return { d: d, groups: groups, soon: soon, steps: buildSteps(a, d), facts: buildFacts(a, d), lawyer: buildLawyer(a, d), nofit: buildNofit(a, d) };
  }

  /* ---------- facts: what matters in your situation ---------- */

  function buildFacts(a, d) {
    var f = [];
    var study = any(d.goals, ["first", "grad", "phd"]) || d.enrolled;
    var gradOnly = !has(d.goals, "first") && (has(d.goals, "grad") || a.enrolled === "grad");
    if (d.asylee) f.push("Тест и гид написаны для тех, кто ещё ждёт решения по убежищу. С одобренным убежищем вам доступны федеральная помощь через FAFSA и некоторые стипендии, которых нет в этом списке.");
    if (study && d.nys) {
      if (has(d.status, "i485")) f.push("Пока ваше заявление на грин-карту (I-485) рассматривают, CUNY даёт вам **ставку для жителей штата**. Подтвердить это можно уведомлением о получении I-485 (I-797C), квитанцией об оплате сбора USCIS или EAD категории C09 или C24.");
      else if (has(d.status, "tps")) f.push("С TPS у вас есть **ставка для жителей штата** в CUNY и SUNY, даже если вы только подали на TPS, но права на FAFSA у вас нет.");
      else if (has(d.status, "u4u")) f.push("С действующим паролем U4U у вас есть **ставка для жителей штата** в CUNY и SUNY.");
      else if (d.asylumTrack) {
        if (a.ead === "c08" && d.year) f.push("С действующим EAD категории C08 и после 12 месяцев жизни в штате вы платите в CUNY и SUNY по **ставке для жителей штата**: в CUNY бакалавриат стоит $3465 за семестр вместо $620 за кредит, магистратура $470 за кредит вместо $855.");
        else if (a.ead === "c08") f.push("Ставку для жителей штата в CUNY вы получите, когда проживёте в штате **12 месяцев до первого дня занятий**. До этого CUNY возьмёт плату как с иногородних.");
        else if (a.ead === "expired") f.push("CUNY требует **действующий EAD**: пока продление на рассмотрении, вам, скорее всего, выставят счёт по ставке для иногородних. Старый EAD больше не продлевается автоматически.");
        else f.push((a.ead === "other" ? "Без EAD категории C08" : "Без EAD") + " CUNY возьмёт с вас плату **как с иногородних**" + (a.edu === "none" ? ", если только вы не получите нью-йоркский аттестат HSE (об этом в шагах ниже)" : "") + ": например, " + (gradOnly ? "магистратура $855 за кредит вместо $470" : "бакалавриат $620 за кредит вместо $3465 за семестр") + ". Community colleges SUNY дают ставку для жителей штата и по заявлению на убежище, про EAD в их правилах ничего не сказано.");
      }
    }
    if (study && !d.asylee) {
      if (has(d.status, "u4u")) f.push("С действующим паролем U4U или повторным паролем вы можете получать **федеральную помощь через FAFSA**, если вас впустили между 24 февраля 2022 и 30 сентября 2024 года, а если вы супруг, супруга или ребёнок такого человека, то и позже. Решает отдел финансовой помощи колледжа, он попросит действующую I-94.");
      else if (d.asylumTrack || has(d.status, "tps")) f.push((d.asylumTrack ? "Пока ваше дело об убежище не решено" : "С вашим статусом") + ", **FAFSA, гранты Pell и федеральные займы вам недоступны**, даже с EAD. Остаются помощь штата, скидки и стипендии вузов, частные стипендии, помощь работодателя и рассрочка.");
    }
    if (has(d.goals, "grad") || a.enrolled === "grad" || a.enrolled === "phd") f.push("На магистратуру гранты штата **TAP и Excelsior не дают**.");
    if (has(d.status, "asylum_uscis")) f.push("Ежегодный сбор за убежище сейчас **$105**. Пока действует решение суда в Массачусетсе, USCIS не может отклонить ваше заявление на убежище или прекратить EAD за неоплату, но сбор всё равно берёт и рассылает требования об оплате ([ASAP](https://asaptogether.org/en/uscis-aaf-lawsuit/)).");
    if (has(d.status, "cbp")) f.push("Пароль через CBP One у большинства, скорее всего, **уже недействителен**, поэтому для учёбы опирайтесь на EAD ([ASAP](https://asaptogether.org/en/cbpone-parole-end-notice/)).");
    if (has(d.status, "tps")) f.push("Если у вас украинский TPS, его срок действия сейчас **спорный**: USCIS писала, что он заканчивается 19 октября 2026 года, а юристы Ukraine Immigration Task Force считают, что статус автоматически продлён до 19 апреля 2027 года. 18 октября DHS сообщило, что решение примут позже, а до тех пор вы сохраняете защиту. Официального уведомления с новой датой и правилами для EAD пока нет, поэтому поговорите со своим адвокатом ([Ukraine Task Force](https://ukrainetaskforce.org/ukraine-s-tps-is-theoretically-extended-for-6-months-but-dhs-has-yet-to-publish-updates-or-implement-extension/)).");
    if (has(d.me, "parent") && study) f.push("Если у ваших детей, супруга или супруги есть гражданство США или грин-карта, они могут подавать FAFSA: ваш статус на их право не влияет ([Federal Student Aid](https://awsfinancialaidtoolkit.ed.gov/tk/outreach/target/noncitizens.jsp)).");
    if (has(d.goals, "career") && !d.workAuth) f.push("Почти все бесплатные курсы профессий берут только **с разрешением на работу**. Курсы, куда берут без него, есть в списке ниже, а курсы только для тех, у кого есть разрешение на работу, собраны в группе «Когда получите разрешение на работу».");
    return f;
  }

  /* ---------- steps: the action plan ---------- */

  function cunyApplyDates() {
    var y = +TODAY.slice(0, 4);
    var fall = (TODAY <= y + "-02-01") ? y + "-02-01" : (y + 1) + "-02-01";
    var spring = (TODAY <= y + "-09-15") ? y + "-09-15" : (y + 1) + "-09-15";
    return { fall: fall, spring: spring, fallSem: +fall.slice(0, 4), springSem: +spring.slice(0, 4) + 1 };
  }

  function buildSteps(a, d) {
    var S = [];
    function add(phase, title, body) { S.push({ phase: phase, title: title, body: body }); }
    var first = has(d.goals, "first") && !d.hasBachelor;
    var grad = has(d.goals, "grad");
    var gradApply = grad && a.enrolled !== "grad";
    var studyNY = (first || grad || has(d.goals, "phd")) && d.nys;
    var dreamStatus = d.asylumTrack || has(d.status, "tps");

    /* Сначала */
    if (has(d.status, "b_visa")) add("first", "Прежде чем поступать, поговорите с адвокатом",
      "Пока действует туристическая виза B-1 или B-2, поступать на программу обучения нельзя, сначала нужно получить студенческий статус ([8 CFR 214.2(b)(7)](https://www.ecfr.gov/current/title-8/chapter-I/subchapter-B/part-214/section-214.2)). С такой визой Госдепартамент разрешает только короткие курсы для отдыха и хобби. Если вы подали на убежище, но срок в I-94 ещё не прошёл, тоже спросите адвоката до поступления.");
    if (has(d.status, "asylum_court")) add("first", "Заплатите ежегодный сбор за убежище до срока, который назначил судья",
      "Сейчас сбор **$105**. Если не заплатить вовремя, судья может прекратить рассмотрение вашего заявления на убежище или посчитать, что вы от него отказались ([Matter of L-F-R-](https://www.justice.gov/eoir/media/1454066/dl)).");
    if (a.ead === "no" && d.asylumTrack && !d.asylee) add("first", "Получите разрешение на работу (EAD)",
      "С EAD категории C08 и после 12 месяцев жизни в штате CUNY берёт с вас плату как с жителя штата, колледж может взять вас на оплачиваемую работу, а большинство бесплатных курсов профессий принимают только с разрешением на работу. Первое заявление на EAD по делу об убежище стоит **$570**, освобождения от этого сбора нет ([Federal Register](https://www.federalregister.gov/documents/2026/10/01/2026-20187/fiscal-year-2027-inflation-adjustment-to-hr-1-immigration-fees)).");
    if (a.ead === "c08") add("first", "Подайте на продление EAD как можно раньше",
      "Старый EAD больше не продлевается автоматически, пока рассматривают продление ([Federal Register](https://www.federalregister.gov/documents/2026/10/14/2026-20955/removal-of-automatic-extensions-for-certain-employment-authorization-documents)), а CUNY требует действующий. Продление стоит **$745 онлайн или $795 на бумаге**, через форму I-912 можно попросить освободить вас от обычной части сбора, $470 или $520. EAD C08 выдают на срок до 18 месяцев.");
    if (a.ead === "expired" && (studyNY || d.enrolled)) add("first", "До счёта за семестр сходите в residency office колледжа",
      "Возьмите уведомление о получении I-765, заявления на EAD. В бухгалтерии колледжа (bursar) спросите про рассрочку, чтобы не платить всю сумму сразу.");

    /* Английский */
    if (a.english === "low" || a.english === "mid" || has(d.goals, "english")) {
      var eng = d.nyc
        ? "**Riverside Immigrant Services & Empowerment** бесплатно учит английскому на полный день, с понедельника по пятницу с 9:00 до 15:00, шесть недель. Принимают жителей Нью-Йорка от 18 лет, в том числе если вы подали на убежище, анкету можно заполнить на русском. Для заявки нужны подтверждение адреса и регистрация в NYS Virtual Career Center, а для неё сначала нужен аккаунт NY.gov ID. Адрес и даты набора уточните в Riverside по телефону 212-662-3200 ([Riverside](https://riversideimmigrantservices.org/can-i-study-at-riverside)). Без записи можно прийти на разговорные занятия [We Speak NYC](https://wespeaknyc.cityofnewyork.us/classes-near-you/) в библиотеках Бруклина и Квинса."
        : "В Нью-Йорке курсы английского бесплатны: Riverside Immigrant Services & Empowerment, We Speak NYC в библиотеках, курсы ESOL при колледжах CUNY. Если вы живёте в другом штате, ищите бесплатные курсы ESOL в местной библиотеке и community college.";
      if (first && a.english !== "fluent") eng += " Если вас уже приняли в CUNY на associate degree или бакалавриат, программа **CLIP** до года по 25 часов в неделю интенсивно учит английскому, а место в колледже за вами сохраняется. Если вы живёте в штате, 6 недель стоят $75, а 16 недель $180, и финансовая помощь на это не тратится ([CLIP](https://www.cuny.edu/academics/academic-programs/model-programs/cuny-college-transition-programs/cuny-language-immersion-program-clip/)).";
      add("prep", "Начните с бесплатного английского", eng);
    }
    if (gradApply || (has(d.goals, "phd") && !d.enrolled)) add("prep", "Сдайте тест по английскому",
      "Для магистратуры почти везде нужен результат TOEFL, IELTS или Duolingo English Test, а список тестов и минимальный балл у каждой программы свои. **Duolingo English Test** сдают онлайн, результаты приходят через два дня, а при низком доходе от платы могут освободить ([Access Program](https://englishtest.duolingo.com/access)). Уроки в бесплатном приложении Duolingo экзамен не заменяют. Если вы уже учились в США, тест иногда не нужен.");

    /* Аттестат и HSE */
    if (first && d.nys && !d.asylee && !has(d.status, "u4u") && (a.edu === "none" || ((a.edu === "school_abroad" || a.edu === "some_college") && dreamStatus))) {
      var hse;
      if (a.edu === "none") hse = "Для поступления нужен школьный аттестат или его эквивалент, а нью-йоркский аттестат HSE ещё и открывает гранты штата по NYS DREAM Act. Если вы не оканчивали школу ни в США, ни в другой стране, HSE даёт право на ставку для жителей штата в CUNY и без EAD.";
      else hse = (a.edu === "some_college" ? "Если школу вы окончили в другой стране: **гранты штата (TAP) по NYS DREAM Act**" : "**Гранты штата (TAP) по NYS DREAM Act**") +
        " дают только с нью-йоркской школой или нью-йоркским аттестатом HSE, аттестат из своей страны не засчитывают" + (d.enrolled ? "." : ", хотя для поступления его хватит.") +
        " Прежде чем тратить время на экзамен, спросите в HESC (1-888-697-4372), подойдёт ли вам этот путь. Ставку для жителей штата в CUNY нью-йоркский HSE вам не даст, потому что школу вы уже окончили.";
      hse += " Сначала пройдите **одобренную штатом программу подготовки**: бесплатно готовят программы NYC Public Schools для взрослых с 21 года ([Adult Education](https://www.schools.nyc.gov/enrollment/other-ways-to-graduate/adult-education)), библиотеки и центры для взрослых при колледжах CUNY. Спросите в программе, одобрена ли она штатом для этой цели. Потом сдайте экзамен GED: для жителей штата он бесплатный, сдают его с 19 лет (с 16 до 18 лет нужно особое разрешение), только очно в тестовом центре, на английском или испанском ([GED в Нью-Йорке](https://www.ged.com/policies/new_york/)). Поступить нужно в течение пяти лет после HSE. Минюст США оспаривает этот путь в суде, но пока суд не решил, правила действуют.";
      add("prep", a.edu === "none" ? "Получите нью-йоркский аттестат HSE" : "Если хотите гранты штата, получите нью-йоркский аттестат HSE", hse);
    }
    if (first && a.edu === "school_abroad") add("prep", "Подготовьте аттестат с переводом",
      "Нужны аттестат о среднем образовании и приложение с оценками с **заверенным переводом на английский**. При поступлении в CUNY на associate degree или бакалавриат центр приёма заявок оценивает иностранные документы бесплатно, платить WES или ECE не нужно.");
    if (first && !d.enrolled) add("prep", "Наберите кредиты колледжа ещё до поступления",
      "**Modern States** даёт бесплатные онлайн-курсы и оплачивает экзамен CLEP, если вы набрали в среднем не меньше 75% по тестам курса и не меньше 75% на его итоговом экзамене, но некоторые экзаменационные центры берут ещё свой сбор ([Modern States](https://modernstates.org/faq/)). После бесплатных курсов Saylor итоговый экзамен в CUNY School of Professional Studies стоит **$5** ([CUNY SPS](https://sps.cuny.edu/academics/credit-prior-learning/credit-examination)). Засчитывать ли такие кредиты, решает колледж.");

    /* Документы для магистратуры и работы */
    if (((gradApply || (has(d.goals, "phd") && !d.enrolled)) && d.hasBachelor) || has(d.goals, "license")) add("prep", gradApply ? "Узнайте требования программы и закажите оценку диплома по предметам" : "Закажите оценку диплома, которую примут там, куда вы её подаёте",
      "Перед оплатой узнайте, отчёт какой компании и какого типа примут: например, магистратура City College не принимает WES ([City College](https://www.ccny.cuny.edu/admissions/gradinternational-applicants)). Для учёбы и лицензий нужна оценка **course-by-course** со средним баллом: $186 у WES и $199 у ECE, для работы часто хватает общей оценки за $118 или $110. Если диплом российский, WES требует, чтобы выписку прислал сам вуз, а **ECE принимает документы напрямую от вас** ([ECE](https://myece.org/doc-requirements?country=167)). Заказывайте один отчёт под все цели и сохраните его в электронном виде.");

    /* Поступление */
    if (first && !d.enrolled && d.nys) {
      var dd = cunyApplyDates();
      var trans = a.edu === "some_college";
      add("apply", "Подайте заявку в CUNY",
        "Одна заявка на сайте CUNY: " + (trans ? "вы учились после школы, поэтому подаёте как **transfer**, $70 и до четырёх колледжей" : "на первый курс **$65** и до шести колледжей") + ". Если вы живёте в штате и у вас низкий доход, плату могут отменить ([CUNY](https://www.cuny.edu/admissions/undergraduate/apply/)). Рекомендованный срок на осенний семестр " + dd.fallSem + " года — **до " + ruDate(dd.fall) + "**, на весенний семестр " + dd.springSem + " года — до " + ruDate(dd.spring) + ". Приём идёт круглый год: если срок прошёл, всё равно подайте заявку и спросите в приёмной комиссии колледжа, есть ли ещё места. Вопросы об иммиграционном статусе и SSN в заявке необязательные. В каждом колледже CUNY есть сотрудник, который помогает студентам-иммигрантам, к нему можно прийти ещё до заявки ([список](https://www.cuny.edu/about/administration/offices/student-affairs/programs-services/cuny-immigrant-student-success/undocumented-student-support/#cuny-liaisons)).");
      add("apply", "Начните с community college, если хотите сэкономить",
        "По ставке для жителей штата год в community college CUNY стоит **$4800**, а в четырёхлетнем колледже $6930, без сборов. Если вы окончите его со степенью AA или AS и сдадите математику и английский уровня колледжа не ниже чем на C, вас гарантированно примут в один из четырёхлетних колледжей CUNY, хотя не обязательно в выбранный, и засчитают не меньше 60 кредитов ([CUNY](https://www.cuny.edu/admissions/undergraduate/transfer/)).");
      if (a.edu !== "some_college" && (has(d.me, "lowinc") || has(d.me, "firstgen"))) add("apply", "Отметьте в заявке SEEK или College Discovery",
        "Если у вас низкий доход и вы впервые поступаете в колледж, это главные программы поддержки. SEEK в четырёхлетних колледжах CUNY и College Discovery в community colleges CUNY покрывают почти всю плату за обучение, учебники и проезд и дают стипендию, а EOP в SUNY требует учиться с полной нагрузкой. Нужно прожить в штате не меньше года, а для College Discovery не меньше года в самом городе" + (d.year ? "" : ", а вы пока живёте здесь меньше") + ". Подают **только при первом поступлении**, поэтому отметьте программу в заявке ([CUNY](https://www.cuny.edu/academics/academic-programs/seek-college-discovery/)).");
      if (+a.age >= 25 && +a.age <= 55) add("apply", "Узнайте про CUNY Reconnect и SUNY Reconnect",
        "Если вам 25–55 лет и у вас нет высшего образования, программа **оплачивает обучение, сборы, учебники и материалы** на associate degree по востребованным специальностям: технологии, медицина, инженерия, логистика и другие. С января 2027 года подойдёт и диплом в другой области. CUNY требует, чтобы вы жили в штате или платили по ставке для жителей штата, подали FAFSA или заявку NYS DREAM Act и TAP, если имеете на это право, и брали не меньше 6 кредитов в семестр ([CUNY Reconnect](https://www.cuny.edu/admissions/reconnect/)).");
    }
    if (studyNY && d.asylumTrack && a.ead === "c08") {
      if (d.year) add("apply", "После зачисления подтвердите ставку для жителей штата",
        "Подайте **CUNY Residency Form**, копию EAD и два документа с нью-йоркским адресом за первый и последний месяц из 12 месяцев, которые вы прожили в штате. EAD должен быть действующим, когда колледж это проверяет. Для community colleges CUNY нужно ещё прожить 6 месяцев в самом городе, а если вы живёте за его пределами, принести справку о проживании из своего округа ([правила CUNY](https://ccny.cuny.edu/immigrantstudentcenter/qualifying-state-tuition)).");
      else add("apply", "Сохраняйте документы с нью-йоркским адресом с первого месяца",
        "Ставку для жителей штата в CUNY дают после 12 месяцев жизни в штате до первого дня занятий. Для неё понадобятся два документа с адресом за первый и последний месяц из этих 12 месяцев ([правила CUNY](https://ccny.cuny.edu/immigrantstudentcenter/qualifying-state-tuition)).");
    }
    if (studyNY && d.asylumTrack && !d.enrolled && (a.ead === "no" || a.ead === "expired") && (first || grad)) add("apply", "Пока нет EAD, посмотрите SUNY",
      (first ? "Community colleges SUNY относят к жителям штата и тех, кто ждёт решения по убежищу ([SUNY](https://www.suny.edu/smarttrack/residency/cc/)). В четырёхлетних кампусах SUNY" : "В магистратуре SUNY") + " ставку для жителей штата тоже могут дать, если вы прожили в штате год, но до подачи заявки уточните это в бухгалтерии кампуса (bursar) и возьмите с собой уведомление о получении I-589, заявления на убежище.");
    if (first || gradApply) add("apply", "Если поступаете в частный вуз, подайте отдельную заявку на financial aid",
      "Скидку автоматически не дают: заявку подают через **CSS Profile** или форму вуза к сроку, который указан вместе со сроком подачи документов. Спросите письменно, к каким абитуриентам вас отнесут, к американским или иностранным: от этого зависит, какую помощь вам предложат. Если вы не общаетесь с родителями, семья не приняла вашу ориентацию или гендерную идентичность или связываться с родителями небезопасно, попросите учитывать только ваши доходы (**parental waiver**) до срока подачи заявки на помощь.");
    if (gradApply && a.ead === "no" && !d.asylee && !any(d.status, ["tps", "u4u", "i485"]) && d.asylumTrack) add("apply", "Магистратуру разумнее начать, когда получите EAD",
      "Без EAD государственные вузы берут плату как с иногородних, а колледж не возьмёт вас на зарплату. Время ожидания потратьте на английский, оценку диплома и экзамен GMAT или GRE.");
    if (grad && d.nys && (a.ead === "c08" || any(d.status, ["tps", "u4u", "i485"]))) add("apply", "Посчитайте магистратуру в CUNY с неполной нагрузкой",
      "По ставке для жителей штата кредит стоит **$470**, магистратура на 30 кредитов около $14 100 плюс сборы колледжа. У некоторых программ кредит дороже: MSW и MPH $620, MPA $545, MBA $725 ([CUNY](https://www.cuny.edu/financial-aid/tuition-and-college-costs/)). Учиться с неполной нагрузкой можно вместе с работой.");
    if ((gradApply || (has(d.goals, "phd") && !d.enrolled)) && d.workAuth) add("apply", "До подачи спросите программу о работе ассистентом",
      "С EAD колледж CUNY может взять вас на зарплату: ассистентом (graduate assistant), преподавателем с почасовой оплатой (adjunct) или помощником в администрации (college assistant) ([CUNY](https://www.cuny.edu/about/administration/offices/student-affairs/programs-services/cuny-immigrant-student-success/))." + (has(d.goals, "phd") && !d.asylee ? " Свои стипендии для докторантов, в том числе финансирование на пять лет, CUNY Graduate Center даёт только «квалифицированным иммигрантам», а пока ваше дело об убежище рассматривают, вы к ним не относитесь." : ""));

    /* Деньги */
    if (first && d.nys && !d.asylee && !has(d.status, "u4u") && dreamStatus) {
      if (a.edu === "school_us") add("money", "Спросите в HESC, можно ли вам получать TAP",
        "NYS DREAM Act засчитывает только нью-йоркскую школу или нью-йоркский аттестат HSE, а сдать HSE с аттестатом американской школы нельзя. Есть и третий путь: колледж SUNY или CUNY берёт с вас плату как с жителя штата по причине, не связанной с проживанием. Подойдёт ли он вам, спросите в HESC по телефону 1-888-697-4372 ([HESC](https://www.hesc.ny.gov/applying-aid/nys-dream-act/nys-dream-act-steps-apply)).");
      else {
        var ready = a.edu === "school_ny" || a.edu === "hse";
        add("money", ready ? "Подайте заявку NYS DREAM Act, потом TAP" : "После HSE подайте заявку NYS DREAM Act, потом TAP",
          "Создайте аккаунт на [портале NYS DREAM Act](https://nysdream.applyists.net/) и подайте заявку на право участвовать, это делается один раз. После одобрения подавайте на TAP **каждый год**: срок на 2026–2027 учебный год — 30 июня 2027 года. TAP даёт **от $1000 до $5665 в год**, если чистый налогооблагаемый доход до $30 000 у одиноких людей без иждивенцев, до $60 000 в браке без иждивенцев и до $125 000 с иждивенцами ([HESC](https://www.hesc.ny.gov/applying-aid/nys-dream-act/nys-dream-act-steps-apply)). Вопросы можно задать в чате портала или по телефону HESC 1-888-697-4372, по будням с 8:30 до 16:30.");
      }
    }
    if (any(d.goals, ["first", "grad", "phd"]) && d.asylee) add("money", "Подайте FAFSA",
      "С одобренным убежищем вам доступны федеральные гранты Pell и федеральные студенческие займы ([FSA Handbook](https://fsapartners.ed.gov/knowledge-center/fsa-handbook/2026-2027/vol1/ch2-us-citizenship-eligible-noncitizens)).");
    if (any(d.goals, ["first", "grad", "phd"]) && !d.asylee && has(d.status, "u4u")) add("money", "Подайте FAFSA",
      "С действующим паролем U4U или повторным паролем федеральную помощь можно получать, если вас впустили между 24 февраля 2022 и 30 сентября 2024 года, а если вы супруг, супруга или ребёнок такого человека, то и позже. Решает отдел финансовой помощи колледжа (financial aid office), и он попросит у вас действующую I-94 ([FSA Handbook](https://fsapartners.ed.gov/knowledge-center/fsa-handbook/2026-2027/vol1/ch2-us-citizenship-eligible-noncitizens)).");
    if (any(d.goals, ["first", "grad", "phd"]) || d.enrolled) add("money", "Подайте сразу на несколько стипендий",
      "Частные фонды обычно дают от нескольких сотен до нескольких тысяч долларов. Подходящие вам программы со сроками собраны ниже. На вопрос о статусе отвечайте честно (asylum applicant, asylum pending), а если такого варианта в форме нет, до подачи напишите фонду и спросите, можно ли вам участвовать. **Никогда не платите** за заявку или за «гарантированную» стипендию.");
    if (any(d.goals, ["first", "grad", "phd"]) || d.enrolled) add("money", "Подключите рассрочку до срока оплаты",
      "В CUNY плату за семестр делят на **2–6 ежемесячных платежей без процентов** и без проверки кредитной истории, подключение стоит $30 за семестр. Подключить её можно в CUNYfirst: Student Center → Financial Account → Payment Plan ([John Jay](https://www.jjay.cuny.edu/about/senior-leadership/finance-administration/bursar/tuition-and-fees/methods-payment/nelnet-payment-plan-cunyfirst)). Чем раньше вы запишетесь, тем больше будет платежей и тем меньше каждый из них. В SUNY и частных вузах рассрочку тоже дают, спросите в bursar.");
    if ((any(d.goals, ["first", "grad", "phd"]) || d.enrolled) && d.workAuth) add("money", "Спросите работодателя про оплату учёбы и верните часть расходов через налоги",
      "Если учёбу оплачивает работодатель, **до $5250 в год** не облагаются налогом, спросите в отделе кадров про tuition assistance ([IRS](https://www.irs.gov/newsroom/irs-updates-frequently-asked-questions-about-section-127-educational-assistance-programs)). Через налоговую декларацию American Opportunity Tax Credit возвращает до $2500 в год за первые четыре года высшего образования, а Lifetime Learning Credit до $2000 на декларацию. Оба вычета дают, если ваш доход меньше $90 000, а при совместной декларации меньше $180 000. Для обоих нужен SSN, действительный для работы. IRS прямо не ответила, подходит ли для этого карточка SSN, выданная по EAD, поэтому уточните это в бесплатном центре VITA ([NYC Free Tax Prep](https://www.nyc.gov/site/dca/talk-money/file-your-taxes.page)).");

    /* Профессия и лицензия */
    if (has(d.goals, "career") && d.workAuth && d.nyc) add("work", "Зарегистрируйтесь в Workforce1",
      "Центры Workforce1 оплачивают курсы короче года (транспорт, производство, IT, здравоохранение, охрана), если вы живёте в Нью-Йорке, вам от 18 лет, у вас есть право на работу, аттестат или его эквивалент и доход до $91 000. Опыт работы и образование из своей страны засчитывают, но одобрение не гарантировано ([Workforce1](https://www.nyc.gov/site/sbs/careers/training-grants.page)).");
    if (has(d.goals, "license")) {
      add("work", "Откройте страницу своей профессии на op.nysed.gov",
        "В Нью-Йорке лицензии выдаёт Департамент образования штата (NYSED). Правила штата запрещают отказывать в лицензии из-за статуса, если вы не находитесь в США незаконно, и CUNY относит сюда и вас, пока заявление на убежище рассматривают. Прежде чем платить за оценку диплома или курсы, проверьте требования на [op.nysed.gov](https://www.op.nysed.gov/).");
      if (has(d.fields, "health")) add("work", "Если вы медсестра, медбрат или врач, учтите особые правила",
        "Медсёстрам и медбратьям NYSED сначала оценивает образование, документы можно заранее проверить в TruMerit за $375 ([TruMerit](https://www.trumerit.org/services/authentication-and-verification/credential-verification-service-for-new-york-state/)), потом нужны два обязательных курса и экзамен NCLEX-RN." + (d.asylee ? "" : " Программы для медсестёр и медбратьев в CUNY **сейчас не принимают** тех, чьё заявление на убежище ещё рассматривают.") + " Врачам нужен сертификат ECFMG: экзамены USMLE Step 1 и Step 2 CK и OET Medicine, потом обычно резидентура ([ECFMG](https://www.ecfmg.org/certification/)).");
      if (has(d.fields, "edu")) add("work", "Если вы учитель или учительница, начните с аккаунта TEACH",
        "Сначала откройте аккаунт TEACH, подайте заявление и оплатите его, потом закажите оценку диплома. Отчёт оценочная компания отправляет сама на tcert@nysed.gov, от вас его не примут ([NYSED](https://www.nysed.gov/teaching-initiatives/submitting-foreign-credentials)).");
      if (has(d.fields, "law")) add("work", "Если вы юрист, подайте заявление в Board of Law Examiners до LL.M.",
        "Юридическое образование из России и большинства постсоветских стран основано на континентальном праве, поэтому для экзамена в коллегию адвокатов Нью-Йорка нужен LL.M. в американской школе права, одобренной ABA. Заявление на оценку образования подавайте хотя бы за год до экзамена: до 1 мая для февральского экзамена следующего года и до 1 октября для июльского экзамена следующего года, ответа можно ждать до шести месяцев ([Board of Law Examiners](https://www.nybarexam.org/foreign/NY%20Bar%20Exam%20Foreign%20Legal%20Education%20Handbook_10.30.2025.pdf)).");
    }
    return S;
  }

  /* ---------- when to talk to a lawyer ---------- */

  function buildLawyer(a, d) {
    var L = [];
    if (has(d.status, "asylum_court")) L.push("Ваше дело в иммиграционном суде, и пришло требование оплатить ежегодный сбор за убежище.");
    if (has(d.status, "b_visa")) L.push("Туристическая виза ещё действует, а вы хотите учиться: с визой B-1 или B-2 нельзя поступать на программу обучения, сначала нужен студенческий статус ([8 CFR 214.2(b)(7)](https://www.ecfr.gov/current/title-8/chapter-I/subchapter-B/part-214/section-214.2)).");
    if (has(d.status, "fj")) L.push("У вас была студенческая виза F-1 или виза J-1, и вы подали на убежище.");
    if (has(d.status, "cbp") || has(d.status, "u4u")) L.push("Пришло уведомление о прекращении пароля.");
    if (a.ead === "expired" || a.ead === "c08") L.push("EAD истекает, а продление ещё не одобрено.");
    if (any(d.goals, ["phd", "fellow"]) && !d.asylee) L.push("Грант или fellowship требует выехать из США или оформляет визу J-1: выезд без advance parole обычно считается отказом от заявления на убежище.");
    return L;
  }

  /* ---------- what most likely does not fit ---------- */

  var NOFIT = [
    { lv: ["ma", "law", "phd"], name: "Paul & Daisy Soros Fellowships for New Americans", why: "Только с гражданством, грин-картой, одобренным убежищем, статусом беженца или DACA, а также для детей иммигрантов и тех, кто окончил в США и школу, и колледж.", asyleeOk: true },
    { lv: ["ba", "ma"], name: "Columbia University Scholarship for Displaced Students", why: "На 2026–2027 учебный год заявки не принимает." },
    { lv: ["cc", "ba"], name: "Ascend Educational Fund", why: "Только для тех, кто в этом году оканчивает нью-йоркскую школу." },
    { lv: ["cc", "ba"], name: "IIE Odyssey Scholarship", why: "Кандидатов выдвигают отделения IIE в Латинской Америке, Юго-Восточной Азии и Африке." },
    { lv: ["ma", "phd"], name: "AAUW International Fellowships, P.E.O. International Peace Scholarship", why: "Ждут, что после учёбы вы вернётесь домой, а это противоречит делу об убежище." },
    { lv: ["cc", "ba", "ma", "law", "phd", "cert"], name: "Jeannette Rankin Foundation, WISP (Women's Independence Scholarship Program), P.E.O. Program for Continuing Education, AAUW American Fellowships и Career Development Grants, Leopold Schepp Foundation, Gamma Mu Foundation, Nurses Educational Funds, Imagine America Adult Skills Education Program, Toigo Fellowship", why: "Требуют гражданство или грин-карту." },
    { lv: ["ba", "ma"], field: "media", name: "Стипендии NLGJA имени Kay Longcope и Leroy F. Aarons", why: "Требуют гражданство или грин-карту." },
    { lv: ["cc", "ba", "ma"], name: "Hispanic Scholarship Fund, Islamic Scholarship Fund, Lagrant Foundation, Consortium for Graduate Study in Management", why: "Принимают людей с DACA, но не тех, чьё заявление на убежище ещё рассматривают." },
    { lv: ["ba", "ma", "phd"], name: "Hertz, GEM, DOE CSGF, Goldwater", why: "Требуют гражданство или грин-карту." },
    { lv: ["ba", "cc"], name: "Webb Institute, Alice Lloyd College, Olin College, Harvard Extension School", why: "Бесплатное обучение или помощь с учётом дохода только для граждан и обладателей грин-карты." },
    { lv: ["ma", "phd"], name: "Скидка на экзамен GRE (GRE Fee Reduction Program)", why: "Только для граждан и постоянных жителей США, которые подали FAFSA или получают пособие по безработице." },
    { lv: ["ma"], name: "Программы штата MSTI, MIE, McGee и списание займов социальным работникам", why: "Требуют гражданство или статус eligible noncitizen. Без такого статуса HESC предлагает сначала пройти проверку по NYS DREAM Act, а для неё нужны нью-йоркская школа или нью-йоркский аттестат HSE. MIE к тому же требует бакалавриат нью-йоркского вуза.", asyleeOk: true },
    { lv: ["phd"], name: "Стипендии CUNY Graduate Center для докторантов", why: "Только для «квалифицированных иммигрантов», а пока дело об убежище рассматривают, вы к ним не относитесь.", asyleeOk: true },
    { lv: ["cc", "ba", "ma"], name: "Займы MPOWER Financing", why: "Компания исчерпала средства и не выдаёт новые займы на 2026 год." },
    { lv: ["phd", "fel"], name: "Стипендии Kennan Institute для исследователей из России", why: "Сейчас приостановлены." },
    { lv: ["cc", "ba"], field: "health", name: "Программы для медсестёр и медбратьев в CUNY", why: "Принимают только людей с законным статусом, а тех, чьё заявление на убежище ещё рассматривают, в их списке нет.", asyleeOk: true }
  ];
  function buildNofit(a, d) {
    return NOFIT.filter(function (n) {
      if (n.asyleeOk && d.asylee) return false;
      if (n.field && !has(d.fields, n.field)) return false;
      return any(n.lv, d.lv);
    });
  }

  /* ---------- rendering ---------- */

  var app = document.getElementById("app");
  var answers = {};
  var stepIndex = -1; // -1 intro, 0..n-1 questions, n results
  var lastResult = null;

  function visibleQuestions() {
    return Q.filter(function (q) { return !q.when || q.when(answers); });
  }

  function go(i, push) {
    stepIndex = i;
    if (push !== false) { try { history.pushState({ i: i }, ""); } catch (e) { /* preview frames */ } }
    render();
  }
  window.addEventListener("popstate", function (e) {
    var i = e.state && typeof e.state.i === "number" ? e.state.i : -1;
    stepIndex = Math.min(i, visibleQuestions().length);
    render();
  });

  function render() {
    var qs = visibleQuestions();
    if (stepIndex < 0) renderIntro();
    else if (stepIndex >= qs.length) renderResults();
    else renderQuestion(qs[stepIndex], stepIndex, qs.length);
    window.scrollTo(0, 0);
    var h = app.querySelector("[data-focus]");
    if (h) h.focus({ preventScroll: true });
  }

  function renderIntro() {
    app.innerHTML =
      '<section class="intro">' +
      '<p class="eyebrow"><span class="flag" style="--f:var(--q-red)"></span>Учёба в США</p>' +
      '<h1 tabindex="-1" data-focus>Какие стипендии и программы вам подходят</h1>' +
      '<p class="lead">Ответьте на несколько вопросов, это займёт около трёх минут. В конце вы увидите стипендии и программы, которые вам подходят, свои шаги и ближайшие сроки, и сможете скачать план в PDF.</p>' +
      '<ul class="ticks">' +
      "<li>Тест для вас, если вы живёте в Нью-Йорке и ждёте решения по убежищу, въехали по паролю или вышли из задержания с I-220A.</li>" +
      "<li>Ответы остаются на вашем телефоне или компьютере: мы их не видим и никуда не отправляем.</li>" +
      "<li>Всё основано на гиде QARAVAN, где факты, суммы и сроки проверены по официальным сайтам на " + ruDate(DATA_DATE) + ".</li>" +
      "</ul>" +
      '<button type="button" class="btn" id="start">Начать</button>' +
      '<p class="small">Это первая версия теста, она не заменяет юридическую консультацию. <a href="' + GUIDE_URL + '">Полный гид в PDF</a></p>' +
      "</section>";
    document.getElementById("start").addEventListener("click", function () { go(0); });
  }

  function optionHtml(q, o, type, checked) {
    var id = "o-" + q.id + "-" + o[0];
    return '<label class="opt" for="' + id + '"><input type="' + (type === "multi" ? "checkbox" : "radio") + '" id="' + id + '" name="' + q.id + '" value="' + esc(o[0]) + '"' + (checked ? " checked" : "") + '>' +
      '<span class="box" aria-hidden="true"></span><span class="ot">' + esc(o[1]) + (o[2] ? "<small>" + esc(o[2]) + "</small>" : "") + "</span></label>";
  }

  function renderQuestion(q, i, n) {
    var val = answers[q.id];
    var body = "";
    if (q.type === "single" || q.type === "multi") {
      body = '<fieldset class="opts"><legend class="sr">' + esc(q.title) + "</legend>" + q.options.map(function (o) {
        return optionHtml(q, o, q.type, q.type === "multi" ? has(val, o[0]) : val === o[0]);
      }).join("") + "</fieldset>";
    } else if (q.type === "select") {
      body = '<label class="sr" for="sel">' + esc(q.title) + '</label><select id="sel" class="sel"><option value="">Выберите</option>' +
        Object.keys(CUNY).map(function (g) {
          return '<optgroup label="' + esc(g) + '">' + CUNY[g].map(function (o) {
            return '<option value="' + o[0] + '"' + (val === o[0] ? " selected" : "") + ">" + esc(o[1]) + "</option>";
          }).join("") + "</optgroup>";
        }).join("") + "</select>";
    } else if (q.type === "number") {
      body = '<label class="sr" for="num">' + esc(q.title) + '</label><input id="num" class="num" type="number" inputmode="numeric" min="14" max="99" placeholder="Например, 29" value="' + (val ? esc(val) : "") + '">';
    }
    var pct = Math.round((i / n) * 100);
    app.innerHTML =
      '<form class="q" novalidate>' +
      '<div class="bar" role="progressbar" aria-label="Прогресс" aria-valuemin="0" aria-valuemax="' + n + '" aria-valuenow="' + i + '"><i style="width:' + pct + '%"></i></div>' +
      '<p class="eyebrow"><span class="flag" style="--f:var(--q-red)"></span>Вопрос ' + (i + 1) + " из " + n + "</p>" +
      '<h1 tabindex="-1" data-focus>' + esc(q.title) + "</h1>" +
      (q.hint ? '<p class="hint">' + esc(q.hint) + "</p>" : "") +
      body +
      '<p class="err" role="alert" hidden></p>' +
      '<div class="nav"><button type="button" class="btn ghost" id="back">Назад</button>' +
      '<button type="submit" class="btn" id="next">' + (q.optional && !(val && val.length) ? "Пропустить" : "Дальше") + "</button></div>" +
      "</form>";
    var form = app.querySelector("form");
    var nextBtn = document.getElementById("next");

    function read() {
      if (q.type === "multi") return Array.prototype.map.call(form.querySelectorAll("input:checked"), function (x) { return x.value; });
      if (q.type === "single") { var c = form.querySelector("input:checked"); return c ? c.value : null; }
      if (q.type === "select") return document.getElementById("sel").value || null;
      if (q.type === "number") { var v = document.getElementById("num").value.trim(); return v ? String(Math.round(+v)) : null; }
    }
    function valid(v) {
      if (q.optional) return true;
      if (q.type === "multi") return v && v.length;
      if (q.type === "number") return v && +v >= 14 && +v <= 99;
      return !!v;
    }
    function advance() {
      var v = read();
      var err = form.querySelector(".err");
      if (!valid(v)) {
        err.textContent = q.type === "number" ? "Укажите возраст числом от 14 до 99." : q.type === "multi" ? "Отметьте хотя бы один вариант." : "Выберите вариант.";
        err.hidden = false;
        return;
      }
      answers[q.id] = v;
      if (q.id === "fields" && v && v.length > 1 && has(v, "unknown")) answers[q.id] = v.filter(function (x) { return x !== "unknown"; });
      var qs = visibleQuestions();
      var idx = qs.indexOf(q);
      go(idx + 1);
    }
    form.addEventListener("submit", function (e) { e.preventDefault(); advance(); });
    document.getElementById("back").addEventListener("click", function () { go(i - 1); });
    if (q.type === "single") {
      form.addEventListener("click", function (e) {
        var lab = e.target.closest && e.target.closest("label.opt");
        if (lab && e.detail > 0) setTimeout(advance, 160);
      });
    }
    if (q.type === "multi") {
      form.addEventListener("change", function (e) {
        if (q.id === "fields" && e.target.value === "unknown" && e.target.checked) {
          Array.prototype.forEach.call(form.querySelectorAll("input"), function (x) { if (x.value !== "unknown") x.checked = false; });
        } else if (q.id === "fields" && e.target.checked) {
          var u = form.querySelector('input[value="unknown"]'); if (u) u.checked = false;
        }
        if (q.optional) nextBtn.textContent = form.querySelector("input:checked") ? "Дальше" : "Пропустить";
        form.querySelector(".err").hidden = true;
      });
    }
  }

  /* answer summary lines, shared by page and PDF */
  function summary(a) {
    function lab(id, v) {
      var q = Q.filter(function (x) { return x.id === id; })[0];
      var o = q && q.options && q.options.filter(function (x) { return x[0] === v; })[0];
      return o ? o[1] : v;
    }
    function labs(id, vs) { return (vs || []).map(function (v) { return lab(id, v); }).join("; "); }
    var college = "";
    if (a.college) Object.keys(CUNY).forEach(function (g) { CUNY[g].forEach(function (o) { if (o[0] === a.college) college = o[1]; }); });
    var rows = [
      ["Цель", labs("goals", a.goals)],
      ["Образование", lab("edu", a.edu)],
      ["Учёба сейчас", lab("enrolled", a.enrolled) + (college ? ", " + college : "")],
      ["Статус", labs("status", a.status)],
      ["Разрешение на работу", lab("ead", a.ead)],
      ["Где вы живёте", lab("res", a.res)],
      ["Возраст", a.age],
      ["Английский", lab("english", a.english)]
    ];
    if (a.fields && a.fields.length) rows.push(["Специальности", labs("fields", a.fields)]);
    return rows.filter(function (r) { return r[1]; });
  }

  var GROUPS = [
    ["top", "Подходят именно вам", "Отобраны по вашим ответам, сначала то, что закрывается раньше."],
    ["open", "Открыты почти для всех", "Стипендии, конкурсы эссе и помощь вузов почти без особых условий."],
    ["study", "Когда поступите", "Сюда подают только студенты нужной ступени или нужного колледжа, поэтому подать заявку можно будет после поступления."],
    ["ead", "Когда получите разрешение на работу", "Эти программы берут только с EAD."],
    ["employer", "Если вы работаете в этой компании", ""],
    ["field", "Если выберете эту специальность", "Вы пока не выбрали специальность, а эти стипендии дают только по отдельным областям."]
  ];
  var SEC = { state: "Вузы в других штатах", adult: "Бакалавриат для взрослых", transfer: "Перевод в сильный вуз", credits: "Кредиты колледжа бесплатно", free: "Бесплатная учёба", english: "Английский", "career-it": "Профессия: IT и офис", "career-trade": "Профессия: медицина, стройка, кухня", "career-youth": "Профессия: для молодёжи", license: "Диплом и лицензия", lgbt: "Для ЛГБТК+ людей", women: "Для женщин и взрослых студентов", any: "Для любых специальностей", field: "По специальности", origin: "По происхождению", private: "Частные вузы и SUNY", cuny: "CUNY", emergency: "Экстренная помощь", nysaid: "Программы штата", loan: "Беспроцентный заём", bold: "Bold.org", grad: "Магистратура", phd: "Докторантура и исследования", fellow: "Fellowship", work: "Учёба за счёт работы" };
  var SEC_FLAG = { lgbt: "--q-purple", women: "--q-purple", english: "--q-sky", "career-it": "--q-sky", "career-trade": "--q-sky", "career-youth": "--q-sky", license: "--q-sky", fellow: "--q-orange", work: "--q-green", emergency: "--q-green", loan: "--q-green" };

  function deadlineText(m) {
    if (m.passed) return "Срок прошёл, следите за следующим набором";
    if (m.next) {
      var n = daysBetween(TODAY, m.next);
      return "До " + ruDate(m.next) + (n === 0 ? ", последний день" : ", " + plural(n, "остался", "осталось", "осталось") + " " + n + " " + plural(n, "день", "дня", "дней"));
    }
    if (m.opens) return "Приём откроется " + ruDate(m.opens);
    return "";
  }

  function whenText(p) {
    return p.when && !/^(Сроки? (в гиде |на сайте )?не указан|Срок не указан)/i.test(p.when) ? p.when : "";
  }

  function card(m) {
    var p = m.p;
    var dl = deadlineText(m);
    var urgent = m.next && daysBetween(TODAY, m.next) <= 14;
    var links = [p.url].concat((p.urls || []).map(function (x) { return x.url; }));
    return '<article class="card' + (m.passed ? " dim" : "") + '">' +
      '<p class="eyebrow sm"><span class="flag" style="--f:var(' + (SEC_FLAG[p.sec] || "--q-red") + ')"></span>' + esc(SEC[p.sec] || "") + "</p>" +
      '<h3><a href="' + esc(safeUrl(p.url)) + '" target="_blank" rel="noopener">' + esc(p.name) + "</a></h3>" +
      '<p class="amt">' + esc(p.amount) + "</p>" +
      (dl ? '<p class="dl' + (urgent ? " urgent" : "") + '">' + esc(dl) + "</p>" : "") +
      (m.why.length ? '<p class="why"><span>Подходит вам:</span> ' + m.why.map(esc).join(", ") + "</p>" : "") +
      m.warn.map(function (w) { return '<p class="warn">' + esc(w) + "</p>"; }).join("") +
      '<details class="more"><summary>Условия и ссылка</summary>' +
      (whenText(p) ? '<p class="when">' + esc(whenText(p)) + "</p>" : "") +
      '<p class="who">' + esc(p.who) + "</p>" +
      '<p class="url">' + links.map(function (u) { return '<a href="' + esc(safeUrl(u)) + '" target="_blank" rel="noopener">' + esc(shortUrl(u)) + "</a>"; }).join("<br>") + "</p>" +
      "</details></article>";
  }

  var PHASES = [["first", "Сначала"], ["prep", "Подготовка"], ["apply", "Поступление"], ["money", "Деньги на учёбу"], ["work", "Работа и профессия"]];

  function renderResults() {
    var R = results(answers);
    lastResult = R;
    var total = 0;
    GROUPS.forEach(function (g) { total += R.groups[g[0]].length; });
    var nTop = R.groups.top.length;
    var h = "";
    h += '<section class="res-head">' +
      '<p class="eyebrow"><span class="flag" style="--f:var(--q-red)"></span>Ваш план</p>' +
      '<h1 tabindex="-1" data-focus>Что вам подходит и что делать дальше</h1>' +
      '<p class="lead">' + (nTop ? "Именно вам " + plural(nTop, "подходит", "подходят", "подходят") + " " + nTop + " " + plural(nTop, "программа", "программы", "программ") + (total > nTop ? ", ещё " + (total - nTop) + " " + plural(total - nTop, "вариант собран", "варианта собраны", "вариантов собраны") + " ниже по группам" : "") + ". " : "") + "Условия программ меняются, поэтому перед подачей проверяйте их на сайте программы.</p>" +
      '<div class="actions"><button type="button" class="btn" id="pdf">Скачать план в PDF</button><button type="button" class="btn ghost" id="again">Пройти заново</button></div>' +
      '<p class="pdf-status small" role="status" aria-live="polite"></p>' +
      "</section>";
    h += '<nav class="toc" aria-label="Разделы плана">' + (R.facts.length ? '<a href="#facts">Главное</a>' : "") + '<a href="#steps">Шаги</a>' + (R.soon.length ? '<a href="#soon">Сроки</a>' : "") + '<a href="#programs">Программы</a></nav>';
    if (R.facts.length) h += '<section id="facts" class="blk"><h2>Главное в вашей ситуации</h2><ul class="facts">' + R.facts.map(function (f) { return "<li>" + md(f) + "</li>"; }).join("") + "</ul></section>";
    if (R.soon.length) h += '<section id="soon" class="blk"><h2>Ближайшие сроки</h2><ul class="soon">' + R.soon.map(function (m) {
      return '<li><span class="d">' + esc(ruDate(m.next, false)) + '</span><span class="n"><a href="#' + esc(m.p.id) + '">' + esc(m.p.name) + "</a><small>" + esc(m.p.amount) + "</small></span></li>";
    }).join("") + "</ul></section>";
    if (R.steps.length) {
      var num = 0;
      h += '<section id="steps" class="blk"><h2>Ваши шаги</h2><p class="small">Нажмите на шаг, чтобы прочитать подробности. В PDF все шаги раскрыты.</p>';
      PHASES.forEach(function (ph) {
        var ss = R.steps.filter(function (s) { return s.phase === ph[0]; });
        if (!ss.length) return;
        h += '<h3 class="phase">' + ph[1] + '</h3><ol class="steps" start="' + (num + 1) + '">' + ss.map(function (s) {
          num++;
          return '<li><details><summary class="st">' + md(s.title) + '</summary><p>' + md(s.body) + "</p></details></li>";
        }).join("") + "</ol>";
      });
      h += "</section>";
    }
    h += '<section id="programs" class="blk"><h2>Стипендии и программы</h2>';
    if (!total) h += '<p>По вашим ответам мы не нашли программ из гида. Посмотрите общие списки стипендий без требований к гражданству, например <a href="https://immigrantsrising.org/resource/list-of-scholarships-and-fellowships/" target="_blank" rel="noopener">Immigrants Rising</a>, и полный гид.</p>';
    GROUPS.forEach(function (g) {
      var list = R.groups[g[0]];
      if (!list.length) return;
      var open = g[0] === "top" || (g[0] === "open" && !R.groups.top.length);
      h += '<details class="grp"' + (open ? " open" : "") + '><summary><span class="gt">' + esc(g[1]) + '</span><span class="cnt">' + list.length + "</span></summary>" +
        (g[2] ? '<p class="small">' + esc(g[2]) + "</p>" : "") +
        '<div class="cards">' + list.map(function (m) { return card(m).replace("<article", '<article id="' + esc(m.p.id) + '"'); }).join("") + "</div></details>";
    });
    h += "</section>";
    if (R.nofit.length) h += '<section class="blk"><h2>Что вам, скорее всего, не подходит</h2><p class="small">Эти программы часто советуют, но с вашим статусом они вам, скорее всего, закрыты.</p><ul class="nofit">' +
      R.nofit.map(function (n) { return "<li><b>" + esc(n.name) + "</b> " + esc(n.why) + "</li>"; }).join("") + "</ul></section>";
    if (R.lawyer.length) h += '<section class="blk"><h2>Когда обязательно поговорить с адвокатом</h2><ul class="facts">' + R.lawyer.map(function (l) { return "<li>" + md(l) + "</li>"; }).join("") +
      '</ul><p class="small">CUNY Citizenship Now! бесплатно и конфиденциально консультирует жителей Нью-Йорка. Делами об убежище программа не занимается, но помогает с TPS, продлением документов и освобождением от сборов: 646-664-9400, <a href="https://www.cuny.edu/about/administration/offices/communications-marketing/citizenship-now/" target="_blank" rel="noopener">сайт</a>.</p></section>';
    h += '<section class="blk end"><p>Здесь собрано то, что подходит вам по вашим ответам. Всё остальное, в том числе как устроены вузы, сколько стоит учёба и как подтвердить диплом, есть в <a href="' + GUIDE_URL + '">полном гиде QARAVAN</a>.</p>' +
      '<p class="small">Это первая версия теста. Данные гида проверены по состоянию на ' + ruDate(DATA_DATE) + ". Тест не заменяет консультацию иммиграционного адвоката.</p>" +
      '<div class="actions"><button type="button" class="btn" id="pdf2">Скачать план в PDF</button><button type="button" class="btn ghost" id="edit">Изменить ответы</button></div></section>';
    app.innerHTML = h;
    app.querySelectorAll('.soon a[href^="#"]').forEach(function (l) {
      l.addEventListener("click", function (e) {
        var t = document.getElementById(l.getAttribute("href").slice(1));
        if (!t) return;
        e.preventDefault();
        var g = t.closest("details.grp"); if (g) g.open = true;
        t.scrollIntoView({ block: "start" });
        var a2 = t.querySelector("h3 a"); if (a2) a2.focus({ preventScroll: true });
      });
    });
    document.getElementById("pdf").addEventListener("click", makePdf);
    document.getElementById("pdf2").addEventListener("click", makePdf);
    document.getElementById("again").addEventListener("click", function () { answers = {}; go(-1); });
    document.getElementById("edit").addEventListener("click", function () { go(0); });
    preloadPdf();
  }

  /* ---------- PDF ---------- */

  var pdfReady = null;
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = function () { rej(new Error("load " + src)); };
      document.head.appendChild(s);
    });
  }
  function toB64(buf) {
    var bytes = new Uint8Array(buf), bin = "", CH = 0x8000;
    for (var i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(bin);
  }
  var FONT_FILES = ["FiraSans-Regular.ttf", "FiraSans-Medium.ttf", "FiraSans-SemiBold.ttf", "FiraSansCondensed-Bold.ttf"];
  var LOGO_SVG = null;
  function preloadPdf() {
    if (pdfReady) return pdfReady;
    pdfReady = loadScript("vendor/pdfmake.min.js").then(function () {
      return Promise.all(FONT_FILES.map(function (f) {
        return fetch("fonts/" + f).then(function (r) { if (!r.ok) throw new Error(f); return r.arrayBuffer(); });
      }).concat([fetch("/assets/logo-wordmark.svg").then(function (r) { return r.text(); })]));
    }).then(function (bufs) {
      var vfs = {};
      FONT_FILES.forEach(function (f, i) { vfs[f] = toB64(bufs[i]); });
      LOGO_SVG = bufs[FONT_FILES.length].replace(/<metadata>[\s\S]*?<\/metadata>/, "");
      window.pdfMake.vfs = vfs;
      window.pdfMake.fonts = {
        Fira: { normal: "FiraSans-Regular.ttf", bold: "FiraSans-SemiBold.ttf", italics: "FiraSans-Regular.ttf", bolditalics: "FiraSans-SemiBold.ttf" },
        FiraMed: { normal: "FiraSans-Medium.ttf", bold: "FiraSans-SemiBold.ttf", italics: "FiraSans-Medium.ttf", bolditalics: "FiraSans-SemiBold.ttf" },
        FiraCond: { normal: "FiraSansCondensed-Bold.ttf", bold: "FiraSansCondensed-Bold.ttf", italics: "FiraSansCondensed-Bold.ttf", bolditalics: "FiraSansCondensed-Bold.ttf" }
      };
    });
    pdfReady.catch(function () { pdfReady = null; });
    return pdfReady;
  }

  var INK = "#333333", MUTED = "#5e5a53", LINE = "#ece8de", SKY = "#0099cc", RED = "#ff3333";

  /* [text](url) and **bold** to pdfmake inline runs; links keep a visible address */
  function runs(s) {
    var out = [], re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g, last = 0, m;
    while ((m = re.exec(s))) {
      if (m.index > last) out.push({ text: s.slice(last, m.index) });
      if (m[1]) out.push({ text: m[1] + " (" + shortUrl(m[2]).split("/")[0] + ")", link: m[2], color: SKY });
      else out.push({ text: m[3], bold: true });
      last = re.lastIndex;
    }
    if (last < s.length) out.push({ text: s.slice(last) });
    return out;
  }

  function checkbox() {
    return { canvas: [{ type: "rect", x: 0, y: 1.5, w: 9, h: 9, lineWidth: 0.9, lineColor: INK }], width: 16 };
  }

  function docDefinition(R, a) {
    var c = [];
    var made = ruDate(TODAY);
    c.push({ columns: [{ svg: LOGO_SVG, width: 96 }, { text: "Учёба в США\nevents.qaravan.org/quiz", alignment: "right", fontSize: 8, color: MUTED, lineHeight: 1.25 }], margin: [0, 0, 0, 18] });
    c.push({ text: "Ваш план: учёба в США", style: "h1" });
    c.push({ text: "Составлен " + made + " по вашим ответам в тесте QARAVAN. Условия программ меняются, поэтому перед подачей проверяйте их на сайтах. План не заменяет консультацию иммиграционного адвоката.", style: "lead" });
    c.push({
      table: { widths: [110, "*"], body: summary(a).map(function (r) { return [{ text: r[0], color: MUTED, fontSize: 8.5 }, { text: String(r[1]), fontSize: 8.5 }]; }) },
      layout: { hLineWidth: function () { return 0.6; }, vLineWidth: function () { return 0; }, hLineColor: function () { return LINE; }, paddingTop: function () { return 3; }, paddingBottom: function () { return 3; }, paddingLeft: function () { return 0; } },
      margin: [0, 0, 0, 14]
    });
    if (R.facts.length) {
      c.push({ text: "Главное в вашей ситуации", style: "h2", headlineLevel: 1 });
      c.push({ ul: R.facts.map(function (f) { return { text: runs(f), margin: [0, 0, 0, 4] }; }), margin: [0, 0, 0, 10] });
    }
    if (R.soon.length) {
      c.push({ text: "Ближайшие сроки", style: "h2", headlineLevel: 1 });
      c.push({
        table: { widths: [70, "*", 120], body: R.soon.map(function (m) { return [{ text: ruDate(m.next, false), bold: true }, { text: m.p.name, link: m.p.url }, { text: m.p.amount.length <= 48 ? m.p.amount : "", color: MUTED, fontSize: 8.5 }]; }) },
        layout: { hLineWidth: function () { return 0.6; }, vLineWidth: function () { return 0; }, hLineColor: function () { return LINE; }, paddingTop: function () { return 4; }, paddingBottom: function () { return 4; }, paddingLeft: function () { return 0; } },
        margin: [0, 0, 0, 12]
      });
    }
    if (R.steps.length) {
      c.push({ text: "Ваши шаги", style: "h2", headlineLevel: 1, pageBreak: R.soon.length > 6 ? "before" : undefined });
      var n = 0;
      PHASES.forEach(function (ph) {
        var ss = R.steps.filter(function (s) { return s.phase === ph[0]; });
        if (!ss.length) return;
        c.push({ text: ph[1].toUpperCase(), style: "phase", headlineLevel: 1 });
        ss.forEach(function (s) {
          n++;
          c.push({
            columns: [checkbox(), { stack: [{ text: n + ". " + s.title.replace(/\*\*/g, ""), bold: true, margin: [0, 0, 0, 2] }, { text: runs(s.body), color: INK }] }],
            columnGap: 2, margin: [0, 0, 0, 8], unbreakable: true
          });
        });
      });
    }
    var groups = GROUPS.filter(function (g) { return g[0] !== "field" && R.groups[g[0]].length; });
    if (groups.length) c.push({ text: "Стипендии и программы", style: "h2", headlineLevel: 1, pageBreak: "before" });
    groups.forEach(function (g) {
      c.push({ text: g[1], style: "h3", headlineLevel: 1 });
      if (g[2]) c.push({ text: g[2], fontSize: 8.5, color: MUTED, margin: [0, -2, 0, 8] });
      var full = g[0] === "top";
      R.groups[g[0]].forEach(function (m) {
        var p = m.p, dl = deadlineText(m);
        if (!full) {
          c.push({ columns: [checkbox(), { stack: [
            { text: p.name, link: p.url, bold: true },
            { text: [p.amount, dl ? ". " + dl : ""].join(""), fontSize: 8.5 },
            { text: p.url, link: p.url, color: SKY, fontSize: 8 }
          ] }], columnGap: 2, margin: [0, 0, 0, 7], unbreakable: true });
          return;
        }
        var stack = [
          { text: (SEC[p.sec] || "").toUpperCase(), fontSize: 6.5, color: MUTED, characterSpacing: 0.6 },
          { text: p.name, link: p.url, font: "FiraCond", fontSize: 11.5, margin: [0, 1, 0, 2] },
          { text: p.amount, bold: true, fontSize: 9 }
        ];
        if (dl) stack.push({ text: dl, bold: true, fontSize: 9 });
        if (whenText(p)) stack.push({ text: whenText(p), fontSize: 8.5, color: MUTED });
        stack.push({ text: p.who, fontSize: 8.5, margin: [0, 2, 0, 0] });
        m.warn.forEach(function (w) { stack.push({ text: w, fontSize: 8.5, bold: true }); });
        [p.url].concat((p.urls || []).map(function (x) { return x.url; })).forEach(function (u) {
          stack.push({ text: u, link: u, color: SKY, fontSize: 8 });
        });
        c.push({ columns: [checkbox(), { stack: stack }], columnGap: 2, margin: [0, 0, 0, 10], unbreakable: true });
      });
    });
    if (R.lawyer.length) {
      c.push({ text: "Когда обязательно поговорить с адвокатом", style: "h2", headlineLevel: 1 });
      c.push({ ul: R.lawyer.map(function (l) { return { text: runs(l), margin: [0, 0, 0, 3] }; }) });
      c.push({ text: "CUNY Citizenship Now! бесплатно и конфиденциально консультирует жителей Нью-Йорка: делами об убежище программа не занимается, но помогает с TPS, продлением документов и освобождением от сборов. 646-664-9400.", fontSize: 8.5, color: MUTED, margin: [0, 6, 0, 0] });
    }
    c.push({ text: [{ text: "Полный гид QARAVAN «Учёба в США для просителей убежища»: " }, { text: "events.qaravan.org/oct19", link: GUIDE_URL, color: SKY }, { text: ". Данные проверены по состоянию на " + ruDate(DATA_DATE) + ". Это первая версия теста." }], fontSize: 8.5, color: MUTED, margin: [0, 16, 0, 0] });
    return {
      pageSize: "LETTER",
      pageMargins: [50, 46, 50, 52],
      info: { title: "Ваш план: учёба в США", author: "QARAVAN", subject: "Составлен " + made },
      defaultStyle: { font: "Fira", fontSize: 9.5, lineHeight: 1.3, color: INK },
      styles: {
        h1: { font: "FiraCond", fontSize: 24, lineHeight: 1.05, margin: [0, 0, 0, 6] },
        lead: { fontSize: 9.5, color: MUTED, margin: [0, 0, 0, 12] },
        h2: { font: "FiraCond", fontSize: 15, margin: [0, 6, 0, 8] },
        h3: { font: "FiraCond", fontSize: 12, margin: [0, 4, 0, 6] },
        phase: { font: "FiraMed", fontSize: 7.5, characterSpacing: 1, color: RED, margin: [0, 4, 0, 6] }
      },
      pageBreakBefore: function (node, following) {
        return !!node.headlineLevel && following.length < 3;
      },
      footer: function (cur, count) {
        return { columns: [{ text: "QARAVAN, events.qaravan.org/quiz", color: MUTED }, { text: cur + " / " + count, alignment: "right", color: MUTED }], fontSize: 7.5, margin: [50, 18, 50, 0] };
      },
      content: c
    };
  }

  function makePdf() {
    var st = app.querySelector(".pdf-status");
    if (st) st.textContent = "Готовим PDF…";
    preloadPdf().then(function () {
      var dd = docDefinition(lastResult, answers);
      window.pdfMake.createPdf(dd).download("QARAVAN-plan-ucheby-" + TODAY + ".pdf", function () {
        if (st) st.textContent = "PDF скачан.";
      });
    }).catch(function () {
      if (st) st.textContent = "Не получилось сделать PDF. Обновите страницу и попробуйте ещё раз.";
    });
  }

  /* test hook for automated checks; harmless in the browser */
  window.QV = { answers: function (a) { answers = a; }, results: function (a) { return results(a); }, docDefinition: function (a) { return docDefinition(results(a), a); }, go: go };

  try { history.replaceState({ i: -1 }, ""); } catch (e) { /* ignore */ }
  render();
})();
