/* Crew Call languages.
   The app is written in English. This file translates what's on screen into the chosen
   language, and switches back without a reload. Translations live in tools/i18n/*.txt
   and are built into i18n-dict.js by tools/build_i18n.py. Anything people type themselves
   (titles, loglines, bios, messages) stays as written. */
(function () {
  "use strict";
  const D = window.CC_I18N || { words: {}, patterns: [] };
  const LANGS = [
    { code: "en", label: "English", short: "EN" },
    { code: "zh-Hant", label: "繁體中文", short: "繁" },
    { code: "zh-Hans", label: "简体中文", short: "简" },
    { code: "fr", label: "Français", short: "FR" },
    { code: "es", label: "Español", short: "ES" },
    { code: "ru", label: "Русский", short: "RU" },
    { code: "ar", label: "العربية", short: "ع" },
    { code: "hi", label: "हिन्दी", short: "हि" },
    { code: "pt", label: "Português", short: "PT" }
  ];
  const IDX = { "zh-Hant": 0, "zh-Hans": 1, fr: 2, es: 3, ru: 4, ar: 5, hi: 6, pt: 7 };
  // Unicode CLDR, built into every browser through Intl, gives each language's own name for itself.
  // So adding a language only needs its code; the label is filled in from CLDR if it's left out.
  LANGS.forEach(l => { if (!l.label) { try { l.label = new Intl.DisplayNames([l.code], { type: "language" }).of(l.code); } catch (e) { l.label = l.code; } } });
  // Translations added while the app runs: admins' fixes and Wikidata role names (see Admin, Languages).
  // Live version: loaded from Supabase. Each entry is English -> { "fr": "...", "ru": "...", ... }.
  const EXTRA = {};
  // The choice is kept for this visit. Once Supabase is connected, save it on the person's profile instead.
  let saved = null;
  function store(get, v) {
    if (get) return saved;
    saved = v;
  }
  function guess() {
    const list = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "en"]).map(x => String(x).toLowerCase());
    for (const l of list) {
      if (/^zh-(tw|hk|mo|hant)/.test(l)) return "zh-Hant";
      if (/^zh/.test(l)) return "zh-Hans";
      if (/^fr/.test(l)) return "fr";
      if (/^es/.test(l)) return "es";
      if (/^ru/.test(l)) return "ru";
      if (/^ar/.test(l)) return "ar";
      if (/^hi/.test(l)) return "hi";
      if (/^pt/.test(l)) return "pt";
      if (/^en/.test(l)) return "en";
    }
    return "en";
  }
  let lang = store(true) || guess();
  if (!LANGS.some(l => l.code === lang)) lang = "en";

  // ---------- dates ----------
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const L = {
    fr: { mon: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."], full: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"], wd: ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."] },
    es: { mon: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"], full: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"], wd: ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"] },
    ru: { mon: ["янв.", "февр.", "мар.", "апр.", "мая", "июн.", "июл.", "авг.", "сент.", "окт.", "нояб.", "дек."], full: ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"], wd: ["пн", "вт", "ср", "чт", "пт", "сб", "вс"] },
    ar: { mon: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"], full: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"], wd: ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"] },
    hi: { mon: ["जन॰", "फ़र॰", "मार्च", "अप्रैल", "मई", "जून", "जुल॰", "अग॰", "सित॰", "अक्तू॰", "नव॰", "दिस॰"], full: ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्तूबर", "नवंबर", "दिसंबर"], wd: ["सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि", "रवि"] },
    pt: { mon: ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."], full: ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"], wd: ["seg.", "ter.", "qua.", "qui.", "sex.", "sáb.", "dom."] }
  };
  // Month and weekday names come from the browser's built-in Unicode CLDR data (open source locale
  // data used by every major browser), so a new language needs no date tables. The lists above are a
  // fallback for very old browsers and match what CLDR gives.
  const fromCLDR = l => {
    try {
      const f = (o) => new Intl.DateTimeFormat(l, Object.assign({ timeZone: "UTC" }, o));
      const day = i => new Date(Date.UTC(2026, i, 15)), dm = f({ day: "numeric", month: "short" }), fl = f({ month: "long" }), wd = f({ weekday: "short" });
      return {
        mon: MON.map((_, i) => dm.formatToParts(day(i)).find(p => p.type === "month").value),
        full: MON.map((_, i) => fl.format(day(i))),
        wd: WD.map((_, i) => wd.format(new Date(Date.UTC(2026, 10, 9 + i))))
      };
    } catch (e) { return null; }
  };
  ["fr", "es", "ru", "ar", "hi", "pt"].forEach(l => { const t = fromCLDR(l === "pt" ? "pt-BR" : l); if (t && t.mon.every(Boolean)) L[l] = t; });
  const ZWD = ["一", "二", "三", "四", "五", "六", "日"];
  const mi = m => { const i = MON.indexOf(m.slice(0, 3)); return i >= 0 ? i : MONTHS.indexOf(m); };
  const MRE = "(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)";
  const RE_WDATE = new RegExp("^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (\\d{1,2}) " + MRE + "(?: (\\d{4}))?$");
  const RE_RANGE = new RegExp("^(\\d{1,2})[–-](\\d{1,2}) " + MRE + "(?: (\\d{4}))?$");
  const RE_DATE = new RegExp("^(\\d{1,2}) " + MRE + "(?: (\\d{4}))?$");
  const RE_MDAY = new RegExp("^" + MRE + " (\\d{1,2})$");
  const RE_MYEAR = new RegExp("^(" + MONTHS.join("|") + "|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec) (\\d{4})$");

  function trDate(s) {
    const zh = lang.startsWith("zh");
    let m;
    if ((m = RE_WDATE.exec(s))) {
      const w = WD.indexOf(m[1]), mo = mi(m[3]), d = m[2], y = m[4];
      if (zh) return (y ? y + "年" : "") + (mo + 1) + "月" + d + "日（" + ZWD[w] + "）";
      return L[lang].wd[w] + " " + d + " " + L[lang].mon[mo] + (y ? " " + y : "");
    }
    if ((m = RE_RANGE.exec(s))) {
      const mo = mi(m[3]), y = m[4];
      if (zh) return (y ? y + "年" : "") + (mo + 1) + "月" + m[1] + "–" + m[2] + "日";
      return m[1] + "–" + m[2] + " " + L[lang].mon[mo] + (y ? " " + y : "");
    }
    if ((m = RE_DATE.exec(s))) {
      const mo = mi(m[2]), y = m[3];
      if (zh) return (y ? y + "年" : "") + (mo + 1) + "月" + m[1] + "日";
      return m[1] + " " + L[lang].mon[mo] + (y ? " " + y : "");
    }
    if ((m = RE_MDAY.exec(s))) {
      const mo = mi(m[1]);
      if (zh) return (mo + 1) + "月" + m[2] + "日";
      return m[2] + " " + L[lang].mon[mo];
    }
    if ((m = RE_MYEAR.exec(s))) {
      const full = MONTHS.indexOf(m[1]) >= 0, mo = mi(m[1]);
      if (zh) return m[2] + "年" + (mo + 1) + "月";
      if (lang === "fr" || lang === "ru" || lang === "ar" || lang === "hi") return (full ? L[lang].full[mo] : L[lang].mon[mo]) + " " + m[2];
      const T = lang === "pt" ? L.pt : L.es;
      return full ? T.full[mo] + " de " + m[2] : T.mon[mo] + " " + m[2];
    }
    return null;
  }

  // ---------- strings ----------
  const PAT = D.patterns.map(p => [new RegExp(p[0]), p.slice(1)]);
  let cache = new Map();

  // {1} translated group, {=1} group as written, {!1} must translate or the pattern doesn't apply,
  // {1|one|many} picks a word by whether group 1 is "1". Russian uses {1|one|few|many} and
  // Arabic {1|one|two|few|many|other}, picked with the language's plural rules.
  const PLURAL = { ru: ["one", "few", "many"], ar: ["one", "two", "few", "many", "other"] };
  let rules = null;
  function pick(v, alts) {
    // Hindi and Portuguese treat 0 like 1 ("0 dia"), as CLDR does.
    if (alts.length === 2) return (v === "1" || v === "up" || (v === "0" && (lang === "hi" || lang === "pt"))) ? alts[0] : alts[1];
    if (v === "up") return alts[0];
    if (v === "down") return alts[1];
    const order = PLURAL[lang];
    if (!order) return v === "1" ? alts[0] : alts[alts.length - 1];
    try {
      if (!rules || rules.resolvedOptions().locale.slice(0, 2) !== lang) rules = new Intl.PluralRules(lang);
      let c = rules.select(Number(v));
      if (c === "zero") c = "other";
      const i = order.indexOf(c);
      return alts[i >= 0 && i < alts.length ? i : alts.length - 1];
    } catch (e) {
      return v === "1" ? alts[0] : alts[alts.length - 1];
    }
  }
  function fill(tpl, g) {
    if (tpl == null) return null;
    let ok = true;
    const out = tpl.replace(/\{([=!]?)(\d)((?:\|[^|}]*)*)\}/g, (_, mode, n, rest) => {
      const v = g[+n] == null ? "" : g[+n];
      if (rest) return pick(v, rest.slice(1).split("|"));
      if (mode === "=") return v;
      const x = tr(v);
      if (mode === "!" && x === v) ok = false;
      return x;
    });
    return ok ? out : null;
  }

  function tr(s) {
    if (lang === "en" || !s) return s;
    const t = s.trim();
    if (!t || !/[A-Za-z]/.test(t)) return s;
    if (cache.has(t)) return cache.get(t);
    cache.set(t, t); // guards against loops
    let out = null;
    if (EXTRA[t] && EXTRA[t][lang]) out = EXTRA[t][lang];
    const w = D.words[t];
    if (out == null && w) out = w[IDX[lang]];
    if (out == null) out = trRel(t);
    if (out == null) out = trDate(t);
    if (out == null) {
      for (const [re, tpls] of PAT) {
        const m = re.exec(t);
        if (m) { out = fill(tpls[IDX[lang]], m); if (out != null && out !== t) break; out = null; }
      }
    }
    if (out == null && t.includes(" · ")) out = t.split(" · ").map(tr).join(" · ");
    if (out == null && t.includes(", ")) {
      // "A, B and C": translate each item, then join them the way the language does (CLDR list patterns)
      const parts = t.split(", "), lastAnd = /^(.+) and (.+)$/.exec(parts[parts.length - 1]);
      if (lastAnd) parts.splice(parts.length - 1, 1, lastAnd[1], lastAnd[2]);
      const done = parts.map(tr);
      if (done.every((x, i) => x !== parts[i] || !/[A-Za-z]/.test(x))) out = joinList(done, lastAnd ? "conjunction" : "unit");
    }
    if (out == null) out = t;
    cache.set(t, out);
    return out;
  }

  // Lists joined by CLDR: "A, B and C" -> "A, B et C", "A、B和C", "A وB وC"
  function joinList(items, type) {
    try { return new Intl.ListFormat(lang, { style: type === "unit" ? "narrow" : "long", type }).format(items); }
    catch (e) { return items.join(lang.startsWith("zh") ? "、" : lang === "ar" ? "، " : ", "); }
  }
  // "Today", "Yesterday", "3 days ago", "in 2 weeks": worded by CLDR's relative-time rules, with the right plural
  const RE_REL = /^(?:(\d+) (day|week|month|year)s? ago|in (\d+) (day|week|month|year)s?)$/;
  const REL_WORD = { Today: [0, "day"], Yesterday: [-1, "day"], Tomorrow: [1, "day"] };
  function trRel(t) {
    const m = RE_REL.exec(t), w = REL_WORD[t];
    if (!m && !w) return null;
    try {
      const f = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
      const x = w ? f.format(w[0], w[1]) : m[1] ? f.format(-m[1], m[2]) : f.format(+m[3], m[4]);
      return lang.startsWith("zh") || lang === "ar" ? x : x.charAt(0).toLocaleUpperCase(lang) + x.slice(1);
    } catch (e) { return null; }
  }

  // ---------- page ----------
  const orig = new WeakMap();      // text node -> English
  const origAttr = new WeakMap();  // element -> {attr: English}
  const ATTRS = ["placeholder", "aria-label", "title"];
  const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "NOSCRIPT", "CODE", "PRE"]);
  let applying = false;

  function skipEl(el) {
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      if (SKIP.has(e.tagName) || e.hasAttribute("data-noi18n") || e.getAttribute("translate") === "no" || e.tagName === "svg") return true;
    }
    return false;
  }
  function doText(n) {
    const p = n.parentElement;
    if (!p || skipEl(p)) return;
    let en = orig.get(n);
    const cur = n.nodeValue;
    // if the app rewrote the text since we last touched it, that's the new English
    if (en === undefined || (cur !== en && cur !== n.__cc)) { en = cur; orig.set(n, en); }
    if (p.tagName === "OPTION" && !p.hasAttribute("value")) p.setAttribute("value", en.trim());
    let next = en;
    if (lang !== "en") {
      const t = en.trim();
      if (t) { const x = tr(t); if (x !== t) { const lead = en.match(/^\s*/)[0], trail = en.match(/\s*$/)[0]; next = lead + x + trail; } }
    }
    n.__cc = next;
    if (cur !== next) n.nodeValue = next;
  }
  function doAttrs(el) {
    if (el.tagName === "TEXTAREA" ? skipEl(el.parentElement) : skipEl(el)) return;
    let o = origAttr.get(el);
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue;
      const cur = el.getAttribute(a);
      if (!o) { o = {}; origAttr.set(el, o); }
      const seen = o["~" + a];
      if (o[a] === undefined || (cur !== o[a] && cur !== seen)) o[a] = cur;
      const next = lang === "en" ? o[a] : tr(o[a]);
      o["~" + a] = next;
      if (cur !== next) el.setAttribute(a, next);
    }
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) { if (skipEl(root)) return; doAttrs(root); }
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode(n) {
        if (n.nodeType === 1 && n.tagName === "TEXTAREA") { doAttrs(n); return NodeFilter.FILTER_REJECT; }
        if (n.nodeType === 1) return SKIP.has(n.tagName) || n.tagName === "svg" || n.hasAttribute("data-noi18n") || n.getAttribute("translate") === "no" ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n;
    while ((n = tw.nextNode())) n.nodeType === 3 ? doText(n) : doAttrs(n);
  }

  const queue = new Set();
  let scheduled = false;
  function flush() {
    scheduled = false;
    applying = true;
    mo.disconnect();
    try { for (const n of queue) if (n.isConnected) walk(n); } finally {
      queue.clear();
      mo.observe(document.body, OBS);
      applying = false;
    }
    fitBar();
  }
  const OBS = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS };
  const mo = new MutationObserver(list => {
    if (applying) return;
    for (const r of list) {
      if (r.type === "childList") r.addedNodes.forEach(n => queue.add(n));
      else queue.add(r.target);
    }
    if (!scheduled && queue.size) {
      scheduled = true;
      // run before paint so English doesn't flash
      Promise.resolve().then(flush);
    }
  });

  function applyAll() {
    document.documentElement.lang = lang === "en" ? "en-GB" : lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    applying = true;
    mo.disconnect();
    try { walk(document.body); } finally { mo.observe(document.body, OBS); applying = false; }
    document.querySelectorAll("[data-lang-cur]").forEach(e => { e.textContent = LANGS.find(l => l.code === lang).short; });
    document.querySelectorAll("[data-setlang]").forEach(b => b.setAttribute("aria-checked", String(b.dataset.setlang === lang)));
    fitBar();
  }

  // Longer languages can overflow the one-row top bar; fall back to two rows when they do.
  function fitBar() {
    const bar = document.querySelector(".topbar");
    if (!bar) return;
    bar.classList.remove("tb-wrap");
    if (bar.scrollWidth > bar.clientWidth + 1) bar.classList.add("tb-wrap");
  }
  let fitT = 0;
  window.addEventListener("resize", () => { clearTimeout(fitT); fitT = setTimeout(fitBar, 80); });

  function setLang(code) {
    if (!LANGS.some(l => l.code === code)) return;
    lang = code;
    cache = new Map();
    store(false, code);
    applyAll();
    document.dispatchEvent(new CustomEvent("cc:lang", { detail: code }));
  }

  // ---------- switcher ----------
  function menuHtml() {
    return LANGS.map(l => `<button type="button" role="menuitemradio" class="lang-opt" data-setlang="${l.code}" lang="${l.code === "en" ? "en-GB" : l.code}" aria-checked="${l.code === lang}" data-noi18n>${l.label}</button>`).join("") +
      `<p class="lang-note" role="note">Translations are checked by students who speak each language. Spot a wrong film term? <button type="button" class="link-btn" data-transfix>Suggest a better translation</button></p>`;
  }
  function mount() {
    const btn = document.getElementById("langBtn"), menu = document.getElementById("langMenu");
    if (menu) menu.innerHTML = menuHtml();
    if (btn && menu) {
      const close = () => { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); };
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const open = menu.hidden;
        menu.hidden = !open;
        btn.setAttribute("aria-expanded", String(open));
        if (open) { const c = menu.querySelector('[aria-checked="true"]') || menu.firstElementChild; c && c.focus(); }
      });
      document.addEventListener("click", e => { if (!menu.hidden && !menu.contains(e.target)) close(); });
      document.addEventListener("keydown", e => { if (e.key === "Escape" && !menu.hidden) { close(); btn.focus(); } });
      menu.addEventListener("click", e => { const b = e.target.closest("[data-setlang]"); if (b) { setLang(b.dataset.setlang); close(); btn.focus(); } });
    }
    document.addEventListener("click", e => {
      const b = e.target.closest("[data-setlang]");
      if (b && !(menu && menu.contains(b))) setLang(b.dataset.setlang);
    });
    applyAll();
  }

  // add or replace translations without a rebuild. map: { English: { fr: "...", ru: "..." } }
  function addWords(map) {
    Object.entries(map || {}).forEach(([en, by]) => { EXTRA[en] = Object.assign(EXTRA[en] || {}, by); });
    cache = new Map(); applyAll();
  }
  // what the built-in dictionary says for an English phrase, per language
  function lookup(en) {
    const w = D.words[en], out = {};
    LANGS.forEach(l => { if (l.code !== "en") out[l.code] = (EXTRA[en] && EXTRA[en][l.code]) || (w ? w[IDX[l.code]] : "") || ""; });
    return out;
  }
  // the English behind some on-screen words, so a member can paste what they see when suggesting a fix
  function english(text, code) {
    const t = (text || "").trim(), i = IDX[code || lang]; if (!t) return "";
    for (const [en, by] of Object.entries(EXTRA)) if (by[code || lang] === t) return en;
    for (const [en, w] of Object.entries(D.words)) if (w[i] === t) return en;
    return /[A-Za-z]/.test(t) && D.words[t] ? t : "";
  }
  window.CCLang = { tr: s => tr(s), set: setLang, get: () => lang, langs: LANGS, menuHtml, addWords, lookup, english, extra: () => JSON.parse(JSON.stringify(EXTRA)), list: (items, type) => joinList(items, type || "conjunction") };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
