(() => {
  const C = window.CC_CONST;
  const allRoles = () => Object.values(C.ROLE_GROUPS).flat();
  const LIVE = !!window.CC_CLOUD_ON;
  const DEMO_URL = location.pathname + "?demo", REAL_URL = location.pathname;
  if (LIVE) {
    const pf = document.getElementById("protoFoot"); if (pf) pf.remove();
    const fl = document.querySelector(".foot-links"); if (fl) fl.insertAdjacentHTML("beforeend", `<a class="link-btn" href="${DEMO_URL}">Try the demo</a>`);
  }
  if (window.CC_DEMO) {
    document.body.insertAdjacentHTML("afterbegin", `<div class="demo-bar" role="note"><span>This is the demo: sample people, and nothing is saved.</span> <a href="${REAL_URL}">Go to the real Crew Call</a></div>`);
    const pf = document.getElementById("protoFoot"); if (pf) pf.innerHTML = `<span>This is the demo: sample people, and nothing is saved.</span> <a href="${REAL_URL}">Go to the real Crew Call</a>`;
  }
  let TODAY = LIVE ? new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" }) : "2026-11-09";
  const PALETTE = ["#e0a100", "#c2410c", "#0054f1", "#6d28d9", "#0f766e", "#be185d", "#4d7c0f", "#57534e"];

  // ---------- state (in memory for the prototype) ----------
  const S = JSON.parse(JSON.stringify(window.CC_SEED));
  S.meId = null;
  S.funds = S.funds || [];
  const persist = () => {};

  // ---------- date helpers ----------
  const D = s => new Date(s + "T00:00:00Z");
  const iso = d => d.toISOString().slice(0, 10);
  const addDays = (s, n) => { const d = D(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
  const daysIn = (from, to) => { const out = []; let c = from, g = 0; while (c <= to && g++ < 400) { out.push(c); c = addDays(c, 1); } return out; };
  const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const MON_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const MONTH_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const WD = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const fmtDay = s => { const d = D(s); return `${WD[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`; };
  const fmtRange = r => {
    const a = D(r.from), b = D(r.to);
    if (r.from === r.to) return fmtDay(r.from);
    if (a.getUTCMonth() === b.getUTCMonth()) return `${a.getUTCDate()}–${b.getUTCDate()} ${MON[b.getUTCMonth()]}`;
    return `${a.getUTCDate()} ${MON[a.getUTCMonth()]} – ${b.getUTCDate()} ${MON[b.getUTCMonth()]}`;
  };
  const monYear = s => `${MON[D(s).getUTCMonth()]} ${D(s).getUTCFullYear()}`;
  const fmtFull = s => { const d = D(s); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };

  // ---------- terms: LFS calendar, cohorts, automatic move-up ----------
  const TD = () => [...C.TERM_DATES].sort((a, b) => a.start.localeCompare(b.start));
  const periodById = id => C.TERM_DATES.find(t => t.id === id);
  const startedTerm = (d = TODAY) => TD().filter(t => t.start <= d).pop() || null;
  const termNow = (d = TODAY) => TD().find(t => t.start <= d && d <= t.end) || null;
  const nextTerm = (d = TODAY) => TD().find(t => t.start > d) || null;
  const lockDate = t => addDays(t.start, C.LOCK_WEEKS * 7 - 1);
  const studyTerm = t => !!t && t !== "Alumni" && t !== "Guest";
  // ---- cohorts: a person picks their course and cohort code once (e.g. MAF217); the term is worked out from it ----
  // academic period number: Autumn Y = Y*3, Spring Y = (Y-1)*3+1, Summer Y = (Y-1)*3+2
  const periodNo = t => {
    if (!t) return null;
    const x = /^(\d{4})-(aut|spr|sum)$/.exec(t.id || "");
    if (x) return x[2] === "aut" ? +x[1] * 3 : (+x[1] - 1) * 3 + (x[2] === "spr" ? 1 : 2);
    const d = D(t.start), y = d.getUTCFullYear(), mo = d.getUTCMonth();
    return mo >= 8 ? y * 3 : mo <= 2 ? (y - 1) * 3 + 1 : (y - 1) * 3 + 2;
  };
  const courseById = id => C.COURSES.find(c => c.id === id);
  const curPeriod = () => periodNo(startedTerm() || nextTerm());
  const courseTermNo = (cr, intake, at = curPeriod()) => cr.every === "term"
    ? cr.anchor.term + (at - periodNo(periodById(cr.anchor.periodId) || { id: cr.anchor.periodId })) - (intake - cr.anchor.code)
    : at - intake * 3 + 1;
  // name of an academic period number, e.g. 6075 -> "Autumn 2025"
  const periodName = p => { const y = Math.floor(p / 3), r = p % 3; return r === 0 ? `Autumn ${y}` : r === 1 ? `Spring ${y + 1}` : `Summer ${y + 1}`; };
  const periodByNo = p => C.TERM_DATES.find(t => periodNo(t) === p) || null;
  // the period a cohort starts in (its Term 1)
  const cohortStartP = (cr, intake) => cr.every === "term"
    ? 1 - cr.anchor.term + periodNo(periodById(cr.anchor.periodId) || { id: cr.anchor.periodId }) + (intake - cr.anchor.code)
    : intake * 3;
  // when a cohort finishes: LFS's date for that intake if an admin has entered it, otherwise the course rule
  const cohortEnd = (cr, intake) => {
    const set = (cr.endByIntake || {})[String(intake)];
    if (set) return { date: set, exact: true };
    const last = cohortStartP(cr, intake) + cr.terms - 1;
    if (cr.ends === "sept") { const aut = periodByNo(last + 1); return { date: aut ? addDays(aut.start, 11) : null, exact: false }; }
    const t = periodByNo(last); return { date: t ? t.end : null, exact: false, approx: periodName(last) };
  };
  // n = how many terms in. After the last term, people stay on their course until it finishes (e.g. late September for the one-year MAs)
  const termName = (cr, n, intake, on = TODAY) => {
    if (n > cr.terms && intake != null) { const e = cohortEnd(cr, intake); if (e.date && on <= e.date) n = cr.terms; }
    return cr.every === "term"
      ? (n < 1 ? "Term 1" : n < cr.terms ? `Term ${n}` : n === cr.terms ? "Graduation term" : "Alumni")
      : (n <= cr.terms ? cr.label : "Alumni");
  };
  const cohortDates = (cr, intake) => { const e = cohortEnd(cr, intake); return { start: periodName(cohortStartP(cr, intake)), end: e.date, exact: e.exact, approx: e.approx }; };
  const enrolLabel = t => /-aut$/.test(t.id) ? "New student enrolment" : /-spr$/.test(t.id) ? "Enrolment and induction (new students only)" : "Enrolment and induction";
  const cohortDatesText = (cr, intake) => { const d = cohortDates(cr, intake); return `Started ${d.start}${d.end ? ` · ${d.exact ? "finishes" : "expected to finish"} ${fmtFull(d.end)}` : d.approx ? ` · finishes in ${d.approx}` : ""}`; };
  const cohortCode = (cr, intake) => cr.every === "term" ? `${cr.prefix}${intake}`
    : cr.prefix ? `${cr.prefix}${String(intake).slice(2)}` : `${cr.label} ${intake}–${String(intake + 1).slice(2)}`;
  // cohorts people can pick: everyone currently studying, the next intake, and recent alumni
  function cohortOptions(cr, at = curPeriod()) {
    const out = [];
    if (cr.every === "term") {
      const base = cr.anchor.code + cr.anchor.term + (at - periodNo(periodById(cr.anchor.periodId) || { id: cr.anchor.periodId }));
      for (let n = 0; n <= cr.terms + 6; n++) { const code = base - n; out.push({ intake: code, n }); }
    } else {
      const y = Math.floor(at / 3);
      for (let k = -1; k <= 3; k++) out.push({ intake: y - k, n: at - (y - k) * 3 + 1 });
    }
    const on = (periodByNo(at) || {}).start || TODAY;
    return out.filter(o => cr.lastIntake == null || o.intake <= cr.lastIntake)
      .map(o => ({ ...o, code: cohortCode(cr, o.intake), term: o.n < 1 ? "Starts next term" : termName(cr, o.n, o.intake, on > TODAY ? on : TODAY) }));
  }
  // who moves where when the next term starts: the new cohort arrives, everyone moves up, the last one becomes Alumni
  function cohortChanges(nt = nextTerm()) {
    if (!nt) return [];
    const now = curPeriod(), nx = periodNo(nt);
    return C.COURSES.map(cr => {
      const a = cohortOptions(cr, now).filter(o => o.n >= 1 && o.term !== "Alumni"), b = cohortOptions(cr, nx).filter(o => o.n >= 1 && o.term !== "Alumni");
      const joins = b.filter(o => !a.some(x => x.intake === o.intake)), leaves = a.filter(o => !b.some(x => x.intake === o.intake));
      const count = o => S.students.filter(st => st.course === cr.id && st.intake === o.intake && !st.guest).length;
      return { cr, now: a, next: b, joins, leaves, count };
    });
  }
  const cohortSelectHtml = (sel, blank) => `${blank ? `<option value="">${esc(blank)}</option>` : ""}${C.COURSES.map(cr => `<optgroup label="${esc(cr.name)}">${cohortOptions(cr).filter(o => !cr.closed || o.n >= 1 || `${cr.id}|${o.intake}` === sel).map(o => { const v = `${cr.id}|${o.intake}`; return `<option value="${v}" ${v === sel ? "selected" : ""}>${esc(o.code)} · ${esc(o.term === "Alumni" ? "Alumni" : o.term === "Starts next term" ? o.term : cr.every === "term" ? o.term + " now" : "studying now")}</option>`; }).join("")}</optgroup>`).join("")}`;
  const cohortVal = s => s.course && s.intake != null ? `${s.course}|${s.intake}` : "";
  const termFromCohort = s => { const cr = courseById(s.course); return cr && s.intake != null ? termName(cr, courseTermNo(cr, s.intake), s.intake) : s.term; };
  const setCohort = (s, v) => { const [c, n] = v.split("|"); s.course = c; s.intake = +n; const cr = courseById(c); s.cohort = cr ? cohortCode(cr, s.intake) : ""; s.term = termFromCohort(s); };
  const tLabel = s => s.guest || !s.cohort ? s.term : s.term === "Alumni" ? `Alumni · ${s.cohort}` : courseById(s.course) && courseById(s.course).every === "year" && !courseById(s.course).prefix ? s.cohort : `${s.term} · ${s.cohort}`;
  const liveCohorts = () => [...new Set(S.students.filter(s => !s.guest && s.cohort && studyTerm(s.term)).map(s => s.cohort))].sort();
  // which teaching term a choice made today belongs to (in a holiday it counts for the term about to start)
  const termForToday = () => (termNow() || nextTerm() || startedTerm() || {}).id;
  const termEditable = m => {
    if (!m || m.guest) return false;
    if (!m.course || m.intake == null || !m.termConfirmed) return true;
    const now = termNow();
    return !now || TODAY <= lockDate(now);
  };
  // recompute everyone's term from their cohort; tell people whose term changed
  function applyTerms(tell) {
    let moved = 0; const cur = startedTerm();
    S.students.forEach(s => {
      if (s.guest || !s.course || s.intake == null) return;
      const cr = courseById(s.course); if (!cr) return;
      s.cohort = cohortCode(cr, s.intake);
      const old = s.term, t = termFromCohort(s);
      if (t === old) return;
      s.term = t; s.termFor = cur && cur.id; moved++;
      if (!tell || !old) return;
      if (tell === "admin") { notify(s.id, "term", `An admin corrected the ${cr.name} cohort numbering, so your profile now says ${t} (${s.cohort}). Wrong? Ask an admin to fix it.`); return; }
      s.termConfirmed = t === "Alumni";
      notify(s.id, "term", t === "Alumni"
        ? `${cur ? cur.name : "A new term"} has started and your course is over, so your profile now says Alumni (${s.cohort}). You stay in Crew Call and can still crew on shoots.`
        : `${cur ? cur.name : "A new term"} has started, so your profile has moved from ${old} to ${t} (${s.cohort}). If you're repeating or intermitting, change your cohort until ${fmtFull(lockDate(cur))}.`);
    });
    if (moved) refreshCohortFilter();
    return moved;
  }
  const rollTerms = () => applyTerms(true);
  function refreshCohortFilter() { const el = document.getElementById("crewCohort"); if (el) fillSelect(el, liveCohorts()); }
  const inRanges = (ranges, d) => (ranges || []).some(r => r.from <= d && d <= r.to);
  const mondayOf = s => addDays(s, -((D(s).getUTCDay() + 6) % 7));
  const ago = s => { const n = Math.round((D(TODAY) - D(s)) / 864e5); return n <= 0 ? "Today" : n === 1 ? "Yesterday" : `${n} days ago`; };

  // ---------- domain helpers ----------
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  const uid = p => p + Math.random().toString(36).slice(2, 8);
  const student = id => S.students.find(s => s.id === id);
  const project = id => S.projects.find(p => p.id === id);
  const live = () => S.projects.filter(p => !p.archived);
  const projDays = p => p.shoots.flatMap(r => daysIn(r.from, r.to));
  const projColor = p => PALETTE[(parseInt(p.id.replace(/\D/g, ""), 10) || p.id.length) % PALETTE.length];
  const openRoles = p => p.roles.filter(r => !r.filledBy);
  const isExt = r => typeof r.filledBy === "string" && r.filledBy.startsWith("ext:");
  const extName = r => r.filledBy.slice(4);
  // ---------- CLAIMS: people added by name before they joined ----------
  const normName = x => String(x || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const nameHit = (a, b) => { const x = normName(a), y = normName(b); if (!x || !y) return false; if (x === y) return true; const xa = x.split(" "), ya = y.split(" "); return xa.length > 1 && ya.length > 1 && xa[0] === ya[0] && xa[xa.length - 1] === ya[ya.length - 1]; };
  // every place on a project where someone was typed in by name: roles, a director or producer with no account or email
  function namedSpots(p) {
    const out = p.roles.filter(isExt).map(r => ({ p, ref: r.rid, role: r.role, name: extName(r) }));
    if (!p.dsid && p.director && !p.email && !p.roles.some(r => r.role === "Director" && r.filledBy && !isExt(r))) out.push({ p, ref: "director", role: "Director", name: p.director });
    prodsOf(p).forEach((x, i) => { if (!x.sid && !x.email) out.push({ p, ref: "producer:" + i, role: "Producer", name: x.name }); });
    return out;
  }
  const claimOf = (p, ref, sid) => S.requests.find(q => q.type === "claim" && q.pid === p.id && q.rid === ref && q.sid === sid && q.status !== "withdrawn");
  const claimsFor = m => !m ? [] : S.projects.flatMap(namedSpots).filter(x => nameHit(x.name, m.name) && !(m.notMe || []).includes(x.p.id + "|" + x.ref) && !claimOf(x.p, x.ref, m.id) && !onProject(x.p, m.id) && !runs(x.p, m));
  const roleBy = (p, rid) => p.roles.find(r => r.rid === rid);
  const locs = p => p.locations || [];
  const locShort = p => { const l = locs(p); return l.length ? l[0].name + (l.length > 1 ? ` + ${l.length - 1} more` : "") : "Location TBC"; };
  const dayInfo = (p, d) => Object.assign({ call: "08:00", wrap: "18:00", loc: 0 }, (p.days || {})[d] || {});
  const locName = (p, i) => (locs(p)[i] ? locs(p)[i].name : "Location TBC");
  const callWrap = inf => `${inf.call}–${inf.wrap}${inf.wrap <= inf.call ? " +1" : ""}`;
  const mapUrl = q => `https://www.openstreetmap.org/search?query=${encodeURIComponent(q)}`;
  // open a place in OpenStreetMap, Google Maps or Apple Maps. The last one someone picks goes to the top.
  const MAP_APPS = [
    ["osm", "OpenStreetMap", l => l.lat != null ? `https://www.openstreetmap.org/?mlat=${l.lat}&mlon=${l.lng}#map=17/${l.lat}/${l.lng}` : mapUrl(l.name)],
    ["google", "Google Maps", l => `https://www.google.com/maps/search/?api=1&query=${l.lat != null ? `${l.lat},${l.lng}` : encodeURIComponent(l.name)}`],
    ["apple", "Apple Maps", l => `https://maps.apple.com/?q=${encodeURIComponent(l.name)}${l.lat != null ? `&ll=${l.lat},${l.lng}` : ""}`]
  ];
  let mapPref = "osm";
  const mapLinks = (l, label = "Map") => { const apps = [...MAP_APPS].sort((a, b) => (b[0] === mapPref) - (a[0] === mapPref));
    return `<details class="map-open"><summary>${esc(label)}<span aria-hidden="true"> ▾</span></summary><div class="map-open-menu" role="menu">${apps.map(([id, name, url]) => `<a role="menuitem" href="${esc(url(l))}" target="_blank" rel="noopener" data-mapapp="${id}">Open in ${name}</a>`).join("")}</div></details>`; };
  document.addEventListener("click", e => {
    const a = e.target.closest("[data-mapapp]"); if (a) { mapPref = a.dataset.mapapp; const me = S.meId && student(S.meId); if (me) me.mapApp = mapPref; }
    document.querySelectorAll("details.map-open[open]").forEach(d => { if (!d.contains(e.target) || a) d.open = false; });
  });
  const isActive = p => !p.wrapped && p.shoots.some(r => r.to >= TODAY);
  const lastDay = p => p.shoots.reduce((a, r) => r.to > a ? r.to : a, "");
  // wrapped shoots stay on the Shoot board, greyed out, until their delivery date (or 30 days after the last shoot day)
  const shootGone = p => !isActive(p) && (p.delivery ? p.delivery < TODAY : daysUntil(p.wrapped || lastDay(p)) < -30);
  const isPast = p => !!p.wrapped || p.shoots.every(r => r.to < TODAY);
  const started = p => p.shoots.some(r => r.from <= TODAY);
  const postOf = p => (S.posts || []).find(x => x.pid === p.id && !x.hidden);
  const isLfs = e => C.LFS_DOMAINS.some(d => e.toLowerCase().endsWith("@" + d));
  const listed = s => s && !s.incomplete && !s.hideMe;
  const initials = n => n.split(/\s+/).map(x => x[0]).slice(0, 2).join("").toUpperCase();
  // first name for greetings, or the member's preferred name if they've set one
  const first = n => { const s = n && S.students && S.students.find(x => x.name === n); return (s && s.pref) || String(n || "").split(" ")[0]; };
  const prefTag = s => s.pref && s.pref !== s.name.split(" ")[0] ? ` <span class="pref-n">(${esc(s.pref)})</span>` : "";

  S.projects.forEach(p => { p.shadows = p.shadows || []; p.days = p.days || {}; p.roles.forEach((r, i) => (r.rid = r.rid || p.id + "r" + i)); });
  const daysToRanges = days => { const out = []; [...new Set(days)].sort().forEach(d => { const l = out[out.length - 1]; if (l && addDays(l.to, 1) === d) l.to = d; else out.push({ from: d, to: d }); }); return out; };
  const syncAvail = st => { st.days = [...new Set(st.days)].sort(); st.avail = daysToRanges(st.days); };
  S.students.forEach(st => {
    st.learn = st.learn || []; st.notify = st.notify || {};
    if (!st.days) { st.days = (st.avail || []).flatMap(r => daysIn(r.from, r.to)); st.updated = st.updated || "2026-11-0" + (1 + (st.id.length + st.name.length) % 5); }
    syncAvail(st);
  });

  const onProject = (p, sid) => p.roles.some(r => r.filledBy === sid) || p.shadows.some(x => x.sid === sid);
  const bookedOn = (sid, d) => live().filter(p => onProject(p, sid) && inRanges(p.shoots, d));
  const isFree = (s, d) => s.days.includes(d) && bookedOn(s.id, d).length === 0;
  const freeDaysCount = (s, days) => days.filter(d => isFree(s, d)).length;
  const updatedLabel = st => { if (!st.updated) return ""; const n = Math.round((D(TODAY) - D(st.updated)) / 864e5); return n <= 0 ? "Updated today" : n === 1 ? "Updated yesterday" : `Updated ${n} days ago`; };
  const toggleDay = (st, d, on) => { const has = st.days.includes(d); const want = on === undefined ? !has : on; if (want && !has) st.days.push(d); if (!want && has) st.days = st.days.filter(x => x !== d); syncAvail(st); st.updated = TODAY; };
  const nextFree = s => { const f = (s.avail || []).filter(r => r.to >= TODAY); return f.length ? f.map(r => fmtRange({ from: r.from < TODAY ? TODAY : r.from, to: r.to })).slice(0, 2).join(", ") : null; };
  const creditsOf = s => S.projects.filter(p => !p.archived && isPast(p)).flatMap(p => [
    ...p.roles.filter(r => r.filledBy === s.id).map(r => ({ p, role: r.role, character: r.character || "" })),
    ...p.shadows.filter(x => x.sid === s.id).map(x => ({ p, role: x.role, shadow: true }))
  ]).concat((S.releases || []).filter(x => x.pid && project(x.pid)).flatMap(x => x.attached.filter(t => t.sid === s.id).map(t => ({ p: project(x.pid), role: t.need, release: true }))))
    .concat((S.posts || []).filter(x => x.pid && project(x.pid)).flatMap(x => x.attached.filter(t => t.sid === s.id).map(t => ({ p: project(x.pid), role: POST_CREDIT[t.need] || t.need, post: true }))))
    .sort((a, b) => b.p.shoots[0].from.localeCompare(a.p.shoots[0].from));

  // ---------- accounts and permissions ----------
  const me = () => (S.meId ? student(S.meId) : null);
  const isAdmin = (m = me()) => !!m && S.admins.includes(m.id);
  const sameMail = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
  // a project can have several producers: [{ name, email, sid }]. Older projects have a single producer.
  const prodsOf = p => (Array.isArray(p.producers) ? p.producers : p.producer && p.producer.name ? [p.producer] : []).filter(x => x && x.name);
  const isDirectorOf = (p, m) => !!m && ((p.dsid && p.dsid === m.id) || sameMail(p.email, m.email) || p.roles.some(r => r.role === "Director" && r.filledBy === m.id));
  const isProducerOf = (p, m) => !!m && (prodsOf(p).some(x => (x.sid && x.sid === m.id) || sameMail(x.email, m.email)) || p.roles.some(r => r.role === "Producer" && r.filledBy === m.id));
  const runs = (p, m = me()) => isDirectorOf(p, m) || isProducerOf(p, m);
  const PERMS = [
    ["people", "People", "Make or remove admins, remove guests, revoke invites and change sign-in emails"],
    ["projects", "Projects", "Edit, archive or delete any project"],
    ["setup", "Terms and lists", "Term dates, courses and cohort codes, fixing someone's cohort, roles and project types"],
    ["langs", "Languages", "Approve translation suggestions and fix words in any language"],
    ["email", "Email settings", "Sending address, help address, school mass email alias and digest timing"],
    ["safety", "Reports and privacy", "Read and act on reports, delete old profiles, download and restore backups"],
    ["news", "Newsletter: draft", "Design newsletters, save drafts, send a test to yourself and ask for approval"],
    ["send", "Newsletter: send", "Approve, schedule and send newsletters to everyone or a chosen group"]
  ];
  const ALL_PERMS = PERMS.map(x => x[0]);
  // Backups from before v20 had no Languages permission: whoever had Terms and lists gets it.
  function langsUpgrade() { const all = Object.values(S.adminPerms || {}); if (all.some(ps => ps.includes("langs"))) return; all.forEach(ps => { if (ps.includes("setup")) ps.push("langs"); }); }
  const isOwner = (m = me()) => !!m && S.owner === m.id;
  const can = (perm, m = me()) => !!m && (isOwner(m) || (isAdmin(m) && (S.adminPerms[m.id] || []).includes(perm)));
  const logAdmin = text => S.adminLog.unshift({ at: TODAY, by: me().id, text });
  // ---------- COHORT REPS ----------
  // Each cohort can have one rep. Reps are admins (the owner ticks what else they can do) and can
  // propose a new owner. The owner accepts, or, if the owner has left or gone quiet, a second rep agrees.
  const REP_PERMS = ["projects"];
  const replyAddr = () => S.settings.replyTo || (student(S.owner) || {}).email || "";
  const repOf = c => { const id = S.reps[c], s = id && student(id); return s && s.cohort === c && s.term !== "Alumni" ? s : null; };
  const repCohort = (m = me()) => m ? liveCohorts().find(c => repOf(c) && repOf(c).id === m.id) || null : null;
  const isRep = (m = me()) => !!repCohort(m);
  const repList = () => liveCohorts().map(repOf).filter(Boolean);
  const ownerAway = () => { const o = student(S.owner); return !o || o.term === "Alumni" || dayDiff(lastSeen(o), TODAY) > 30; };
  // reps are always admins; anyone made admin only because they're a rep loses it when they stop
  function syncReps() { liveCohorts().map(repOf).filter(Boolean).forEach(r => { if (!S.admins.includes(r.id)) { S.admins.push(r.id); S.adminPerms[r.id] = [...REP_PERMS]; S.adminVia[r.id] = "rep"; } }); }
  function setRep(c, id) {
    const m = me(), old = repOf(c), s = student(id);
    if (old && old.id === id) return;
    S.reps[c] = id;
    if (!S.admins.includes(id)) { S.admins.push(id); S.adminPerms[id] = [...REP_PERMS]; S.adminVia[id] = "rep"; }
    if (old && S.adminVia[old.id] === "rep" && old.id !== S.owner && !repCohort(old)) { S.admins = S.admins.filter(x => x !== old.id); delete S.adminPerms[old.id]; delete S.adminVia[old.id]; }
    if (old) notify(old.id, "update", `${m.name} made ${s.name} the rep for ${c}. Thanks for doing it.`);
    if (id !== m.id) notify(id, "update", `${m.name} made you the Crew Call rep for ${c}. You're now an admin: see Admin, then Access.`);
    logAdmin(`Made ${s.name} the rep for ${c}${old ? ` (was ${old.name})` : ""}`);
  }
  function transferOwner(to, note) {
    const from = student(S.owner);
    S.owner = to.id; S.adminPerms[from.id] = [...ALL_PERMS]; S.adminPerms[to.id] = [...ALL_PERMS];
    if (!S.admins.includes(to.id)) S.admins.push(to.id);
    S.handover.log.unshift({ at: TODAY, from: `${from.name} (${tLabel(from)})`, to: to.name });
    notify(to.id, "update", `You're now the owner of Crew Call${note ? " " + note : ""}. The handover checklist is in Admin.`);
    if (from.id !== me().id) notify(from.id, "update", `Ownership of Crew Call passed to ${to.name}${note ? " " + note : ""}.`);
    logAdmin(`Transferred ownership from ${from.name} to ${to.name}${note ? " " + note : ""}`);
    S.ownerProposal = null;
  }
  const canManage = p => { const m = me(); return !!m && (runs(p, m) || can("projects", m)); };
  // crew hub: WhatsApp group, key links and details
  const hubOf = p => p.hub || (p.hub = { whatsapp: "", links: [], details: "", vis: "crew" });
  const hubEmpty = h => !h.whatsapp && !h.links.length && !h.details;
  const canSeeHub = p => { const m = me(); if (!m) return false; return canManage(p) || onProject(p, m.id) || hubOf(p).vis === "members"; };
  // the app's own address, for links in emails and newsletters
  const SITE = LIVE ? location.origin + location.pathname.replace(/index\.html$/, "") : "https://lfscrewcall.github.io/crewcall/";
  const cleanUrl = u => { u = (u || "").trim(); if (!u) return ""; if (!/^https?:\/\//i.test(u)) u = "https://" + u; try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ""; } catch (e) { return ""; } };
  // Show web addresses the short way: vimeo.com/name, not https://www.vimeo.com/name/
  const shortUrl = u => String(u || "").trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
  // Instagram accepts @handle; IMDb accepts a name id like nm1234567
  const cleanInsta = u => { u = (u || "").trim(); if (!u) return ""; const h = /^@?([A-Za-z0-9._]{1,30})$/.exec(u); return h ? `https://instagram.com/${h[1]}` : cleanUrl(u); };
  const cleanImdb = u => { u = (u || "").trim(); if (!u) return ""; const h = /^(nm\d{5,9})$/i.exec(u); return h ? `https://www.imdb.com/name/${h[1].toLowerCase()}/` : cleanUrl(u); };
  const PORTFOLIO = [["reel", "Reel"], ["site", "Website"], ["imdb", "IMDb"], ["insta", "Instagram"]];
  const portfolioHtml = s => { const a = PORTFOLIO.filter(([k]) => s[k]).map(([k, l]) => `<li><span class="pf-k">${l}</span>${linkTo(s[k], k === "insta" && /instagram\.com\/([^/?#]+)/.test(s[k]) ? "@" + /instagram\.com\/([^/?#]+)/.exec(s[k])[1] : "")}</li>`); return a.length ? `<div><dt>Portfolio</dt><dd><ul class="pf-list">${a.join("")}</ul></dd></div>` : ""; };
  const linkTo = (u, text) => { const h = cleanUrl(u); return h ? `<a href="${esc(h)}" target="_blank" rel="noopener">${esc(text || shortUrl(h))}</a>` : ""; };
  const plain = h => String(h == null ? "" : h).replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
  const colKey = c => c[3] || (it => plain(c[1](it)).toLowerCase());
  const cmpKey = (a, b) => typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), undefined, { numeric: true });
  const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return ""; } };
  const managersOf = p => S.students.filter(s => runs(p, s));
  const producerNames = p => [...new Set([...prodsOf(p).map(x => (x.sid && student(x.sid) ? student(x.sid).name : x.name)), ...p.roles.filter(r => r.role === "Producer" && r.filledBy && !isExt(r) && student(r.filledBy)).map(r => student(r.filledBy).name)])];
  const andList = a => a.length <= 1 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
  // heads of department: shown with an HOD label, and each role can carry a brief
  const HOD_ROLES = new Set(C.HOD_ROLES || ["Producer", "1st AD", "DoP", "Gaffer", "Key Grip", "Sound Recordist", "Sound Designer", "Composer", "Production Designer", "Art Director", "Costume", "Hair & Make-up", "Editor", "Colourist", "VFX", "Line Producer", "Location Manager", "Casting Director"]);
  const isHod = r => typeof r.hod === "boolean" ? r.hod : HOD_ROLES.has(r.role);
  const hodTag = r => isHod(r) ? ` <span class="tag-hod" title="Head of department">HOD</span>` : "";
  const hasBrief = r => !!(r.brief && (r.brief.text || r.brief.url));
  const briefHtml = (r, open) => hasBrief(r) ? `<details class="brief"${open ? " open" : ""}><summary>${isCast(r) ? "About the part" : `Brief for the ${esc(r.role)}`}</summary>${r.brief.text ? `<p>${esc(r.brief.text).replace(/\n/g, "<br>")}</p>` : ""}${r.brief.url ? `<p class="brief-link">${linkTo(r.brief.url)}</p>` : ""}</details>` : "";
  // everyone who can be picked for a role or hand-over: people who list the role first
  const memberLabel = s => `${s.name}${s.cohort ? " · " + s.cohort : s.guest ? " · Guest" : ""}`;
  const memberOptions = (role, skip = []) => { const ok = S.students.filter(s => !s.incomplete && !skip.includes(s.id)); const a = role ? ok.filter(s => s.roles.includes(role)) : [], b = ok.filter(s => !a.includes(s)).sort((x, y) => x.name.localeCompare(y.name)); return [...a, ...b].map(s => `<option value="${esc(memberLabel(s))}">${role && s.roles.includes(role) ? esc(role) : ""}</option>`).join(""); };
  const findMember = v => { v = (v || "").trim().toLowerCase(); if (!v) return null; const byL = S.students.filter(s => memberLabel(s).toLowerCase() === v); if (byL.length === 1) return byL[0]; const byN = S.students.filter(s => s.name.toLowerCase() === v); return byN.length === 1 ? byN[0] : null; };
  const contactOf = p => {
    const r = p.roles.find(x => x.role === "Producer" && x.filledBy);
    if (r && student(r.filledBy)) { const st = student(r.filledBy); return { name: st.name, email: st.email, id: st.id, role: "Producer" }; }
    const pr = prodsOf(p)[0];
    if (pr) { const st = (pr.sid && student(pr.sid)) || S.students.find(s => sameMail(s.email, pr.email)); return { name: pr.name, email: (st && st.email) || pr.email || "", id: st && st.id, role: "Producer" }; }
    const st = (p.dsid && student(p.dsid)) || S.students.find(s => sameMail(s.email, p.email));
    return { name: p.director, email: (st && st.email) || p.email, id: st && st.id, role: "Director", fallback: true };
  };
  // email shown only when signed in AND the person shares it (or it's you / your locked crew)
  const emailVisible = (person, p) => {
    const m = me(); if (!m) return false;
    if (!person.id) return true;
    const st = student(person.id); if (!st) return false;
    if (st.id === m.id || st.shareEmail) return true;
    return !!p && canManage(p) && onProject(p, st.id);
  };
  const notifyOf = m => Object.assign({ apply: true, digest: false, when: "mon", scope: "match", match: true, updates: true, news: true }, (m && m.notify) || {});
  function notify(to, kind, text, pid) {
    const st = student(to); if (!st || (me() && to === me().id && kind !== "update" && kind !== "term")) return;
    const n = notifyOf(st);
    const emailed = kind === "request" ? n.apply : kind === "match" ? n.match : kind === "update" || kind === "term" ? n.updates : kind === "news" ? n.news : true;
    S.notifications.unshift({ id: uid("n"), to, kind, text, pid, at: TODAY, read: false, emailed });
  }

  // ---------- UI helpers ----------
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const toastEl = $("#toast"); let toastT;
  const toast = msg => { toastEl.textContent = msg; toastEl.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (toastEl.hidden = true), 3200); };
  const copy = async text => { try { await navigator.clipboard.writeText(text); toast("Copied"); } catch (e) { toast(text); } };
  const mailto = (to, subject, body) => `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body || "")}`;
  const fillSelect = (el, items, keepFirst = true) => {
    const f = keepFirst ? el.querySelector("option") : null; el.innerHTML = ""; if (f) el.appendChild(f);
    items.forEach(v => { const o = document.createElement("option"); o.value = v; o.textContent = v; el.appendChild(o); });
  };
  const roleOptions = (sel = "") => Object.entries(C.ROLE_GROUPS).map(([g, rs]) => `<optgroup label="${esc(g)}">${rs.map(r => `<option ${r === sel ? "selected" : ""}>${esc(r)}</option>`).join("")}</optgroup>`).join("");
  const CREW_IC = `<svg class="crew-ic" viewBox="0 0 16 16" aria-hidden="true"><circle cx="6" cy="5" r="2.3"/><path d="M1.8 13.5c0-2.4 1.9-4.2 4.2-4.2s4.2 1.8 4.2 4.2"/><circle cx="11.4" cy="5.6" r="1.8"/><path d="M11 9.4c1.9.2 3.3 1.8 3.3 4"/></svg>`;
  const download = (name, text, type = "text/calendar") => {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  // contact control: email if visible, otherwise in-app message
  function reach(person, p, { subject = "", body = "" } = {}) {
    const m = me();
    if (!m) return `<button class="btn btn-quiet btn-xs" data-signin>Sign in to see contact</button>`;
    if (person.id && person.id === m.id) return `<span class="muted small">That's you</span>`;
    if (emailVisible(person, p)) return `<a href="${mailto(person.email, subject, body)}" target="_blank" rel="noopener">${esc(person.email)}</a> <button class="btn btn-quiet btn-xs" data-copy="${esc(person.email)}">Copy</button>`;
    return `<span class="muted small">Email private</span> <button class="btn btn-quiet btn-xs" data-msg="${person.id}">Message</button>`;
  }

  // Tapping anywhere on a date or time box opens the calendar pop-out, not just the small icon
  document.addEventListener("click", e => {
    const el = e.target.closest && e.target.closest('input[type=date], input[type=time], input[type=month], input[type=datetime-local]');
    if (!el || el.disabled || el.readOnly || typeof el.showPicker !== "function") return;
    try { el.showPicker(); } catch (err) {}
  });
  // ---------- modal ----------
  const modal = $("#modal"), modalBody = $("#modalBody");
  let lastFocus = null;
  // Drafts: a form you've typed into is never thrown away by clicking outside or closing.
  // The open form is kept in memory (with every row you added) and its typed fields are also kept on this device.
  const NO_DRAFT = new Set(["siForm", "codeForm", "emailFix", "adminAddForm", "invForm", "cfForm"]);
  const drafts = new Map(); let cur = null;
  const draftForm = () => [...modalBody.querySelectorAll("form[id]")].find(f => !NO_DRAFT.has(f.id) && f.querySelector("textarea, input:not([type=hidden]):not([type=checkbox]):not([type=radio])"));
  const draftKey = f => f.id + "|" + ((modalBody.querySelector("#modalTitle") || {}).textContent || "").trim().slice(0, 80);
  const LS = "cc-draft:";
  const lsGet = k => { try { return JSON.parse(localStorage.getItem(LS + k) || "null"); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { v ? localStorage.setItem(LS + k, JSON.stringify(v)) : localStorage.removeItem(LS + k); } catch (e) {} };
  const fieldVals = f => { const o = {}; f.querySelectorAll("input[name], textarea[name], select[name]").forEach(el => { if (el.type === "file" || el.type === "hidden" || el.readOnly) return; o[el.name] = el.type === "checkbox" || el.type === "radio" ? (el.type === "radio" ? (el.checked ? el.value : o[el.name]) : el.checked) : el.value; }); return o; };
  const putVals = (f, o) => Object.entries(o).forEach(([n, v]) => f.querySelectorAll(`[name="${n}"]`).forEach(el => { if (el.type === "checkbox") el.checked = !!v; else if (el.type === "radio") el.checked = el.value === v; else if (v != null && !el.readOnly) el.value = v; }));
  // Keep the form that's on screen before it's closed or replaced
  const keepDraft = () => {
    if (!cur || !cur.dirty || cur.done || cur.sending || !modalBody.contains(cur.form)) return false;
    drafts.set(cur.key, { nodes: [...modalBody.childNodes], wide: modal.querySelector(".modal-box").classList.contains("wide") });
    cur = null; return true;
  };
  const draftBar = (msg, undo) => {
    const bar = document.createElement("p"); bar.className = "draft-bar"; bar.setAttribute("role", "status");
    bar.innerHTML = `<span>${esc(msg)}</span><button type="button" class="link-btn">Start again</button>`;
    bar.querySelector("button").addEventListener("click", () => { undo(); bar.remove(); });
    const t = modalBody.querySelector("#modalTitle"); t ? t.insertAdjacentElement("afterend", bar) : modalBody.prepend(bar);
  };
  const trackDraft = () => {
    const f = draftForm(); if (!f) { cur = null; return; }
    const key = draftKey(f), held = drafts.get(key);
    cur = { form: f, key, dirty: false, done: false };
    if (held) {
      // put back the exact form they left, rows and all, once the opener has finished wiring the fresh copy
      const fresh = [...modalBody.childNodes];
      queueMicrotask(() => {
        if (!cur || cur.key !== key) return;
        drafts.delete(key); modalBody.replaceChildren(...held.nodes);
        modal.querySelector(".modal-box").classList.toggle("wide", held.wide);
        const old = draftForm(); cur = { form: old, key, dirty: true, done: false };
        draftBar("Picked up where you left off.", () => { lsSet(key, null); modalBody.replaceChildren(...fresh); cur = { form: f, key, dirty: false, done: false }; bindOpeners(modalBody); });
      });
      return;
    }
    const saved = lsGet(key);
    if (saved && saved.v && Object.values(saved.v).some(v => typeof v === "string" && v.trim())) {
      const before = fieldVals(f); putVals(f, saved.v); cur.dirty = true;
      f.querySelectorAll("input[type=date]").forEach(el => el.dispatchEvent(new Event("change", { bubbles: true })));
      draftBar(`Restored what you typed ${saved.at === TODAY ? "earlier" : "last time"}.`, () => { putVals(f, before); lsSet(key, null); cur.dirty = false; });
    }
  };
  let draftT = 0;
  const noteInput = e => {
    if (!cur || !cur.form.contains(e.target)) return;
    cur.dirty = true; const c = cur;
    clearTimeout(draftT); draftT = setTimeout(() => { if (!c.done) lsSet(c.key, { at: TODAY, v: fieldVals(c.form) }); }, 400);
  };
  modalBody.addEventListener("input", noteInput); modalBody.addEventListener("change", noteInput);
  modalBody.addEventListener("submit", e => {
    if (!cur || e.target !== cur.form) return; const c = cur; c.sending = true;
    // if the form is still there afterwards, it didn't go through (a check failed), so keep the draft
    setTimeout(() => { if (!modalBody.contains(c.form) || modal.hidden) { c.done = true; clearTimeout(draftT); lsSet(c.key, null); drafts.delete(c.key); } else c.sending = false; });
  }, true);
  const openModal = (html, wide) => {
    if (modal.hidden) lastFocus = document.activeElement; else if (keepDraft()) toast("Draft kept. Open the form again to carry on");
    modalBody.innerHTML = html; modal.hidden = false;
    modal.querySelector(".modal-box").classList.toggle("wide", !!wide);
    document.body.classList.add("no-scroll");
    modal.querySelector(".modal-box").scrollTop = 0;
    modal.querySelector(".modal-x").focus();
    bindOpeners(modalBody);
    trackDraft();
  };
  const closeModal = () => {
    const kept = keepDraft();
    modal.hidden = true; document.body.classList.remove("no-scroll"); lastFocus && lastFocus.focus && lastFocus.focus();
    if (kept) toast("Draft kept. Open the form again to carry on");
  };
  const unsaved = () => cur && cur.dirty && !cur.done && !cur.sending && modalBody.contains(cur.form);
  modal.addEventListener("click", e => {
    if (!e.target.closest("[data-close]")) return;
    // a stray click on the dark area round a form you've started doesn't close it
    if (e.target.classList.contains("modal-backdrop") && unsaved()) { toast("Use × or Cancel to close. Your draft is kept"); return; }
    closeModal();
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !modal.hidden) { if (unsaved() && document.activeElement && document.activeElement.closest("form")) { toast("Use × or Cancel to close. Your draft is kept"); return; } closeModal(); } });
  function confirmBox(title, text, okLabel, onOk, danger = true) {
    openModal(`<h2 id="modalTitle" class="m-title">${esc(title)}</h2><p class="muted">${text}</p>
      <div class="form-actions"><button class="btn ${danger ? "btn-danger" : "btn-accent"}" id="cfOk">${esc(okLabel)}</button><button class="btn btn-ghost" data-close>Cancel</button></div>`);
    $("#cfOk").addEventListener("click", onOk);
  }

  // ---------- header: account, bell ----------
  const acctBtn = $("#acctBtn"), acctMenu = $("#acctMenu");
  function drawHeader() {
    const m = me();
    acctBtn.innerHTML = m ? `<span class="avatar avatar-xs">${initials(m.name)}</span><span class="acct-n">${esc(first(m.name))}</span>` : "Sign in";
    acctBtn.classList.toggle("btn-accent-ghost", !m);
    const unread = m ? S.notifications.filter(n => n.to === m.id && !n.read && n.kind !== "message" && n.kind !== "sent").length : 0;
    const unm = m ? msgUnread() : 0;
    $("#msgBtn").hidden = !m; $("#msgN").hidden = !unm; $("#msgN").textContent = unm;
    $("#msgBtn").setAttribute("aria-label", `Messages${unm ? `, ${unm} unread` : ""}`);
    $("#bellBtn").hidden = !m; $("#bellN").hidden = !unread; $("#bellN").textContent = unread;
    $("#bellBtn").setAttribute("aria-label", `Notifications${unread ? `, ${unread} unread` : ""}`);
    $('[data-view="admin"]').hidden = !isAdmin();
    const tb = $("#termBanner"), needs = m && !m.guest && m.termFor && !m.termConfirmed && studyTerm(m.term);
    tb.hidden = !needs;
    if (needs) {
      const cur = startedTerm();
      tb.innerHTML = `<p><b>${esc(cur ? cur.name : "A new term")} has started.</b> Your profile now says ${esc(m.term)}, ${esc(m.cohort || "no cohort")}. Is that right?</p><span class="tb-acts"><button class="btn btn-accent btn-sm" id="tbYes">Looks right</button><button class="btn btn-ghost btn-sm" id="tbFix">Change it</button></span>`;
      $("#tbYes").onclick = () => { m.termConfirmed = true; drawHeader(); if (view === "me") loadMe(); toast(`Confirmed: ${m.term}, ${m.cohort}`); };
      $("#tbFix").onclick = () => { setView("me"); setTimeout(() => meForm.cohort.focus(), 50); };
    }
    const cb = $("#claimBanner"), cl = claimsFor(m);
    cb.hidden = !cl.length;
    if (cl.length) {
      cb.innerHTML = `<p><b>Is this you?</b> <span>${cl.length === 1 ? `Someone added “${esc(cl[0].name)}” as ${esc(cl[0].role)} on ${esc(cl[0].p.title)}.` : `Your name was added by hand to ${cl.length} projects.`}</span> <span>Confirm it's you, and once they approve it's on your profile.</span></p><span class="tb-acts"><button class="btn btn-accent btn-sm" id="cbOpen">Check</button></span>`;
      $("#cbOpen").onclick = openClaims;
    }
    const waiting = m ? S.requests.filter(q => q.status === "pending" && project(q.pid) && runs(project(q.pid), m)).length : 0;
    $('[data-view="mine"]').innerHTML = `My shoots${waiting ? ` <span class="tab-n">${waiting}</span>` : ""}`;
  }
  acctBtn.addEventListener("click", e => {
    e.stopPropagation();
    const m = me(); if (!m) return openSignIn();
    acctMenu.innerHTML = `<p class="am-who"><b>${esc(m.name)}</b><span>${esc(m.email)}</span>${isOwner(m) ? `<span class="tag-admin">Owner</span>` : isAdmin(m) ? `<span class="tag-admin">Admin</span>` : ""}${m.guest ? `<span class="tag-guest">Guest</span>` : ""}</p>
      <p class="am-h">You</p><button data-go="me">My profile</button><button data-myavail>My availability</button><button data-msgs>Messages${msgUnread() ? ` <span class="tab-n">${msgUnread()}</span>` : ""}</button><button data-go="mine">My shoots</button>${isAdmin(m) ? `<button data-go="admin">Admin</button>` : ""}
      <p class="am-h">Projects</p><button data-go="scripts"><span class="am-n" aria-hidden="true">1</span>Develop</button><button data-go="cast"><span class="am-n" aria-hidden="true">2</span>Casting</button><button data-go="projects"><span class="am-n" aria-hidden="true">3</span>Shoot</button><button data-go="post"><span class="am-n" aria-hidden="true">4</span>Post</button><button data-go="release"><span class="am-n" aria-hidden="true">5</span>Release</button>
      <p class="am-h">More</p><button data-go="calendar">Calendar</button><button data-go="crew">Crew</button><button data-go="fund">Funding</button><button data-go="paid">Paid</button>
      <p class="am-h">Crew Call</p><button data-install>Add to home screen</button><button data-privacy>Privacy notice</button><button data-go="about">About Crew Call</button>
      ${LIVE ? "" : `<button data-switch>Switch sample person</button>`}<button data-signout>Sign out</button>`;
    acctMenu.hidden = !acctMenu.hidden; acctBtn.setAttribute("aria-expanded", String(!acctMenu.hidden));
  });
  acctMenu.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return; acctMenu.hidden = true;
    if (b.dataset.go) setView(b.dataset.go);
    if (b.hasAttribute("data-switch")) openSignIn();
    if (b.hasAttribute("data-msgs")) openMessages();
    if (b.hasAttribute("data-myavail")) { setView("me"); showMeTab("days"); }
    if (b.hasAttribute("data-signout") && LIVE) { toast("Signing out…"); try { Object.keys(localStorage).filter(k => k.startsWith("cc-draft:")).forEach(k => localStorage.removeItem(k)); } catch (e) {} window.CC_CLOUDAPI.signOut(); return; }
    if (b.hasAttribute("data-signout")) { S.meId = null; editMine = false; drawHeader(); setView("calendar"); toast("Signed out"); }
  });
  document.addEventListener("click", e => { if (!e.target.closest(".acct")) acctMenu.hidden = true; });
  $("#view-projects").addEventListener("click", e => { const b = e.target.closest("[data-go]"); if (b) setView(b.dataset.go); });
  $("#bellBtn").addEventListener("click", openInbox);
  $("#msgBtn").addEventListener("click", () => openMessages());

  function openInbox() {
    const m = me(); if (!m) return;
    const list = S.notifications.filter(n => n.to === m.id && n.kind !== "sent");
    const KIND = { request: "Request", match: "Role match", update: "Update", message: "Message", invite: "Invite", term: "New term" };
    openModal(`<h2 id="modalTitle" class="m-title">Notifications</h2>
      <p class="muted small">Everything here is also emailed to ${esc(m.email)} unless you've turned that type off in My profile.</p>
      ${list.length ? `<ul class="inbox">${list.map(n => `<li class="${n.read ? "" : "unread"}">
        <span class="ib-kind ib-${n.kind}">${KIND[n.kind] || "Note"}</span>
        <span class="ib-t">${esc(n.text)}</span>
        <span class="ib-m">${ago(n.at)}${n.emailed ? " · emailed" : " · in app only"}${n.pid && project(n.pid) ? ` · <button class="link-btn" data-proj="${n.pid}">Open project</button>` : ""}${n.kind === "message" && msgFrom(n) ? ` · <button class="link-btn" data-thread="${msgFrom(n)}">Reply</button>` : ""}</span></li>`).join("")}</ul>` : `<p class="empty-sm">Nothing yet.</p>`}`);
    modalBody.querySelectorAll("[data-thread]").forEach(b => (b.onclick = () => openThread(b.dataset.thread)));
    list.forEach(n => { if (n.kind !== "message") n.read = true; }); drawHeader();
  }

  // ---------- sign in ----------
  const nameFromEmail = e => e.split("@")[0].split(/[._-]/).filter(x => x && !/^\d+$/.test(x) && x !== "hmu").slice(0, 2).map(x => x[0].toUpperCase() + x.slice(1)).join(" ") || "New member";
  // Email box for signing in: type the name, pick the ending (LFS first). Typing an @ or picking Other switches to a full address.
  const MAIL_DOMAINS = ["gmail.com", "outlook.com", "hotmail.com", "icloud.com", "yahoo.com"];
  function emailField(value = "") {
    const doms = [...new Set(["student.lfs.org.uk", ...C.LFS_DOMAINS, ...MAIL_DOMAINS])];
    const [nm, dm] = value.includes("@") ? value.split("@") : [value, doms[0]];
    const known = doms.includes(dm);
    return `<div class="field em-field"><span id="emL">Email</span><div class="em-row${known ? "" : " is-custom"}">
      <input name="email" type="text" required aria-labelledby="emL" autocomplete="email" autocapitalize="none" spellcheck="false" placeholder="${known ? "first.last" : "you@example.com"}" value="${esc(known ? nm : value)}">
      <select name="emdom" aria-label="Email ending" data-native>${doms.map(d => `<option value="${d}"${known && d === dm ? " selected" : ""}>@${d}</option>`).join("")}<option value="*"${known ? "" : " selected"}>Other…</option></select></div></div>`;
  }
  function bindEmailField(form) {
    const inp = form.email, sel = form.emdom, row = form.querySelector(".em-row");
    const custom = on => { row.classList.toggle("is-custom", on); inp.type = on ? "email" : "text"; inp.placeholder = on ? "you@example.com" : "first.last"; };
    sel.addEventListener("change", () => { const on = sel.value === "*"; const v = inp.value.trim(); if (on && v && !v.includes("@")) inp.value = v + "@"; if (!on && v.includes("@")) inp.value = v.split("@")[0]; custom(on); inp.focus(); });
    // typing an @ switches to a full address; on leaving the box a known ending goes back into the dropdown
    inp.addEventListener("input", () => { if (sel.value !== "*" && inp.value.includes("@")) { sel.value = "*"; custom(true); } });
    inp.addEventListener("blur", () => { if (sel.value !== "*") return; const [n, d] = inp.value.trim().toLowerCase().split("@"); const hit = d && [...sel.options].find(o => o.value === d); if (n && hit) { inp.value = n; sel.value = d; custom(false); } });
    return () => { const v = inp.value.trim().toLowerCase().replace(/\s+/g, ""); return sel.value === "*" ? v : v.split("@")[0] + "@" + sel.value; };
  }
  function openSignIn(reason) {
    if (LIVE) return openCloudSignIn(reason);
    const samples = [["s3", "Producer on Salt Water and Brick & Bone. Admin."], ["s7", "Directs Salt Water. Admin."], ["s1", "DoP. Has a pending request on Static."], ["s8", "1st AC who wants to learn DoP and Gaffer."], ["s17", "Freelance HMU, joined by invite. Guest."], ["s18", "MA Screenwriting. Has a director interested in Low Tide."], ["s20", "MA Film Marketing. Unit publicist."], ["s11", "Directs Static. Has a request waiting."]];
    openModal(`
      <h2 id="modalTitle" class="m-title">Sign in to Crew Call</h2>
      ${reason ? `<p class="signin-reason">${esc(reason)}</p>` : ""}
      <p class="muted">LFS students and staff sign in with their LFS Microsoft account. Anyone without an LFS email, such as a freelance HMU artist, needs an invite from an LFS member first.</p>
      <button class="btn btn-ms" id="msBtn"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="1" y="1" width="8.5" height="8.5" fill="#f25022"/><rect x="10.5" y="1" width="8.5" height="8.5" fill="#7fba00"/><rect x="1" y="10.5" width="8.5" height="8.5" fill="#00a4ef"/><rect x="10.5" y="10.5" width="8.5" height="8.5" fill="#ffb900"/></svg>Continue with Microsoft (LFS)</button>
      <p class="muted small">By signing in you agree to the <button type="button" class="link-btn" data-privacy>privacy notice</button>.</p>
      <p class="or"><span>or, if you were invited</span></p>
      <form id="siForm" class="si-form">${emailField()}<button class="btn btn-ghost" type="submit">Email me a sign-in code</button></form>
      <p class="form-err" id="siErr" role="alert"></p>
      <details class="samples" open><summary>Prototype: sign in as a sample person</summary>
        <ul>${samples.map(([id, d]) => `<li><button class="sample" data-as="${id}"><span class="avatar">${initials(student(id).name)}</span><span><b>${esc(student(id).name)}</b><span>${esc(d)}</span></span></button></li>`).join("")}
        <li><button class="sample" data-new><span class="avatar">+</span><span><b>A new LFS student</b><span>Starts with an empty profile.</span></span></button></li></ul>
      </details>`);
    $("#msBtn").addEventListener("click", () => { toast("In the live app this opens the LFS Microsoft login. Try an email or sample person below."); modalBody.querySelector("input[name=email]").focus(); });
    { const getMail = bindEmailField($("#siForm")); $("#siForm").addEventListener("submit", e => { e.preventDefault(); signInEmail(getMail()); }); }
    modalBody.querySelectorAll("[data-as]").forEach(b => b.addEventListener("click", () => signInAs(b.dataset.as)));
    modalBody.querySelector("[data-new]").addEventListener("click", () => signInEmail("sam.taylor@student.lfs.org.uk"));
  }
  // Live app: sign in with a 6-digit code emailed by Supabase (or the link in the same email)
  function openCloudSignIn(reason, email = "") {
    openModal(`
      <h2 id="modalTitle" class="m-title">Sign in to Crew Call</h2>
      ${reason ? `<p class="signin-reason">${esc(reason)}</p>` : ""}
      <p class="muted">Use your LFS email. Anyone without one, such as a freelance HMU artist, needs an invite from an LFS member first.</p>
      <form id="siForm" class="si-form">${emailField(email)}<button class="btn btn-accent" type="submit">Email me a sign-in code</button></form>
      <form id="codeForm" class="si-form" hidden><p class="muted small" id="codeSent"></p><label class="field"><span>Code from the email</span><input name="code" inputmode="numeric" autocomplete="one-time-code" required maxlength="10" placeholder="123456"></label><button class="btn btn-accent" type="submit">Sign in</button><button type="button" class="link-btn small" id="codeBack">Use a different email</button></form>
      <p class="form-err" id="siErr" role="alert"></p>
      <p class="muted small">By signing in you agree to the <button type="button" class="link-btn" data-privacy>privacy notice</button>. Your device only keeps you signed in, plus a draft of any form you haven't sent yet. Signing out clears both.</p>
      <p class="small demo-link"><span>Want a look first?</span> <a href="${DEMO_URL}">Try the demo with sample people</a></p>`);
    const f = $("#siForm"), cf = $("#codeForm"), err = $("#siErr"), getMail = bindEmailField(f);
    let addr = "";
    f.addEventListener("submit", async e => {
      e.preventDefault(); err.textContent = ""; addr = getMail();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) return (err.textContent = "That email address doesn't look right.");
      const btn = f.querySelector("button"); btn.disabled = true;
      try {
        if (!(await window.CC_CLOUDAPI.canJoin(addr))) { btn.disabled = false; return (err.textContent = `${addr} isn't an LFS address and hasn't been invited. Ask someone with an LFS email to invite you from My shoots.`); }
        const m = await window.CC_CLOUDAPI.sendCode(addr);
        btn.disabled = false;
        if (m) return (err.textContent = m);
        f.hidden = true; cf.hidden = false; $("#codeSent").textContent = `We've emailed a code to ${addr}. It can take a minute. You can also press the link in that email.`; cf.code.focus();
      } catch (_) { btn.disabled = false; err.textContent = "Couldn't reach Crew Call. Check your connection and try again."; }
    });
    cf.addEventListener("submit", async e => {
      e.preventDefault(); err.textContent = ""; const btn = cf.querySelector("button[type=submit]"); btn.disabled = true;
      const m = await window.CC_CLOUDAPI.verify(addr, cf.code.value.trim()); btn.disabled = false;
      if (m) err.textContent = /expired|invalid/i.test(m) ? "That code is wrong or has expired. Check the latest email, or send a new one." : m;
    });
    $("#codeBack").addEventListener("click", () => { cf.hidden = true; f.hidden = false; f.email.focus(); });
  }
  // Called by cloud.js once the signed-in person is known
  function cloudSignIn(id, email) {
    const ex = student(id);
    if (ex) { ex.email = email; S.meId = id; if (ex.mapApp) mapPref = ex.mapApp; drawHeader(); if (ex.incomplete) setView("me"); else render(); return; }
    signInEmail(email, id);
  }
  function signInAs(id) {
    S.meId = id; closeModal(); drawHeader(); editMine = false; { const me = student(id); if (me && me.mapApp) mapPref = me.mapApp; }
    const m = me(); toast(`Signed in as ${m.name}`);
    if (m.incomplete) setView("me"); else setView(view === "gate" ? "calendar" : gatedView || view);
  }
  function signInEmail(raw, liveId) {
    const e = raw.trim().toLowerCase(); const err = $("#siErr");
    const ex = !liveId && S.students.find(s => s.email.toLowerCase() === e);
    if (ex) return signInAs(ex.id);
    const inv = S.invites.find(i => i.email.toLowerCase() === e && (i.status === "pending" || liveId));
    if (!isLfs(e) && !inv && !liveId) { if (err) err.textContent = `${raw.trim()} isn't an LFS address and hasn't been invited. Ask someone with an LFS email to invite you from My shoots.`; return; }
    const st = { id: liveId || uid("s"), name: nameFromEmail(e), email: e, term: inv ? "Guest" : "", cohort: "", course: "", intake: null, termFor: null, termConfirmed: false, pathway: inv ? "External" : C.PATHWAYS[1], roles: [], primary: "", learn: [], kit: [], days: [], reel: "", bio: "", openToOffers: true, shareEmail: false, hideMe: false, incomplete: true, guest: !!inv, invitedBy: inv && inv.by, notify: {}, updated: TODAY };
    syncAvail(st); S.students.push(st);
    if (inv && inv.status === "pending") { inv.status = "joined"; notify(inv.by, "update", `${e} accepted your invite and joined Crew Call.`); }
    S.meId = st.id; closeModal(); drawHeader(); setView("me");
    toast(inv ? "Invite accepted. Finish your profile so producers can find you." : "Signed in. Finish your profile so producers can find you.");
  }

  // ---------- views ----------
  let view = "calendar", gatedView = null;
  const GATED = { crew: ["Sign in to find crew", "Crew profiles, availability and contact details are only visible to signed-in LFS members and invited guests."], mine: ["Sign in to see your shoots", "Projects you run, requests you've sent and shoots you're locked on all live here."], me: ["Sign in to set up your profile", "Add your roles, kit and free days so producers can find you."], scripts: ["Sign in to see Develop", "Scripts and producer pitches are only visible to signed-in LFS members, to protect writers' and producers' ideas."], post: ["Sign in to see Post", "Wrapped shoots looking for editors, colourists, sound designers, composers and VFX. Only visible to signed-in members, to protect unfinished films."], release: ["Sign in to see Release", "Wrapped films looking for posters, trailers, press kits and festival plans. Only visible to signed-in members, to protect unreleased films."], fund: ["Sign in to see Funding", "Crowdfunding campaigns for LFS films, with their goals and deadlines. Only visible to signed-in members."], paid: ["Sign in to see paid work", "Paid jobs from students, alumni and industry contacts. Only visible to signed-in members."], admin: ["Admins only", "Sign in with an admin account to manage Crew Call."] };
  // Develop, Casting, Shoot, Post and Release sit together under Projects
  const STAGES = ["scripts", "cast", "projects", "post", "release"];
  let lastStage = "projects";
  const setView = v => {
    if (v === "stages") v = lastStage;
    if (v === "admin" && me() && !isAdmin()) v = "calendar";
    if (STAGES.includes(v)) lastStage = v;
    let show = v;
    if (GATED[v] && !me()) { gatedView = v; show = "gate"; } else gatedView = null;
    view = v;
    $$(".tabs [role=tab]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.view === "stages" ? STAGES.includes(v) : b.dataset.view === v)));
    $("#stageTabs").hidden = !STAGES.includes(v);
    $$("#stageTabs [data-stage]").forEach(b => { const on = b.dataset.stage === v; b.classList.toggle("on", on); if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    $$(".view").forEach(s => (s.hidden = s.id !== `view-${show}`));
    if (show === "gate") {
      const [t, d] = GATED[v];
      $("#view-gate").innerHTML = `<div class="gate-card"><span class="gate-ic" aria-hidden="true">${CREW_IC}</span><h1 class="page-title">${t}</h1><p class="muted">${d}</p><button class="btn btn-accent" data-signin>Sign in</button></div>`;
      bindOpeners($("#view-gate"));
    } else render();
    window.scrollTo({ top: 0 });
  };
  $$(".tabs [role=tab]").forEach(b => b.addEventListener("click", () => setView(b.dataset.view)));
  $$("#stageTabs [data-stage]").forEach(b => b.addEventListener("click", () => setView(b.dataset.stage)));

  // ---------- CALENDAR ----------
  let calMonth = TODAY.slice(0, 7) + "-01", selDay = TODAY, calMode = "month", editMine = false;
  fillSelect($("#calRole"), allRoles());
  fillSelect($("#calTerm"), C.TERMS);
  const shift = n => {
    if (calMode === "week") { selDay = addDays(selDay, 7 * n); calMonth = selDay.slice(0, 7) + "-01"; }
    else { const d = D(calMonth); d.setUTCMonth(d.getUTCMonth() + n); calMonth = iso(d); }
    renderCalendar();
  };
  $("#prevMonth").onclick = () => shift(-1);
  $("#nextMonth").onclick = () => shift(1);
  $("#todayBtn").onclick = () => { calMonth = TODAY.slice(0, 7) + "-01"; selDay = TODAY; renderCalendar(); };
  $("#modeMonth").onclick = () => { calMode = "month"; calMonth = selDay.slice(0, 7) + "-01"; renderCalendar(); };
  $("#modeWeek").onclick = () => { calMode = "week"; if (selDay.slice(0, 7) !== calMonth.slice(0, 7)) selDay = calMonth; renderCalendar(); };
  ["#calRole", "#calTerm", "#calShowFree"].forEach(s => $(s).addEventListener("change", renderCalendar));
  $("#editMineBtn").addEventListener("click", () => { if (!me()) return openSignIn("Sign in to mark the days you're free."); editMine = !editMine; renderCalendar(); });
  $("#syncBtn").addEventListener("click", openSync);

  function calProjects(d) {
    const role = $("#calRole").value, term = $("#calTerm").value;
    return live().filter(p => inRanges(p.shoots, d) && (!term || p.term === term) && (!role || openRoles(p).some(r => r.role === role)));
  }
  function calFree(d) {
    const role = $("#calRole").value, term = $("#calTerm").value;
    return S.students.filter(s => listed(s) && isFree(s, d) && (!role || s.roles.includes(role)) && (!term || s.term === term));
  }
  function dayClick(d) {
    const mine = me();
    if (editMine) { if (d < TODAY) return toast("That day has passed"); if (bookedOn(mine.id, d).length) return toast("You're booked on a shoot that day"); toggleDay(mine, d); selDay = d; renderCalendar(); return; }
    selDay = d; renderCalendar(); if (window.innerWidth < 960) $("#dayPanel").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  // LFS key dates shown on the calendar: enrolment, term starts and ends, and when cohorts finish
  function keyDatesOn(d) {
    const out = [];
    TD().forEach(t => {
      const en = t.enrol || [];
      if (en[0] && d >= en[0] && d <= (en[1] || en[0])) out.push(enrolLabel(t));
      if (t.start === d) { out.push(`${t.name} starts`); if (t.start > TODAY) C.COURSES.forEach(cr => { if (cr.every !== "term") return; const o = cohortOptions(cr, periodNo(t)).find(x => x.n === 1); if (o) out.push(`${o.code} starts Term 1`); }); }
      if (t.end === d) out.push(`${t.name} ends`);
    });
    C.COURSES.forEach(cr => cohortOptions(cr).forEach(o => { if (o.n < 1) return; const e = cohortEnd(cr, o.intake); if (e.date === d && (e.exact || cr.every === "year")) out.push(`${o.code} finishes`); }));
    return [...new Set(out)];
  }
  function renderCalendar() {
    const mine = me(); if (!mine) editMine = false;
    $("#modeMonth").setAttribute("aria-pressed", String(calMode === "month"));
    $("#modeWeek").setAttribute("aria-pressed", String(calMode === "week"));
    $("#prevMonth").setAttribute("aria-label", calMode === "week" ? "Previous week" : "Previous month");
    $("#nextMonth").setAttribute("aria-label", calMode === "week" ? "Next week" : "Next month");
    $("#editMineBtn").setAttribute("aria-pressed", String(editMine));
    $("#editMineBtn").textContent = editMine ? "Done editing" : "My availability";
    $("#editHint").hidden = !editMine;
    const grid = $("#calGrid"), showFree = $("#calShowFree").checked;
    grid.classList.toggle("editing", editMine);
    grid.classList.toggle("week", calMode === "week");
    $(".cal-grid-head").hidden = calMode === "week";
    const cell = (d, out) => {
      const ps = calProjects(d), free = showFree && calFree(d).length;
      const myFree = mine && mine.days.includes(d), myBooked = mine && bookedOn(mine.id, d).length;
      return { ps, free, myFree, myBooked, cls: [d === TODAY && "today", d === selDay && !editMine && "sel", d < TODAY && "past", out && "out", myFree && "mine", myBooked && "mine-booked"].filter(Boolean).join(" ") };
    };
    const meTag = c => (mine && (c.myFree || c.myBooked) ? `<span class="me-tag">${c.myBooked ? "You: booked" : "You: free"}</span>` : "");
    const crewTag = c => (c.free ? `<span class="avail-ic" title="Crew available">${CREW_IC}</span>` : "");
    let html = "";
    if (calMode === "week") {
      const ws = mondayOf(selDay), we = addDays(ws, 6);
      $("#monthLabel").textContent = `${fmtRange({ from: ws, to: we })} ${D(we).getUTCFullYear()}`;
      for (let i = 0; i < 7; i++) {
        const d = addDays(ws, i), c = cell(d, false), dd = D(d);
        html += `<div class="wk-col ${c.cls}">
          <button class="wk-head" data-day="${d}" aria-label="${fmtDay(d)}${c.free ? ", crew available" : ""}"><span class="wk-dow">${WD[dd.getUTCDay()]}</span><span class="wk-num">${dd.getUTCDate()}</span>${crewTag(c)}</button>${keyDatesOn(d).map(k => `<span class="cal-key">${esc(k)}</span>`).join("")}
          <div class="wk-items">${c.ps.length ? c.ps.map(p => { const inf = dayInfo(p, d); return `<button class="wk-item" data-proj="${p.id}" style="--c:${projColor(p)}"><span class="wk-t">${esc(p.title)}</span><span class="wk-time mono">${callWrap(inf)}</span><span class="wk-loc">${esc(locName(p, inf.loc))}</span>${openRoles(p).length ? `<span class="wk-open">${openRoles(p).length} open</span>` : `<span class="wk-open done">Crewed</span>`}</button>`; }).join("") : `<p class="wk-empty">No shoots</p>`}</div>
          ${meTag(c)}</div>`;
      }
      grid.innerHTML = html;
      grid.querySelectorAll(".wk-head").forEach(b => b.addEventListener("click", () => dayClick(b.dataset.day)));
      bindOpeners(grid);
    } else {
      const m = D(calMonth);
      $("#monthLabel").textContent = `${MONTH_FULL[m.getUTCMonth()]} ${m.getUTCFullYear()}`;
      const off = (m.getUTCDay() + 6) % 7, start = addDays(calMonth, -off);
      const last = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 0));
      const total = Math.ceil((off + last.getUTCDate()) / 7) * 7;
      for (let i = 0; i < total; i++) {
        const d = addDays(start, i), dd = D(d), c = cell(d, dd.getUTCMonth() !== m.getUTCMonth());
        const chips = c.ps.slice(0, 3).map(p => `<span class="cal-chip" style="--c:${projColor(p)}"><span class="cal-chip-t">${esc(p.title)}</span>${openRoles(p).length ? `<span class="cal-chip-n">${openRoles(p).length}</span>` : ""}</span>`).join("");
        html += `<button class="cal-cell ${c.cls}" data-day="${d}" aria-label="${fmtDay(d)}: ${c.ps.length} shoot${c.ps.length === 1 ? "" : "s"}${c.free ? ", crew available" : ""}">
          <span class="cal-num">${dd.getUTCDate()}</span>${(k => k.length ? `<span class="cal-key" title="${esc(k.join(", "))}">${esc(k[0])}${k.length > 1 ? ` +${k.length - 1}` : ""}</span>` : "")(keyDatesOn(d))}<span class="cal-chips">${chips}${c.ps.length > 3 ? `<span class="cal-more">+${c.ps.length - 3} more</span>` : ""}</span>${meTag(c)}${crewTag(c)}</button>`;
      }
      grid.innerHTML = html;
      grid.querySelectorAll(".cal-cell").forEach(b => b.addEventListener("click", () => dayClick(b.dataset.day)));
    }
    renderDayPanel();
  }
  function renderDayPanel() {
    const d = selDay, ps = calProjects(d), free = calFree(d), role = $("#calRole").value;
    $("#dayPanel").innerHTML = `
      <div class="dp-head"><p class="eyebrow">${d === TODAY ? "Today" : "Selected day"}</p><h2 class="dp-title">${fmtDay(d)}</h2></div>
      ${(k => k.length ? `<h3 class="dp-sub">School dates</h3><ul class="dp-key">${k.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "")(keyDatesOn(d))}
      <h3 class="dp-sub">Shooting <span class="count">${ps.length}</span></h3>
      ${ps.length ? ps.map(p => { const inf = dayInfo(p, d); return `
        <button class="dp-proj" data-proj="${p.id}" style="--c:${projColor(p)}">
          <span class="dp-proj-t">${esc(p.title)}</span>
          <span class="dp-proj-m"><span class="mono">Call ${inf.call} · Wrap ${inf.wrap}</span> · ${esc(locName(p, inf.loc))}</span>
          <span class="dp-proj-r">${openRoles(p).length ? `${openRoles(p).length} open: ${esc([...new Set(openRoles(p).map(r => r.role))].slice(0, 4).join(", "))}` : "Fully crewed"}</span>
        </button>`; }).join("") : `<p class="empty-sm">No shoots${role ? ` needing a ${esc(role)}` : ""} on this day.</p>`}
      <h3 class="dp-sub">Free ${role ? esc(role) + "s" : "crew"} <span class="count">${free.length}</span></h3>
      ${!me() ? `<p class="empty-sm">${free.length} ${free.length === 1 ? "person is" : "people are"} free. <button class="link-btn" data-signin>Sign in</button> to see who.</p>` :
        free.length ? `<ul class="dp-crew">${free.map(s => `<li><button class="dp-person" data-student="${s.id}"><span class="avatar">${initials(s.name)}</span>
          <span><span class="dp-person-n">${esc(s.name)} <span class="term-tag">${esc(tLabel(s))}</span></span><span class="dp-person-r">${esc(s.roles.join(" · "))}${s.kit.length ? ` <span class="kit-flag">Kit</span>` : ""}</span></span></button></li>`).join("")}</ul>`
        : `<p class="empty-sm">Nobody${role ? ` who does ${esc(role)}` : ""} has marked this day free.</p>`}`;
    bindOpeners($("#dayPanel"));
  }

  // ---------- calendar sync (.ics) ----------
  const icsEsc = s => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  function buildIcs(projects, name) {
    const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Crew Call//LFS//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${icsEsc(name)}`, "X-WR-TIMEZONE:Europe/London"];
    projects.forEach(p => { const ds = projDays(p); ds.forEach((d, i) => {
      const inf = dayInfo(p, d), endDay = inf.wrap <= inf.call ? addDays(d, 1) : d, c = contactOf(p);
      const t = (day, hm) => day.replace(/-/g, "") + "T" + hm.replace(":", "") + "00";
      L.push("BEGIN:VEVENT", `UID:${p.id}-${d}@crewcall.lfs`, "DTSTAMP:20261106T090000Z", `DTSTART:${t(d, inf.call)}`, `DTEND:${t(endDay, inf.wrap)}`,
        `SUMMARY:${icsEsc(`${p.title} · Day ${i + 1}/${ds.length}`)}`, `LOCATION:${icsEsc(locName(p, inf.loc))}`,
        `DESCRIPTION:${icsEsc(`${p.type}, ${p.term}. Call ${inf.call}, wrap ${inf.wrap}.\nContact: ${c.name} (${c.role}).\nOpen roles: ${openRoles(p).map(r => r.role).join(", ") || "none"}.`)}`, "END:VEVENT");
    }); });
    L.push("END:VCALENDAR"); return L.join("\r\n");
  }
  const myFeedProjects = () => { const m = me(); return m ? live().filter(p => !isPast(p) && (onProject(p, m.id) || runs(p, m))) : []; };
  function openSync() {
    const m = me();
    if (LIVE && !m) return openSignIn("Sign in to get your calendar link.");
    const token = m ? m.id + "x" + (m.email.length * 7919).toString(36) : "public";
    const feedBase = LIVE ? window.CC_CLOUDAPI.funcUrl.replace(/^https:/, "webcal:") + "/cal/" : "webcal://lfscrewcall.github.io/crewcall/feed/";
    const feeds = { mine: `${feedBase}${token}/my-shoots.ics`, all: `${feedBase}${token}/all-shoots.ics` };
    let feed = m ? "mine" : "all";
    openModal(`
      <h2 id="modalTitle" class="m-title">Sync with your calendar</h2>
      <p class="muted">Subscribe once. Shoots added later, date changes and new call times all appear in your calendar on their own, so you never need to subscribe again.</p>
      <p class="muted small">Outlook checks for changes every few hours, and sometimes takes up to a day. Last-minute changes also come to you as a Crew Call notification.</p>
      <div class="seg" role="radiogroup" aria-label="Which shoots">
        <label><input type="radio" name="feed" value="mine" ${feed === "mine" ? "checked" : ""} ${m ? "" : "disabled"}> <span>Shoots I'm on or run${m ? ` (${myFeedProjects().length})` : " (sign in)"}</span></label>
        <label><input type="radio" name="feed" value="all" ${feed === "all" ? "checked" : ""}> <span>Every shoot (${live().filter(p => !isPast(p)).length})</span></label>
      </div>
      <label class="field mt"><span>Your calendar link</span><span class="copy-row"><input id="feedUrl" readonly><button class="btn btn-ghost btn-sm" id="feedCopy">Copy</button></span></label>
      <div class="sync-btns"><a class="btn btn-accent btn-sm" id="oneOutlook" target="_blank" rel="noopener">Add to Outlook (LFS)</a><a class="btn btn-ghost btn-sm" id="oneGoogle" target="_blank" rel="noopener">Add to Google</a><a class="btn btn-ghost btn-sm" id="oneApple">Add to Apple</a></div>
      <div class="sync-steps">
        <section><h3>Outlook <small>LFS uses Microsoft 365</small></h3><ol><li>Open Outlook on the web and go to Calendar.</li><li>Select <b>Add calendar</b>, then <b>Subscribe from web</b>.</li><li>Paste the link, name it Crew Call and select <b>Import</b>.</li></ol><p class="muted small">It then appears in Outlook on your phone and desktop too. Classic Outlook: Add calendar, then From Internet.</p></section>
        <section><h3>Google Calendar</h3><ol><li>On a computer, open Google Calendar.</li><li>Next to <b>Other calendars</b>, select <b>+</b>, then <b>From URL</b>.</li><li>Paste the link and select <b>Add calendar</b>.</li></ol></section>
        <section><h3>Apple Calendar</h3><ol><li>Mac: <b>File</b>, then <b>New Calendar Subscription</b>, and paste the link.</li><li>iPhone: tap <b>Add to Apple</b> above, or Settings, Calendar, Accounts, Add Subscribed Calendar.</li></ol></section>
      </div>
      ${LIVE ? `<p class="muted small">This link is personal: anyone with it can see the shoots in it. If you shared it by mistake, <button type="button" class="link-btn" id="feedReset">make a new link</button> and the old one stops working.</p>` : `<p class="proto-note">Demo: these links work in the live app. Here you can download a one-off file instead. A file won't update itself.</p>`}
      <button class="btn btn-ghost btn-sm" id="icsNow">Download .ics file</button>`, true);
    const upd = () => {
      feed = (modalBody.querySelector("[name=feed]:checked") || {}).value || "all";
      const u = feeds[feed], https = u.replace("webcal://", "https://");
      $("#feedUrl").value = u;
      $("#oneOutlook").href = `https://outlook.office.com/calendar/0/addfromweb?url=${encodeURIComponent(u)}&name=${encodeURIComponent("Crew Call")}`;
      $("#oneGoogle").href = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(u)}`;
      $("#oneApple").href = u;
      $("#feedUrl").dataset.https = https;
    };
    modalBody.querySelectorAll("[name=feed]").forEach(r => r.addEventListener("change", upd)); upd();
    $("#feedCopy").addEventListener("click", () => copy($("#feedUrl").value));
    const links = [$("#oneOutlook"), $("#oneGoogle"), $("#oneApple"), $("#feedCopy")];
    if (LIVE) {
      const setTok = t => { feeds.mine = `${feedBase}${t}/my-shoots.ics`; feeds.all = `${feedBase}${t}/all-shoots.ics`; links.forEach(a => a.removeAttribute("aria-disabled")); upd(); };
      links.forEach(a => a.setAttribute("aria-disabled", "true")); $("#feedUrl").value = "Getting your link…";
      window.CC_CLOUDAPI.calToken(false).then(setTok).catch(() => { $("#feedUrl").value = "Couldn't get your link. Try again in a minute."; });
      $("#feedReset").addEventListener("click", () => window.CC_CLOUDAPI.calToken(true).then(t => { setTok(t); toast("New link made. Subscribe again with it; the old one has stopped working."); }).catch(() => toast("Couldn't make a new link")));
      links.forEach(a => a.addEventListener("click", e => { if (a.getAttribute("aria-disabled")) e.preventDefault(); }, true));
    } else [$("#oneOutlook"), $("#oneGoogle"), $("#oneApple")].forEach(a => a.addEventListener("click", e => { e.preventDefault(); toast("Demo: calendar links work in the live app. Use Download .ics here."); }));
    $("#icsNow").addEventListener("click", () => {
      const ps = feed === "mine" ? myFeedProjects() : live().filter(p => !isPast(p));
      download(feed === "mine" ? "crew-call-my-shoots.ics" : "crew-call-all-shoots.ics", buildIcs(ps, feed === "mine" ? "Crew Call: my shoots" : "Crew Call: all shoots"));
      toast(`Downloaded ${ps.reduce((t, p) => t + projDays(p).length, 0)} shoot days`);
    });
  }

  // ---------- PROJECTS ----------
  const shootWhen = p => { const n = daysUntil(firstDay(p)); return n <= 7 ? "This week" : n <= 14 ? "Next 2 weeks" : n <= 31 ? "This month" : "Later"; };
  const shootCfg = () => ({
    placeholder: "Search title, director, location", noun: "shoot", matchHint: "Shoots with an open role that's on your profile",
    text: p => [p.title, p.director, contactOf(p).name, ...locs(p).map(l => l.name + " " + l.detail), p.logline].join(" "),
    match: (p, m) => !isPast(p) && openRoles(p).some(r => m.roles.includes(r.role)),
    sink: p => isPast(p), sinkLabel: "Wrapped",
    groups: [
      { id: "role", multi: true, label: "Role needed", opts: uniqSorted(live().filter(isActive).flatMap(p => openRoles(p).map(r => r.role))), test: (p, v) => openRoles(p).some(r => r.role === v) },
      { id: "when", label: "Shooting", opts: ["This week", "Next 2 weeks", "This month", "Later"], test: (p, v) => !isPast(p) && shootWhen(p) === v },
      { id: "type", label: "Type", opts: C.TYPES.filter(t => live().some(p => isActive(p) && p.type === t)), test: (p, v) => p.type === v },
      { id: "term", label: "Made by", opts: C.TERMS.filter(t => live().some(p => isActive(p) && p.term === t)), test: (p, v) => p.term === v }
    ],
    sorts: [["soon", "Shooting soonest", (a, b) => firstDay(a).localeCompare(firstDay(b)), firstDay], ["new", "Newest", (a, b) => (b.created || "").localeCompare(a.created || ""), p => p.created], ["open", "Most roles open", (a, b) => openRoles(b).length - openRoles(a).length]],
    done: p => !isPast(p) && !openRoles(p).length, doneLabel: "Show fully crewed shoots", doneHidden: "fully crewed",
    table: { color: projColor, dim: isPast, cols: [
      ["Shoot", p => `<button class="link-btn bt-t" data-proj="${p.id}">${esc(p.title)}</button><span class="bt-sub">${esc(p.type)}</span>`],
      ["Dates", p => `<span class="nowrap">${p.shoots.map(fmtRange).join("<br>")}</span>`, "mono small", p => firstDay(p)],
      ["Call", p => dayInfo(p, projDays(p)[0]).call, "mono small"],
      ["Location", p => esc(locShort(p)), "small"],
      ["Made by", p => esc(p.term), "small", p => C.TERMS.indexOf(p.term)],
      ["Crewed", p => { const f = p.roles.length - openRoles(p).length; return `<span class="nowrap">${f}/${p.roles.length}</span>`; }, "mono small", p => (p.roles.length - openRoles(p).length) / p.roles.length],
      ["Open roles", p => { const u = [...new Set(openRoles(p).map(r => r.role))]; return u.length ? `<div class="chips">${u.map(r => `<span class="chip chip-open">${esc(r)}</span>`).join("")}</div>` : `<span class="small ok">Fully crewed</span>`; }, "", p => -openRoles(p).length]
    ] },
    timeline: { color: projColor, dim: isPast, label: p => `<button class="link-btn bt-t" data-proj="${p.id}">${esc(p.title)}</button>`, sub: p => `${p.type} · ${openRoles(p).length ? openRoles(p).length + " open" : "Fully crewed"}`,
      segs: p => p.shoots.map(r => ({ from: r.from, to: r.to, label: fmtRange(r) })) },
    map: { color: projColor, points: p => locs(p), title: p => p.title, badge: p => openRoles(p).length || "✓", when: p => p.shoots.map(fmtRange).join(" + "),
      popup: (p, l) => { const n = openRoles(p).length; return `<div class="map-pop"><b>${esc(p.title)}</b><span>${esc(l.name)}${l.detail ? ` · ${esc(l.detail)}` : ""}</span><span class="mono">${p.shoots.map(fmtRange).join(" + ")}</span><span>${n ? `${n} open role${n === 1 ? "" : "s"}: ${esc([...new Set(openRoles(p).map(r => r.role))].join(", "))}` : "Fully crewed"}</span><span class="map-pop-acts"><button type="button" class="btn btn-accent btn-xs" data-proj="${p.id}">View roles</button>${mapLinks(l, "Directions")}</span></div>`; } }
  });
  function renderProjects(partial) {
    board({ key: "shoot", host: $("#projList"), cfg: shootCfg(), items: live().filter(p => !shootGone(p)), card: projectCard, partial, redraw: renderProjects,
      empty: `<div class="empty"><p class="empty-t">No shoots match</p><p class="muted">Try clearing a filter, or post your own shoot.</p><button class="btn btn-accent btn-sm" data-action="post">Post a shoot</button></div>` });
  }
  function projectCard(p) {
    const open = openRoles(p), filled = p.roles.length - open.length, pct = Math.round((filled / p.roles.length) * 100);
    const uniq = [...new Set(open.map(r => r.role))], mine = me() && runs(p);
    const waiting = mine ? S.requests.filter(q => q.pid === p.id && q.status === "pending").length : 0;
    const past = isPast(p);
    const fu = me() && fundOf(p);
    return `<article class="card proj-card${past ? " is-dim" : ""}${p.cover ? " has-cover" : ""}" style="--c:${projColor(p)}">
      ${coverImg(p.cover, "card-cover")}
      <div class="proj-top"><span class="type-tag">${esc(p.type)}</span><span class="term-tag">${esc(p.term)}</span>${past ? `<span class="tag-arch">Wrapped</span>` : ""}${mine ? `<span class="tag-run">You run this</span>` : ""}${!past && paidOpen(p).length ? `<span class="pay-tag">Paid roles</span>` : ""}</div>
      <h3 class="card-t"><button class="link-btn" data-proj="${p.id}">${esc(p.title)}</button></h3>
      <p class="card-sub">${esc(p.director)} · ${esc(locShort(p))}</p>
      <p class="logline">${esc(p.logline)}</p>
      <p class="dates mono">${p.shoots.map(fmtRange).join(" + ")}${past ? "" : ` · call ${dayInfo(p, projDays(p)[0]).call}`}</p>${p.delivery ? `<p class="small muted">Delivery ${fmtDay(p.delivery)}</p>` : ""}${fu ? `<p class="fund-mini"><button class="link-btn" data-fund="${fu.id}">Crowdfunding</button> <span>${fundPct(fu)}% · ${fundLeft(fu)}</span></p>` : ""}
      <div class="crew-bar" aria-label="${filled} of ${p.roles.length} roles filled"><span style="width:${pct}%"></span></div>
      <p class="small muted">${filled}/${p.roles.length} crewed${waiting ? ` · <span class="warn-t">${waiting} request${waiting > 1 ? "s" : ""} waiting</span>` : ""}</p>
      ${uniq.length ? `<div class="chips">${uniq.map(r => `<span class="chip chip-open">${esc(r)}${open.filter(x => x.role === r).length > 1 ? ` ×${open.filter(x => x.role === r).length}` : ""}</span>`).join("")}</div>` : `<p class="small ok">Fully crewed</p>`}
      <div class="card-actions"><button class="btn btn-ghost btn-sm" data-proj="${p.id}">View roles</button></div>
    </article>`;
  }

  // ---------- PROJECT WINDOW ----------
  const statusChip = q => ({ pending: `<span class="st st-pending">Requested · waiting</span>`, accepted: `<span class="st st-ok">Accepted</span>`, declined: `<span class="st st-no">Not this time</span>`, filled: `<span class="st st-no">Role filled</span>`, closed: `<span class="st st-no">Role removed</span>`, withdrawn: `<span class="st st-no">Withdrawn</span>` }[q.status]);
  const myReqFor = (p, rid, type) => { const m = me(); return m && S.requests.find(q => q.pid === p.id && q.rid === rid && q.sid === m.id && (!type || q.type === type) && q.status !== "withdrawn"); };
  function hubHtml(p, m, mg) {
    const h = hubOf(p);
    if (!m) return "";
    if (!canSeeHub(p)) return hubEmpty(h) ? "" : `<section class="hub-box hub-locked"><h3 class="dp-sub">Crew hub</h3><p class="empty-sm">The WhatsApp group, call sheets and key details are shared with the crew once you're locked in.</p></section>`;
    if (hubEmpty(h)) return mg ? `<section class="hub-box"><h3 class="dp-sub">Crew hub</h3><p class="empty-sm">Add the WhatsApp group, call sheet, script or a Drive folder so your crew have everything in one place.</p><button class="btn btn-ghost btn-xs" data-edit>Add links and details</button></section>` : "";
    return `<section class="hub-box" aria-labelledby="hubH">
      <div class="sec-row"><h3 class="dp-sub" id="hubH">Crew hub</h3><span class="hub-vis">${h.vis === "members" ? "Visible to everyone signed in" : "Crew only"}</span></div>
      ${h.whatsapp ? `<a class="btn btn-wa" href="${esc(h.whatsapp)}" target="_blank" rel="noopener"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.4-.3z"/></svg>Join the WhatsApp group</a>` : ""}
      ${h.links.length ? `<ul class="hub-links">${h.links.map(l => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label || hostOf(l.url))}</a><span class="hub-host">${esc(hostOf(l.url))}</span></li>`).join("")}</ul>` : ""}
      ${h.details ? `<div class="hub-details">${esc(h.details).replace(/\n/g, "<br>")}</div>` : ""}
      ${mg ? `<button class="btn btn-quiet btn-xs mt" data-edit>Edit links and details</button>` : ""}
    </section>`;
  }

  const projTab = {};
  // ---------- cast ----------
  // Cast parts are roles in the Cast group (Talent, Supporting artist), with an optional character and playing age
  const castSet = () => new Set(["Talent", "Supporting artist", ...Object.entries(C.ROLE_GROUPS).filter(([g]) => /cast|talent|actor/i.test(g)).flatMap(([, rs]) => rs)]);
  const isCast = r => castSet().has(typeof r === "string" ? r : r.role);
  // What everyone on a shoot gets (meals, travel, credit), and which roles are paid
  const PERKS = [["meals", "Meals"], ["travel", "Travel"], ["credit", "Credit"]];
  const perksOf = p => Object.assign({ meals: false, travel: false, credit: false }, p.perks || {});
  const paidOpen = p => openRoles(p).filter(r => r.paid);
  const payTag = r => r.paid ? ` <span class="pay-tag">${esc(r.pay || "Paid")}</span>` : "";
  const perksHtml = p => { const k = perksOf(p), on = PERKS.filter(x => k[x[0]]), np = paidOpen(p).length;
    return on.length || np ? `<ul class="perks" aria-label="What crew get">${on.map(x => `<li><span class="perk-ck" aria-hidden="true">✓</span>${x[1]}</li>`).join("")}${np ? `<li class="perk-paid">${np === 1 ? "1 paid role" : `${np} paid roles`}</li>` : ""}</ul>` : ""; };
  const castOf = p => Object.assign({ link: "", closes: "", pay: "", notes: "" }, p.casting || {});
  const castClosed = p => { const c = castOf(p); return !!(c.closes && c.closes < TODAY); };
  const castSite = u => { const h = (/^https?:\/\/(?:www\.)?([^/]+)/i.exec(u || "") || [])[1] || ""; const k = Object.entries({ "backstage.com": "Backstage", "spotlight.com": "Spotlight", "starnow": "StarNow", "mandy.com": "Mandy", "castingcallpro": "Mandy", "forms.gle": "Google Forms", "docs.google.com": "Google Forms" }).find(([d]) => h.includes(d)); return k ? k[1] : h; };
  const partLabel = r => `${r.character ? `<span class="part-char">${esc(r.character)}</span> ` : ""}<span class="part-role">${esc(r.role)}</span>${r.age ? ` <span class="part-age">${esc(r.age)}</span>` : ""}`;

  function castBox(p, past) {
    const c = castOf(p), closed = castClosed(p);
    if (!c.link && !c.notes && !c.closes && !c.pay) return "";
    return `<div class="cast-box${closed || past ? " is-dim" : ""}"><div class="cb-top"><span class="cb-l">Casting call</span>${c.closes ? `<span class="cb-when">${closed || past ? "Closed" : `Closes ${fmtDay(c.closes)}`}</span>` : ""}</div>
      ${c.pay ? `<p class="cb-pay">${esc(c.pay)}</p>` : ""}${c.notes ? `<p class="cb-notes">${esc(c.notes)}</p>` : ""}
      ${c.link && !closed && !past ? `<a class="btn btn-accent btn-xs" href="${esc(c.link)}" target="_blank" rel="noopener">Apply on ${esc(castSite(c.link))}</a>` : ""}</div>`;
  }
  function openProject(id) {
    const p = project(id); if (!p) return;
    const m = me(), mg = canManage(p), days = projDays(p), c = contactOf(p);
    const rank = r => (r === "Producer" ? 0 : r === "Director" ? 1 : 2);
    const locked = p.roles.filter(r => r.filledBy).sort((x, y) => rank(x.role) - rank(y.role));
    const open = p.roles.filter(r => !r.filledBy);
    const pending = S.requests.filter(q => q.pid === p.id && q.status === "pending");
    const past = isPast(p);
    const futureDays = days.filter(d => d >= TODAY);

    const lockRow = r => {
      const bh = m ? briefHtml(r) : "";
      if (isExt(r)) { const cq = m && claimOf(p, r.rid, m.id); return `<li class="lock-row"><span class="role-name">${isCast(r) ? partLabel(r) : esc(r.role) + hodTag(r)}</span><span class="lock-name">${esc(extName(r))} <span class="tag-ext">Not on Crew Call</span></span><span class="lock-mail"></span><span class="lock-acts">${mg && !past ? `<button class="btn btn-quiet btn-xs" data-unfill="${r.rid}" aria-label="Reopen ${esc(r.role)}">Reopen</button>` : cq ? (cq.status === "pending" ? `<span class="st st-pending">Sent · waiting</span>` : cq.status === "declined" ? `<span class="st st-no">Not confirmed</span>` : "") : m && !mg && !onProject(p, m.id) ? `<button class="btn btn-quiet btn-xs" data-claimref="${r.rid}">That's me</button>` : ""}</span>${bh}</li>`; }
      const s = student(r.filledBy) || { id: "", name: "Former member", email: "" };
      const sh = myReqFor(p, r.rid, "shadow");
      const canShadow = m && !mg && s.id !== m.id && !past && !onProject(p, m.id);
      const mine = m && s.id === m.id && !past;
      const ncr = s.id ? creditsOf(s).length : 0;
      return `<li class="lock-row${mine ? " is-me" : ""}"><span class="role-name">${isCast(r) ? partLabel(r) : esc(r.role) + hodTag(r)}</span><span class="lock-who"><button class="link-btn lock-name" data-student="${s.id}">${esc(s.name)}${mine ? " (you)" : ""}</button>${ncr ? `<span class="lock-cr">${ncr === 1 ? "1 credit" : `${ncr} credits`}</span>` : ""}</span>
        <span class="lock-mail">${mg && s.email ? `<a href="mailto:${esc(s.email)}" target="_blank" rel="noopener">${esc(s.email)}</a>` : m && s.id && s.id !== m.id ? (emailVisible(s, p) ? `<a class="btn btn-quiet btn-xs" href="${mailto(s.email, `About ${p.title}`, `Hi ${first(s.name)},\n\n`)}" target="_blank" rel="noopener">Email</a>` : `<button class="btn btn-quiet btn-xs" data-msg="${s.id}">Message</button>`) : ""}</span>
        <span class="lock-acts">${mine ? `<button class="btn btn-quiet btn-xs" data-stepdown="${r.rid}">Step down</button>` : mg && !past ? `<button class="btn btn-quiet btn-xs" data-unfill="${r.rid}" aria-label="Reopen ${esc(r.role)}">Reopen</button>` : sh ? statusChip(sh) : canShadow ? `<button class="btn btn-quiet btn-xs" data-shadow="${r.rid}">Ask to shadow</button>` : ""}</span>${bh}</li>`;
    };
    const lockedCrew = locked.filter(r => !isCast(r)), lockedCast = locked.filter(isCast), openCrew = open.filter(r => !isCast(r)), openCast = open.filter(isCast);
    const lockedRows = lockedCrew.map(lockRow).join("") + p.shadows.map((x, i) => { const s = student(x.sid); return s ? `<li class="lock-row shadow-row"><span class="role-name">Shadow · ${esc(x.role)}</span><button class="link-btn lock-name" data-student="${s.id}">${esc(s.name)}</button><span class="lock-mail"></span><span class="lock-acts">${m && s.id === m.id && !past ? `<button class="btn btn-quiet btn-xs" data-stepdown-sh="${i}">Step down</button>` : mg && !past ? `<button class="btn btn-quiet btn-xs" data-unshadow="${i}">Remove</button>` : ""}</span></li>` : ""; }).join("");

    const openRow = r => {
      const mr = myReqFor(p, r.rid, "crew");
      const matches = m ? S.students.filter(s => listed(s) && s.roles.includes(r.role)).map(s => ({ s, n: freeDaysCount(s, futureDays) })).filter(x => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 4) : [];
      const learners = m ? S.students.filter(s => listed(s) && s.learn.includes(r.role) && freeDaysCount(s, futureDays) > 0).slice(0, 3) : [];
      let acts;
      if (past) acts = "";
      else if (!m) acts = `<button class="btn btn-ghost btn-xs" data-signin>Sign in to request</button>`;
      else if (mg) acts = `<select class="fill-sel" data-fill="${r.rid}" aria-label="Mark ${esc(r.role)} as filled"><option value="">Mark filled…</option><option value="__ext">Someone not on Crew Call…</option>${S.students.filter(s => listed(s) && s.roles.includes(r.role)).map(s => { const busy = days.some(d => bookedOn(s.id, d).length); return `<option value="${s.id}" ${busy ? "disabled" : ""}>${esc(s.name)}${busy ? " (booked on another shoot)" : ""}</option>`; }).join("")}</select>`;
      else if (mr) acts = statusChip(mr) + (mr.status === "pending" ? ` <button class="btn btn-quiet btn-xs" data-withdraw="${mr.id}">Withdraw</button>` : "");
      else if (onProject(p, m.id)) acts = `<span class="muted small">You're on this shoot</span>`;
      else acts = `<button class="btn btn-accent btn-xs" data-req="${r.rid}">Request to join</button>`;
      return `<li class="role-row open">
        <span class="role-name">${isCast(r) ? partLabel(r) : esc(r.role) + hodTag(r)}${payTag(r)}</span>
        <span class="role-who"><span class="chip chip-open">Open</span></span>
        <span class="role-acts">${acts}</span>
        ${m && !past ? `<span class="role-match">${matches.length ? `Free to help: ${matches.map(x => `<button class="match" data-student="${x.s.id}">${esc(x.s.name)} <span class="mono">${x.n === futureDays.length ? "all days" : `${x.n}/${futureDays.length}`}</span></button>`).join("")}` : `<span class="muted">No one with this role has marked these dates free yet.</span>`}
          ${learners.length ? `<span class="learn-line">Wants to shadow: ${learners.map(s => `<button class="match match-learn" data-student="${s.id}">${esc(s.name)}</button>`).join("")}</span>` : ""}</span>` : ""}
        ${m ? briefHtml(r) : hasBrief(r) ? `<span class="brief muted small">Sign in to read the brief.</span>` : ""}
      </li>`;
    };
    const openRows = openCrew.map(openRow).join(""), castOpenRows = (() => { const seen = {}, out = []; openCast.forEach(r => { const k = r.role + "|" + (r.character || "").toLowerCase(); if (seen[k]) seen[k].n++; else out.push(seen[k] = { r, n: 1 }); }); return out.map(x => openRow(x.r).replace('<span class="chip chip-open">Open</span>', x.n > 1 ? `<span class="chip chip-open">${x.n} needed</span>` : '<span class="chip chip-open">Open</span>')).join(""); })(), castLockRows = lockedCast.map(lockRow).join("");

    const reqRows = pending.map(q => {
      const s = student(q.sid); if (!s) return "";
      if (q.type === "claim") return `<li class="rq"><span class="avatar">${initials(s.name)}</span>
        <span class="rq-body"><span class="rq-top"><button class="link-btn" data-student="${s.id}">${esc(s.name)}</button> <span class="rq-type claim">Is this them? · ${esc(q.role)}</span></span>
          <span class="rq-meta">Listed as “${esc(q.asName || "")}” · ${ago(q.at)}</span><span class="rq-msg">They've joined Crew Call and say they're the person you added by name. Approve it and it counts as their credit.</span></span>
        <span class="rq-acts"><button class="btn btn-accent btn-xs" data-accept="${q.id}">Approve</button><button class="btn btn-quiet btn-xs" data-decline="${q.id}">Not them</button></span></li>`;
      if (q.type === "addme") return `<li class="rq"><span class="avatar">${initials(s.name)}</span>
        <span class="rq-body"><span class="rq-top"><button class="link-btn" data-student="${s.id}">${esc(s.name)}</button> <span class="rq-type claim">${past ? "Worked on this" : "On the crew"} · ${esc(q.role)}</span></span>
          <span class="rq-meta">${ago(q.at)}</span><span class="rq-msg">${past ? "They say they worked on this project. Approve it and it counts as their credit." : "They say they're on this crew. Approve it and they're locked in."}</span>${q.msg ? `<span class="rq-msg">“${esc(q.msg)}”</span>` : ""}</span>
        <span class="rq-acts"><button class="btn btn-accent btn-xs" data-accept="${q.id}">Approve</button><button class="btn btn-quiet btn-xs" data-decline="${q.id}">Decline</button></span></li>`;
      const n = freeDaysCount(s, futureDays), clash = q.type === "crew" && days.some(d => bookedOn(s.id, d).length);
      return `<li class="rq"><span class="avatar">${initials(s.name)}</span>
        <span class="rq-body"><span class="rq-top"><button class="link-btn" data-student="${s.id}">${esc(s.name)}</button> <span class="rq-type ${q.type}">${q.type === "shadow" ? "Shadow" : "Crew"} · ${esc(q.role)}</span>${s.guest ? ` <span class="tag-guest">Guest</span>` : ""}</span>
          <span class="rq-meta">${n === futureDays.length ? "Free every shoot day" : `Free ${n} of ${futureDays.length} days`} · ${ago(q.at)}</span>
          ${q.msg ? `<span class="rq-msg">“${esc(q.msg)}”</span>` : ""}${clash ? `<span class="rq-warn">Booked on another shoot those days</span>` : ""}</span>
        <span class="rq-acts"><button class="btn btn-accent btn-xs" data-accept="${q.id}" ${clash ? "disabled" : ""}>Accept</button><button class="btn btn-quiet btn-xs" data-decline="${q.id}">Decline</button></span></li>`;
    }).join("");

    const L = locs(p), fu = fundOf(p);
    const named = namedSpots(p).filter(x => x.ref === "director" || x.ref.startsWith("producer:"));
    const namedRows = named.map(x => { const cq = m && claimOf(p, x.ref, m.id); return `<li class="lock-row"><span class="role-name">${esc(x.role)}</span><span class="lock-name">${esc(x.name)} <span class="tag-ext">Not on Crew Call</span></span><span class="lock-mail"></span><span class="lock-acts">${cq ? (cq.status === "pending" ? `<span class="st st-pending">Sent · waiting</span>` : "") : m && !mg ? `<button class="btn btn-quiet btn-xs" data-claimref="${esc(x.ref)}">That's me</button>` : ""}</span></li>`; }).join("");
    const crewN = locked.length + p.shadows.length;
    const cst = castOf(p), hasCast = !!(lockedCast.length || openCast.length || cst.link || cst.notes);
    const tabs = [["roles", "Open roles", past ? null : openCrew.length]].concat(hasCast ? [["cast", "Cast", past ? lockedCast.length : openCast.length]] : [], [["sched", "Schedule", days.length], ["crew", "Crew", crewN], ["contact", "Contact", null]], mg ? [["reqs", "Requests", pending.length]] : []);
    let tab = projTab[p.id] || (mg && pending.length ? "reqs" : openCrew.length && !past ? "roles" : openCast.length && !past ? "cast" : "crew");
    if (!tabs.some(t => t[0] === tab)) tab = "crew";
    const panel = (id, html) => `<div class="ptab-panel" id="ptp-${id}" role="tabpanel" aria-labelledby="ptb-${id}" ${tab === id ? "" : "hidden"}>${html}</div>`;
    openModal(`
      ${coverImg(p.cover, "m-cover")}
      <div class="m-head" style="--c:${projColor(p)}">
        <div class="proj-top"><span class="type-tag">${esc(p.type)}</span><span class="term-tag">${esc(p.term)}</span>${p.archived ? `<span class="tag-arch">Archived</span>` : ""}${past ? `<span class="tag-arch">Wrapped</span>` : ""}</div>
        <h2 id="modalTitle" class="m-title">${esc(p.title)}</h2>
        <p class="card-sub">Directed by ${esc(p.dsid && student(p.dsid) ? student(p.dsid).name : p.director)}${producerNames(p).length ? ` · Produced by ${esc(andList(producerNames(p)))}` : ""}</p>
      </div>
      ${mg ? `<div class="mg-bar"><span class="mg-tag">${runs(p) ? "You run this project" : "Admin access"}</span><span class="mg-acts">${!past && started(p) && !p.archived ? `<button class="btn btn-accent btn-xs" data-wrap>Wrap shoot</button>` : ""}${past && !p.archived ? (postOf(p) ? `<button class="btn btn-ghost btn-xs" data-inpost>Open in Post</button>` : `<button class="btn btn-accent btn-xs" data-topost>Move to Post</button>`) : ""}${p.wrapped ? `<button class="btn btn-quiet btn-xs" data-unwrap>Undo wrap</button>` : ""}<button class="btn btn-ghost btn-xs" data-edit>Edit</button>${!fu && !p.archived ? `<button class="btn btn-ghost btn-xs" data-addfund>Add crowdfunding</button>` : ""}<button class="btn btn-ghost btn-xs" data-handover>Hand over</button><button class="btn btn-ghost btn-xs" data-archive>${p.archived ? "Restore" : "Archive"}</button><button class="btn btn-danger btn-xs" data-delete>Delete</button></span></div>` : ""}
      <p class="logline">${esc(p.logline)}</p>
      ${perksHtml(p)}
      ${fu && m ? `<div class="fund-box${fundEnded(fu) ? " is-dim" : ""}"><div class="fb-top"><span class="fb-l">Crowdfunding on ${esc(fu.platform)}</span><span class="fb-left">${fundLeft(fu)}</span></div>${fundBar(fu)}${fundNums(fu)}<div class="fb-acts">${!fundEnded(fu) && fu.url ? `<a class="btn btn-accent btn-xs" href="${esc(fu.url)}" target="_blank" rel="noopener">Back it</a>` : ""}<button class="btn btn-ghost btn-xs" data-fund="${fu.id}">${canEditFund(fu) ? "Update total" : "Details"}</button></div></div>` : ""}

      <div class="ptabs" role="tablist" aria-label="Project">${tabs.map(([id, l, n]) => `<button type="button" role="tab" class="ptab${tab === id ? " on" : ""}" id="ptb-${id}" aria-controls="ptp-${id}" aria-selected="${tab === id}" data-ptab="${id}">${l}${n != null ? ` <span class="count${id === "reqs" && n ? " count-hot" : ""}">${n}</span>` : ""}</button>`).join("")}</div>

      ${panel("roles", `${past ? `<p class="empty-sm">This shoot has wrapped, so its roles are closed.</p>` : openCrew.length ? `<ul class="role-list">${openRows}</ul>` : `<p class="empty-sm ok">Fully crewed.</p>`}
        ${!m ? `<p class="proto-note">Sign in to request a role, see contact details and who's free.</p>` : ""}`)}

      ${hasCast ? panel("cast", `${castBox(p, past)}
        ${!past && openCast.length ? `<h3 class="dp-sub">Parts to cast <span class="count">${openCast.length}</span></h3><ul class="role-list">${castOpenRows}</ul>` : !past && (lockedCast.length || openCast.length) ? `<p class="empty-sm ok">Fully cast.</p>` : ""}
        ${lockedCast.length ? `<h3 class="dp-sub">Cast <span class="count">${lockedCast.length}</span></h3><ul class="lock-list">${castLockRows}</ul>` : ""}
        ${mg && !past ? `<p class="mt"><button type="button" class="btn btn-ghost btn-xs" data-findtalent>Find talent on Crew Call</button></p>` : ""}`) : ""}

      ${panel("sched", `<section class="sched" aria-labelledby="schedH">
        <div class="sec-row"><h3 class="dp-sub" id="schedH">Schedule <span class="count">${days.length} day${days.length > 1 ? "s" : ""}</span></h3><button class="btn btn-quiet btn-xs" data-ics>Add to calendar</button></div>
        <ol class="sched-list">${days.map((d, i) => { const inf = dayInfo(p, d); return `<li><span class="sc-day">Day ${i + 1}</span><span class="sc-date">${fmtDay(d)}</span><span class="sc-time mono"><span>Call ${inf.call}</span><span>Wrap ${inf.wrap}${inf.wrap <= inf.call ? " +1" : ""}</span></span><span class="sc-loc">${esc(locName(p, inf.loc))}</span></li>`; }).join("")}</ol>
      </section>
      <dl class="meta-list">
        <div><dt>Location${L.length > 1 ? `s (${L.length})` : ""}</dt><dd>${L.length ? `<ul class="loc-list">${L.map(l => `<li><span class="loc-pin" aria-hidden="true"></span><span><span class="loc-name">${esc(l.name)}</span>${l.detail ? `<span class="loc-detail">${esc(l.detail)}</span>` : ""}</span>${mapLinks(l)}</li>`).join("")}</ul>` : `<span class="muted">To be confirmed</span>`}</dd></div>
        ${p.kitNeeded ? `<div><dt>Kit wanted</dt><dd>${esc(p.kitNeeded)}</dd></div>` : ""}
        ${p.delivery ? `<div><dt>Delivery date</dt><dd>${fmtFull(p.delivery)}</dd></div>` : ""}
      </dl>`)}

      ${panel("crew", `<p class="muted small">${m ? "Tap a name to see their profile and credits." : "Sign in to see profiles and get in touch."}</p>
        ${crewN || named.length ? `<ul class="lock-list">${lockedRows}${namedRows}</ul>` : `<p class="empty-sm">No one locked in yet.</p>`}
        ${addMeHtml(p, m, mg)}
        ${mg && locked.length > 1 ? `<a class="btn btn-ghost btn-xs mt" href="mailto:${locked.map(r => (student(r.filledBy) || {}).email).filter(Boolean).join(",")}?subject=${encodeURIComponent(p.title + " crew")}" target="_blank" rel="noopener">Email all locked crew</a>` : ""}`)}

      ${panel("contact", `<section class="contact-box" aria-labelledby="contactH">
        <h3 class="dp-sub" id="contactH">Contact</h3>
        <div class="contact-main">
          <span class="avatar avatar-lg">${initials(c.name)}</span>
          <div class="contact-who">
            <p class="contact-role">${c.fallback ? "Director · no producer yet" : "Producer"}</p>
            <p class="contact-name">${c.id ? `<button class="link-btn" data-student="${c.id}">${esc(c.name)}</button>` : esc(c.name)}</p>
            <p class="contact-mail">${reach(c, p, { subject: `About ${p.title}`, body: `Hi ${first(c.name)},\n\n` })}</p>
          </div>
        </div>
      </section>
      ${hubHtml(p, m, mg)}`)}

      ${mg ? panel("reqs", `<section class="req-box"><h3 class="dp-sub">Requests waiting <span class="count">${pending.length}</span></h3>${pending.length ? `<ul class="rq-list">${reqRows}</ul>` : `<p class="empty-sm">No requests right now. People who match your open roles are notified when you post or add a role.</p>`}</section>`) : ""}
    `);
    modalBody.querySelectorAll("[data-ptab]").forEach(b => b.addEventListener("click", () => {
      projTab[p.id] = b.dataset.ptab;
      modalBody.querySelectorAll("[data-ptab]").forEach(x => { const on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-selected", String(on)); });
      modalBody.querySelectorAll(".ptab-panel").forEach(x => (x.hidden = x.id !== "ptp-" + b.dataset.ptab));
    }));
    modalBody.querySelectorAll(".ptabs").forEach(t => t.addEventListener("keydown", e => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const bs = [...t.querySelectorAll("[data-ptab]")], i = bs.indexOf(document.activeElement); if (i < 0) return;
      const n = bs[(i + (e.key === "ArrowRight" ? 1 : bs.length - 1)) % bs.length]; n.focus(); n.click();
    }));
    modalBody.querySelectorAll("[data-student]").forEach(b => (b.onclick = () => b.dataset.student && openStudent(b.dataset.student, p.id)));
    modalBody.querySelectorAll("[data-claimref]").forEach(b => (b.onclick = () => { const x = namedSpots(p).find(y => y.ref === b.dataset.claimref); if (x) { sendClaim(x); openProject(p.id); } }));
    modalBody.querySelectorAll("[data-addfund]").forEach(b => (b.onclick = () => openFundForm(null, p)));
    modalBody.querySelectorAll("[data-addme]").forEach(b => (b.onclick = () => openAddMe(p)));
    modalBody.querySelectorAll("[data-findtalent]").forEach(b => (b.onclick = () => { closeModal(); castMode = "talent"; setView("cast"); }));
    modalBody.querySelectorAll("[data-fund]").forEach(b => (b.onclick = () => openFund(b.dataset.fund)));
    const q = s => modalBody.querySelectorAll(s);
    q("[data-fill]").forEach(sel => sel.addEventListener("change", () => {
      if (sel.value === "__ext") {
        const r = roleBy(p, sel.dataset.fill), box = document.createElement("span");
        box.className = "ext-fill";
        box.innerHTML = `<input type="text" maxlength="60" placeholder="Their name" aria-label="Name of the ${esc(r.role)}"><button type="button" class="btn btn-accent btn-xs">Add</button><button type="button" class="btn btn-quiet btn-xs">Cancel</button>`;
        sel.replaceWith(box); const inp = box.querySelector("input"); inp.focus();
        const [add, cancel] = box.querySelectorAll("button");
        cancel.addEventListener("click", () => openProject(p.id));
        const save = () => {
          const nm = inp.value.trim(); if (!nm) { inp.focus(); return; }
          r.filledBy = "ext:" + nm; r.extBy = me().id;
          S.requests.filter(x => x.pid === p.id && x.rid === r.rid && x.status === "pending" && x.type === "crew").forEach(x => { x.status = "filled"; notify(x.sid, "update", `The ${r.role} role on ${p.title} has been filled. Thanks for offering.`, p.id); });
          toast(`${nm} listed as ${r.role}`); openProject(p.id); drawHeader(); render();
        };
        add.addEventListener("click", save); inp.addEventListener("keydown", ev => { if (ev.key === "Enter") save(); if (ev.key === "Escape") { ev.stopPropagation(); openProject(p.id); } });
        return;
      }
      if (sel.value) lockIn(p, sel.dataset.fill, sel.value);
    }));
    q("[data-unfill]").forEach(b => b.addEventListener("click", () => {
      const r = roleBy(p, b.dataset.unfill), sid = r.filledBy; r.filledBy = null;
      notify(sid, "update", `You've been taken off ${p.title} as ${r.role}.`, p.id); toast(`${r.role} reopened`); openProject(p.id); render();
    }));
    q("[data-unshadow]").forEach(b => b.addEventListener("click", () => { const x = p.shadows.splice(+b.dataset.unshadow, 1)[0]; notify(x.sid, "update", `You've been taken off ${p.title} as a shadow.`, p.id); openProject(p.id); render(); }));
    q("[data-req]").forEach(b => b.addEventListener("click", () => openRequest(p, b.dataset.req, "crew")));
    q("[data-shadow]").forEach(b => b.addEventListener("click", () => openRequest(p, b.dataset.shadow, "shadow")));
    q("[data-withdraw]").forEach(b => b.addEventListener("click", () => { S.requests.find(x => x.id === b.dataset.withdraw).status = "withdrawn"; toast("Request withdrawn"); openProject(p.id); render(); }));
    q("[data-accept]").forEach(b => b.addEventListener("click", () => acceptReq(b.dataset.accept)));
    q("[data-decline]").forEach(b => b.addEventListener("click", () => { const x = S.requests.find(y => y.id === b.dataset.decline); x.status = "declined"; notify(x.sid, "update", x.type === "claim" ? `${p.title}'s team say the ${x.role} they listed isn't you. If they're wrong, message them.` : x.type === "addme" ? `${p.title}'s team didn't confirm you as ${x.role}. If that's a mistake, message them.` : `${p.title} has gone with someone else for ${x.role}. Thanks for offering.`, p.id); toast("Declined. They've been told politely."); openProject(p.id); drawHeader(); render(); }));
    q("[data-ics]").forEach(b => b.addEventListener("click", () => { download(`${p.title.replace(/\W+/g, "-").toLowerCase()}.ics`, buildIcs([p], `Crew Call: ${p.title}`)); toast("Downloaded. This adds the shoot as it is now. To get later changes automatically, use Sync calendar."); }));
    q("[data-edit]").forEach(b => b.addEventListener("click", () => openPostForm(p)));
    q("[data-handover]").forEach(b => b.addEventListener("click", () => openHandOver(p)));
    q("[data-wrap]").forEach(b => b.addEventListener("click", () => openWrap(p)));
    q("[data-topost]").forEach(b => b.addEventListener("click", () => moveToPost(p)));
    q("[data-inpost]").forEach(b => b.addEventListener("click", () => { closeModal(); setView("post"); openPostItem(postOf(p).id); }));
    q("[data-unwrap]").forEach(b => b.addEventListener("click", () => unwrap(p)));
    q("[data-stepdown]").forEach(b => b.addEventListener("click", () => stepDown(p, b.dataset.stepdown)));
    q("[data-stepdown-sh]").forEach(b => b.addEventListener("click", () => stepDown(p, null, +b.dataset.stepdownSh)));
    q("[data-archive]").forEach(b => b.addEventListener("click", () => { p.archived = !p.archived; toast(p.archived ? `${p.title} archived. Restore it from My shoots.` : `${p.title} restored`); closeModal(); render(); }));
    q("[data-delete]").forEach(b => b.addEventListener("click", () => deleteProject(p)));
    if (me() && !runs(p)) addReportLink("project", p.id);
  }

  // leave a project you were put down for, or a shadow place
  function stepDown(p, rid, shIdx) {
    const m = me(), r = rid ? roleBy(p, rid) : null, sh = shIdx != null ? p.shadows[shIdx] : null;
    if (!m || (!r && !sh)) return;
    const what = r ? r.role : `shadow ${sh.role}`;
    const lead = r && ["Producer", "Director"].includes(r.role) && runs(p, m) && managersOf(p).filter(s => s.id !== m.id).length === 0;
    confirmBox(`Step down from ${p.title}?`, `You'll come off the project as ${esc(what)} and the producer${prodsOf(p).length > 1 ? "s" : ""} and director are told. ${r ? "The role opens again for others to offer." : ""}${lead ? " You're the only person running this project: use Hand over first so someone else can manage it." : ""}`, "Step down", async () => {
      const tell = managersOf(p).filter(s => s.id !== m.id).map(s => s.id);
      if (LIVE) {
        const res = await window.CC_CLOUDAPI.rpc("leave_project", { pid: p.id, rid: r ? r.rid : "__shadow:" + sh.role });
        if (res.error) return toast(`Couldn't step down: ${res.error}`);
      } else if (r) r.filledBy = null; else p.shadows.splice(shIdx, 1);
      tell.forEach(id => notify(id, "update", `${m.name} stepped down as ${what} on ${p.title}.${r ? " The role is open again." : ""}`, p.id));
      toast(`You've stepped down as ${what}`); closeModal(); drawHeader(); render();
      const fresh = project(p.id); if (fresh) openProject(fresh.id);
    });
  }
  // hand a project to someone else: a new producer (e.g. when the producer changes) or a new director
  function openHandOver(p) {
    const m = me(); if (!canManage(p)) return;
    const iAmProd = isProducerOf(p, m), iAmDir = isDirectorOf(p, m);
    openModal(`<h2 id="modalTitle" class="m-title">Hand over ${esc(p.title)}</h2>
      <p class="muted small">Use this when the producer or director changes. The new person can edit the project, manage crew and see requests. Everyone else on the project keeps their place.</p>
      <form id="hoForm" class="form-grid">
        <label class="field span-2"><span>Hand over to <small>pick a Crew Call member</small></span><input name="who" list="hoList" required autocomplete="off" placeholder="Start typing a name"><datalist id="hoList">${memberOptions("", [m.id])}</datalist></label>
        <label class="field span-2"><span>As</span><select name="as"><option value="Producer" ${iAmProd || !iAmDir ? "selected" : ""}>Producer (added alongside any other producers)</option><option value="Director" ${iAmDir && !iAmProd ? "selected" : ""}>Director (replaces the current director)</option></select></label>
        ${iAmProd || iAmDir ? `<label class="toggle span-2"><input type="checkbox" name="off" checked> <span>Take me off the project in that role</span></label>` : ""}
        <p class="form-err span-2" id="hoErr" role="alert"></p>
        <div class="form-actions span-2"><button class="btn btn-accent" type="submit">Hand over</button><button class="btn btn-ghost" type="button" id="hoBack">Cancel</button></div>
      </form>`);
    $("#hoBack").addEventListener("click", () => openProject(p.id));
    $("#hoForm").addEventListener("submit", async e => {
      e.preventDefault(); const f = e.target, to = findMember(f.who.value), as = f.as.value, off = f.off && f.off.checked, err = $("#hoErr");
      if (!to) return (err.textContent = "Pick someone from the list. They need to be on Crew Call to manage a project.");
      if (to.id === m.id) return (err.textContent = "Pick someone other than yourself.");
      if (as === "Producer") {
        let list = prodsOf(p).map(x => ({ ...x }));
        if (off) list = list.filter(x => !(x.sid === m.id || sameMail(x.email, m.email)));
        if (!list.some(x => x.sid === to.id)) list.push({ name: to.name, email: "", sid: to.id });
        p.producers = list; p.producer = list[0] || null;
        const mineR = p.roles.find(r => r.role === "Producer" && r.filledBy === m.id), openR = p.roles.find(r => r.role === "Producer" && !r.filledBy);
        if (!p.roles.some(r => r.role === "Producer" && r.filledBy === to.id)) {
          if (off && mineR) mineR.filledBy = to.id; else if (openR) openR.filledBy = to.id; else p.roles.unshift({ role: "Producer", filledBy: to.id, rid: uid("r") });
        }
        if (off) p.roles.forEach(r => { if (r.role === "Producer" && r.filledBy === m.id) r.filledBy = null; });
      } else {
        const wasDir = isDirectorOf(p, m);
        p.director = to.name; p.dsid = to.id; p.email = "";
        const dr = p.roles.find(r => r.role === "Director");
        if (dr) dr.filledBy = to.id; else p.roles.unshift({ role: "Director", filledBy: to.id, rid: uid("r") });
        // stepping aside as director but staying on: keep managing as a producer
        if (wasDir && !off && !isProducerOf(p, m)) { p.producers = [...prodsOf(p), { name: m.name, email: "", sid: m.id }]; p.producer = p.producers[0]; }
      }
      const tell = managersOf(p).filter(s => s.id !== m.id && s.id !== to.id).map(s => s.id);
      notify(to.id, "update", `${m.name} handed ${p.title} over to you as ${as}. You can now edit it and manage the crew.`, p.id);
      tell.forEach(id => notify(id, "update", `${to.name} is now ${as} on ${p.title}${off ? `, taking over from ${m.name}` : ""}.`, p.id));
      if (LIVE && off) { const res = await window.CC_CLOUDAPI.rpc("hand_over_project", { pid: p.id, to_id: to.id }); if (res.error) return (err.textContent = `Saved, but the project couldn't be moved to ${to.name}: ${res.error}`); }
      toast(`${p.title} handed over to ${to.name}`); closeModal(); render();
      if (canManage(p)) openProject(p.id);
    });
  }
  function lockIn(p, rid, sid) {
    const r = roleBy(p, rid), s = student(sid);
    if (projDays(p).some(d => bookedOn(sid, d).length)) return toast(`${s.name} is booked on another shoot those days`);
    r.filledBy = sid;
    S.requests.filter(x => x.pid === p.id && x.rid === rid && x.status === "pending" && x.type === "crew").forEach(x => {
      if (x.sid === sid) x.status = "accepted";
      else { x.status = "filled"; notify(x.sid, "update", `The ${r.role} role on ${p.title} has been filled. Thanks for offering.`, p.id); }
    });
    const d0 = projDays(p)[0], inf = dayInfo(p, d0);
    notify(sid, "update", `You're locked in as ${r.role} on ${p.title}. Day 1 is ${fmtDay(d0)}, call ${inf.call} at ${locName(p, inf.loc)}.${hubOf(p).whatsapp ? " The WhatsApp group and key links are in the project." : ""}`, p.id);
    toast(`${s.name} locked in as ${r.role}`); openProject(p.id); drawHeader(); render();
  }
  // someone who was added by name says it's them; whoever added them (or runs the project) approves
  function sendClaim(x) {
    const m = me(); if (!m) return;
    if (claimOf(x.p, x.ref, m.id)) return toast("Already sent");
    const r = x.ref.startsWith("producer:") || x.ref === "director" ? null : roleBy(x.p, x.ref);
    S.requests.push({ id: uid("q"), pid: x.p.id, rid: x.ref, role: x.role, sid: m.id, type: "claim", asName: x.name, msg: "", status: "pending", at: TODAY });
    const to = (r && r.extBy && student(r.extBy) ? [student(r.extBy)] : managersOf(x.p)).filter(s => s.id !== m.id);
    (to.length ? to : S.students.filter(s => can("projects", s))).forEach(s => notify(s.id, "request", `${m.name} says they're the ${x.role} you listed as “${x.name}” on ${x.p.title}. Approve it in the project so it counts as their credit.`, x.p.id));
    toast(`Sent. ${x.p.title}'s team will confirm it.`); drawHeader();
  }
  function openClaims() {
    const m = me(), cl = claimsFor(m); if (!m) return;
    if (!cl.length) { closeModal(); return drawHeader(); }
    openModal(`<h2 id="modalTitle" class="m-title">Were you added by name?</h2>
      <p class="muted">These projects list someone with your name who wasn't on Crew Call yet. If it's you, confirm it: whoever added you approves, then it shows on your profile as a credit.</p>
      <ul class="claim-list">${cl.map((x, i) => `<li><span class="cl-what"><b>${esc(x.role)}</b> on <button class="link-btn" data-proj="${x.p.id}">${esc(x.p.title)}</button><span class="small muted">Added as “${esc(x.name)}” · ${x.p.shoots.map(fmtRange).join(" + ")}</span></span>
        <span class="cl-acts"><button class="btn btn-accent btn-xs" data-claimi="${i}">That's me</button><button class="btn btn-quiet btn-xs" data-notme="${i}">Not me</button></span></li>`).join("")}</ul>`);
    modalBody.querySelectorAll("[data-claimi]").forEach(b => b.onclick = () => { sendClaim(cl[+b.dataset.claimi]); openClaims(); });
    modalBody.querySelectorAll("[data-notme]").forEach(b => b.onclick = () => { const x = cl[+b.dataset.notme]; m.notMe = [...(m.notMe || []), x.p.id + "|" + x.ref]; toast("Hidden. You won't be asked about that one again."); openClaims(); drawHeader(); });
  }
  function applyClaim(q, p) {
    const s = student(q.sid); if (!s) return;
    if (q.rid === "director") { if (p.dsid) return toast("The director has changed since they asked"); p.dsid = s.id; p.director = s.name; p.email = ""; }
    else if (q.rid.startsWith("producer:")) {
      const ps = prodsOf(p); let x = ps[+q.rid.split(":")[1]];
      if (!x || x.sid || !nameHit(x.name, q.asName)) x = ps.find(y => !y.sid && nameHit(y.name, q.asName));
      if (!x) return toast("That name isn't on the project any more"); x.sid = s.id; x.name = s.name; x.email = "";
    } else { const r = roleBy(p, q.rid); if (!r || !isExt(r)) return toast("That role has changed since they asked"); r.filledBy = s.id; delete r.extBy; }
    q.status = "accepted";
    notify(q.sid, "update", `${p.title} confirmed you as ${q.role}. It's on your profile now.`, p.id);
    toast(`${s.name} confirmed as ${q.role}`); openProject(p.id); drawHeader(); render();
  }
  // Members can add themselves to a project's crew (a shoot they worked on, or one they've already agreed to); whoever runs it approves
  const addMeOf = (p, sid) => S.requests.find(q => q.type === "addme" && q.pid === p.id && q.sid === sid && q.status === "pending");
  function addMeHtml(p, m, mg) {
    if (!m || mg || p.archived || onProject(p, m.id)) return "";
    const q = addMeOf(p, m.id);
    if (q) return `<p class="addme-box"><span class="st st-pending">Sent · waiting</span> <span class="muted small">You asked to be added as ${esc(q.role)}.</span> <button class="btn btn-quiet btn-xs" data-withdraw="${q.id}">Withdraw</button></p>`;
    return `<p class="addme-box"><span class="muted small">${isPast(p) ? "Worked on this?" : "Already on this crew?"}</span> <button class="btn btn-ghost btn-xs" data-addme>Add me to the crew</button></p>`;
  }
  function openAddMe(p) {
    const m = me(); if (!m) return openSignIn("Sign in to add yourself to a crew.");
    const open = p.roles.filter(r => !r.filledBy), past = isPast(p), c = contactOf(p);
    const mine = new Set([...(m.roles || []), m.primary].filter(Boolean));
    const others = allRoles().filter(r => !open.some(o => o.role === r));
    openModal(`<p class="eyebrow">${esc(p.title)}</p>
      <h2 id="modalTitle" class="m-title">Add me to the crew</h2>
      <p class="muted">${past ? "Worked on this project? Pick your role." : "Already agreed to work on this? Pick your role."} ${esc(c.name)} approves it, then ${past ? "it shows on your profile as a credit" : "you're locked in and it goes on your calendar"}.</p>
      <form id="addMeForm">
        <label class="field"><span>Your role</span><select name="role" required>
          <option value="">Choose…</option>
          ${open.length ? `<optgroup label="Open on this project">${open.map(r => `<option value="rid:${r.rid}"${mine.has(r.role) && open.find(o => mine.has(o.role)) === r ? " selected" : ""}>${esc(r.role)}</option>`).join("")}</optgroup>` : ""}
          <optgroup label="Another role">${others.map(r => `<option value="role:${esc(r)}">${esc(r)}</option>`).join("")}</optgroup>
        </select></label>
        <label class="field mt"><span>Message <small>optional</small></span><textarea name="msg" rows="2" maxlength="280" placeholder="e.g. I covered sound on day 2"></textarea></label>
        <p class="form-err" id="addMeErr" role="alert"></p>
        <div class="form-actions"><button class="btn btn-accent" type="submit">Send for approval</button><button class="btn btn-ghost" type="button" id="addMeBack">Back to project</button></div>
      </form>`);
    $("#addMeBack").onclick = () => openProject(p.id);
    $("#addMeForm").addEventListener("submit", e => {
      e.preventDefault(); const v = e.target.role.value; if (!v) return ($("#addMeErr").textContent = "Pick your role.");
      const r = v.startsWith("rid:") ? roleBy(p, v.slice(4)) : null, role = r ? r.role : v.slice(5);
      S.requests.push({ id: uid("q"), pid: p.id, rid: r ? r.rid : "", role, sid: m.id, type: "addme", msg: e.target.msg.value.trim(), status: "pending", at: TODAY });
      const to = managersOf(p).filter(s => s.id !== m.id);
      (to.length ? to : S.students.filter(s => can("projects", s))).forEach(s => notify(s.id, "request", `${m.name} says they ${past ? "worked" : "are working"} on ${p.title} as ${role}. Approve it in the project's Requests.`, p.id));
      toast(`Sent. ${p.title}'s team will confirm it.`); openProject(p.id); drawHeader(); render();
    });
  }
  function applyAddMe(q, p) {
    const s = student(q.sid); if (!s) return;
    if (onProject(p, s.id)) { q.status = "accepted"; toast(`${s.name} is already on the crew`); return openProject(p.id); }
    let r = q.rid && roleBy(p, q.rid);
    if (!r || r.filledBy) r = p.roles.find(x => !x.filledBy && x.role === q.role);
    if (!r) { r = { role: q.role, filledBy: null, rid: uid("r") }; p.roles.push(r); }
    if (!isPast(p)) { if (projDays(p).some(d => bookedOn(s.id, d).length)) return toast(`${s.name} is booked on another shoot those days`); q.status = "accepted"; return lockIn(p, r.rid, s.id); }
    r.filledBy = s.id; q.status = "accepted";
    S.requests.filter(x => x.pid === p.id && x.rid === r.rid && x.status === "pending" && x.type === "crew").forEach(x => (x.status = "filled"));
    notify(s.id, "update", `${p.title} added you to the crew as ${r.role}. It's on your profile now.`, p.id);
    toast(`${s.name} added as ${r.role}`); openProject(p.id); drawHeader(); render();
  }
  function acceptReq(qid) {
    const q = S.requests.find(x => x.id === qid), p = project(q.pid), r = roleBy(p, q.rid);
    if (q.type === "claim") return applyClaim(q, p);
    if (q.type === "addme") return applyAddMe(q, p);
    if (q.type === "crew") { if (r.filledBy) return toast("That role is already filled"); return lockIn(p, q.rid, q.sid); }
    p.shadows.push({ role: q.role, sid: q.sid }); q.status = "accepted";
    notify(q.sid, "update", `You're shadowing ${q.role} on ${p.title}. Call ${dayInfo(p, projDays(p)[0]).call} on ${fmtDay(projDays(p)[0])}.`, p.id);
    toast(`${student(q.sid).name} added as a shadow`); openProject(p.id); drawHeader(); render();
  }
  function openRequest(p, rid, type) {
    const m = me(), r = roleBy(p, rid);
    if (m.incomplete) { toast("Add your roles to your profile first"); closeModal(); return setView("me"); }
    const fd = projDays(p).filter(d => d >= TODAY), n = freeDaysCount(m, fd), clash = projDays(p).filter(d => bookedOn(m.id, d).length);
    const msg = type === "shadow" ? `I'd love to shadow your ${r.role} and learn on set.` : `${m.kit.length ? `I can bring ${m.kit.map(k => k.item).join(", ")}. ` : ""}${n === fd.length ? "I'm free every shoot day." : ""}`;
    openModal(`
      <p class="eyebrow">${esc(p.title)}</p>
      <h2 id="modalTitle" class="m-title">${type === "shadow" ? `Ask to shadow the ${esc(r.role)}` : isCast(r) ? (r.character ? `Ask to play ${esc(r.character)}` : `Ask to be cast as ${esc(r.role)}`) : `Request to join as ${esc(r.role)}`}</h2>
      <p class="muted">${esc(contactOf(p).name)} and the director get this straight away and can accept you in one tap. Your email stays private unless you share it.</p>
      ${type !== "shadow" ? briefHtml(r, true) : ""}
      <div class="req-facts"><span class="badge ${n === fd.length ? "badge-free" : n ? "badge-part" : "badge-off"}">${n === fd.length ? "You're free every shoot day" : `You're free ${n} of ${fd.length} days`}</span>${clash.length ? `<span class="badge badge-off">Booked elsewhere on ${clash.map(fmtDay).join(", ")}</span>` : ""}</div>
      <form id="reqForm">
        ${type === "crew" ? `<div class="seg mt" role="radiogroup" aria-label="Request type"><label><input type="radio" name="t" value="crew" checked> <span>Do the role</span></label><label><input type="radio" name="t" value="shadow"> <span>Shadow and learn</span></label></div>` : ""}
        <label class="field mt"><span>Message <small>optional</small></span><textarea name="msg" rows="3" maxlength="280">${esc(msg)}</textarea></label>
        <div class="form-actions"><button class="btn btn-accent" type="submit">Send request</button><button class="btn btn-ghost" type="button" id="reqBack">Back to project</button></div>
      </form>`);
    $("#reqBack").addEventListener("click", () => openProject(p.id));
    $("#reqForm").addEventListener("submit", e => {
      e.preventDefault();
      const t = (e.target.t && e.target.t.value) || type;
      S.requests.push({ id: uid("q"), pid: p.id, rid, role: r.role, sid: m.id, type: t, msg: e.target.msg.value.trim(), status: "pending", at: TODAY });
      managersOf(p).forEach(s => notify(s.id, "request", `${m.name} asked to join ${p.title} ${t === "shadow" ? `as a shadow on ${r.role}` : `as ${r.role}`}`, p.id));
      toast("Request sent. You'll hear back here and by email."); openProject(p.id); render();
    });
  }
  function deleteProject(p) {
    confirmBox(`Delete ${p.title}?`, `This removes it for everyone and can't be undone. Locked crew and anyone who requested a role will be told. If you might reuse it, archive it instead.`, "Delete project", () => {
      p.roles.filter(r => r.filledBy).forEach(r => notify(r.filledBy, "update", `${p.title} has been cancelled.`));
      S.requests.filter(q => q.pid === p.id && q.status === "pending").forEach(q => notify(q.sid, "update", `${p.title} has been cancelled, so your request was closed.`));
      S.requests = S.requests.filter(q => q.pid !== p.id);
      S.projects.splice(S.projects.indexOf(p), 1);
      closeModal(); toast(`${p.title} deleted`); render(); drawHeader();
    });
  }

  // ---------- message (email stays private) ----------
  // ---------- MESSAGES: one conversation per person, with replies ----------
  // A message is a notification to the other person (emailed, as before) plus a "sent" copy to yourself,
  // so both sides can read the conversation and nobody else can.
  const msgFrom = n => n.from || (() => { const nm = (/^(.+?): “/.exec(n.text || "") || [])[1]; const st = nm && S.students.find(s => s.name === nm); return st ? st.id : null; })();
  const msgBody = n => n.body != null ? n.body : ((/: “([\s\S]*)”$/.exec(n.text || "") || [])[1] || n.text || "");
  const msgStamp = n => n.ts || n.at + "T00:00";
  function threads() {
    const m = me(); if (!m) return [];
    const by = {};
    S.notifications.filter(n => n.to === m.id && (n.kind === "message" || n.kind === "sent")).forEach(n => {
      const other = n.kind === "sent" ? n.with : msgFrom(n); if (!other) return;
      (by[other] = by[other] || []).push({ n, mine: n.kind === "sent" });
    });
    return Object.entries(by).map(([sid, list]) => ({ sid, list: list.sort((a, b) => msgStamp(a.n).localeCompare(msgStamp(b.n))), unread: list.filter(x => !x.mine && !x.n.read).length }))
      .sort((a, b) => msgStamp(b.list[b.list.length - 1].n).localeCompare(msgStamp(a.list[a.list.length - 1].n)));
  }
  const msgUnread = () => threads().reduce((t, x) => t + x.unread, 0);
  const msgTime = n => n.ts ? `${n.at === TODAY ? "" : fmtDay(n.at) + " · "}${n.ts.slice(11, 16)}` : ago(n.at);
  function openMessages() {
    const m = me(); if (!m) return openSignIn("Sign in to see your messages.");
    const ts = threads();
    openModal(`<h2 id="modalTitle" class="m-title">Messages</h2>
      <p class="muted small">Private between you and the other person. New messages are also emailed, unless you've turned that off in My profile.</p>
      ${ts.length ? `<ul class="thread-list">${ts.map(t => { const s = student(t.sid) || { name: "Former member" }, last = t.list[t.list.length - 1]; return `<li><button type="button" class="thread-row${t.unread ? " unread" : ""}" data-thread="${t.sid}">
        <span class="avatar">${initials(s.name)}</span><span class="tr-body"><span class="tr-top"><b>${esc(s.name)}</b><span class="tr-when">${msgTime(last.n)}</span></span>
        <span class="tr-last">${last.mine ? "You: " : ""}${esc(msgBody(last.n).slice(0, 90))}</span></span>${t.unread ? `<span class="bell-n tr-n">${t.unread}</span>` : ""}</button></li>`; }).join("")}</ul>`
        : `<p class="empty-sm">No messages yet. Open someone's profile in Crew or Casting and press Message.</p>`}`);
    modalBody.querySelectorAll("[data-thread]").forEach(b => (b.onclick = () => openThread(b.dataset.thread)));
  }
  function openThread(sid) {
    const s = student(sid), m = me(); if (!m) return openSignIn("Sign in to see your messages.");
    if (!s) return toast("That person isn't on Crew Call any more");
    if (s.id === m.id) return;
    const t = threads().find(x => x.sid === sid), list = t ? t.list : [];
    openModal(`<button type="button" class="link-btn m-back" data-allmsg><span aria-hidden="true">←</span> <span>All messages</span></button>
      <h2 id="modalTitle" class="m-title">Message ${esc(s.name)}</h2>
      <p class="muted small">They'll get this in Crew Call and by email. Your email is ${m.shareEmail ? "included so they can reply directly" : "kept private; they reply in Crew Call"}.</p>
      ${list.length ? `<ol class="msg-thread" aria-label="Conversation">${list.map(x => `<li class="msg ${x.mine ? "msg-me" : "msg-them"}"><span class="msg-b">${esc(msgBody(x.n)).replace(/\n/g, "<br>")}</span><span class="msg-t">${x.mine ? "You" : esc(first(s.name))} · ${msgTime(x.n)}</span></li>`).join("")}</ol>` : ""}
      <form id="msgForm"><label class="field"><span>${list.length ? "Reply" : "Message"}</span><textarea name="msg" rows="3" required maxlength="1000" placeholder="${list.length ? "Write a reply" : `Hi ${esc(first(s.name))}, are you free for…`}"></textarea></label>
      <div class="form-actions"><button class="btn btn-accent" type="submit">Send</button><button class="btn btn-ghost" type="button" data-close>Close</button><button class="btn btn-quiet" type="button" data-student="${s.id}">Profile</button></div></form>`);
    list.forEach(x => { if (!x.mine) x.n.read = true; }); drawHeader();
    modalBody.querySelector("[data-allmsg]").onclick = openMessages;
    const th = modalBody.querySelector(".msg-thread"); if (th) th.lastElementChild.scrollIntoView({ block: "nearest" });
    const ta = modalBody.querySelector("[name=msg]");
    ta.addEventListener("keydown", e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); $("#msgForm").requestSubmit(); } });
    $("#msgForm").addEventListener("submit", e => {
      e.preventDefault(); const body = ta.value.trim().slice(0, 1000); if (!body) return;
      sendMessage(s, body); openThread(sid); toast(`Sent to ${first(s.name)}`);
    });
  }
  function sendMessage(s, body) {
    const m = me(), now = new Date(), ts = TODAY + "T" + String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
    S.notifications.unshift({ id: uid("n"), to: s.id, kind: "message", from: m.id, body, text: `${m.name}: “${body}”`, at: TODAY, ts, read: false, emailed: true });
    S.notifications.unshift({ id: uid("n"), to: m.id, kind: "sent", with: s.id, body, text: `To ${s.name}: “${body}”`, at: TODAY, ts, read: true, emailed: false });
  }
  const openMessage = sid => openThread(sid);

  // ---------- MULTI-SELECT DROPDOWN (roles) ----------
  // Fires a "msel" event on the wrapper with detail.values whenever a box is ticked.
  const mselVal = sel => sel.length ? (sel.length <= 2 ? sel.join(", ") : `${sel.length} selected`) : "Any";
  function mselHtml(id, label, opts, sel) {
    return `<div class="msel" data-msel="${esc(id)}"><button type="button" class="msel-btn" aria-haspopup="true" aria-expanded="false"><span class="msel-l">${esc(label)}</span><span class="msel-v">${esc(mselVal(sel))}</span><span class="msel-car" aria-hidden="true">▾</span></button>
      <div class="msel-pop" hidden><input type="search" class="msel-q" placeholder="Find a role" aria-label="Find a role"><div class="msel-opts" role="group" aria-label="${esc(label)}">${opts.map(o => `<label class="msel-o"><input type="checkbox" value="${esc(o)}" ${sel.includes(o) ? "checked" : ""}><span>${esc(o)}</span></label>`).join("")}</div>
      <div class="msel-foot"><button type="button" class="btn btn-quiet btn-xs" data-mclear>Clear</button><button type="button" class="btn btn-accent btn-xs" data-mdone>Done</button></div></div></div>`;
  }
  const mselClose = (w, focus) => { if (!w) return; const p = w.querySelector(".msel-pop"); if (p.hidden) return; p.hidden = true; w.querySelector(".msel-btn").setAttribute("aria-expanded", "false"); w.classList.remove("open"); if (focus) w.querySelector(".msel-btn").focus(); };
  const mselFire = w => { const v = [...w.querySelectorAll(".msel-opts input:checked")].map(i => i.value); w.querySelector(".msel-v").textContent = mselVal(v); w.dispatchEvent(new CustomEvent("msel", { bubbles: true, detail: { id: w.dataset.msel, values: v } })); };
  document.addEventListener("click", e => {
    const w = e.target.closest(".msel");
    document.querySelectorAll(".msel.open").forEach(x => { if (x !== w) mselClose(x); });
    if (!w) return;
    if (e.target.closest(".msel-btn")) { const p = w.querySelector(".msel-pop"), open = p.hidden; p.hidden = !open; w.classList.toggle("open", open); w.querySelector(".msel-btn").setAttribute("aria-expanded", String(open)); if (open) { const q = w.querySelector(".msel-q"); q.value = ""; w.querySelectorAll(".msel-o").forEach(o => o.hidden = false); (window.matchMedia("(pointer: fine)").matches ? q : w.querySelector(".msel-opts input")).focus(); } }
    else if (e.target.closest("[data-mdone]")) mselClose(w, true);
    else if (e.target.closest("[data-mclear]")) { w.querySelectorAll(".msel-opts input").forEach(i => i.checked = false); mselFire(w); }
  });
  document.addEventListener("change", e => { const w = e.target.closest(".msel"); if (w && e.target.matches(".msel-opts input")) mselFire(w); });
  document.addEventListener("input", e => { if (!e.target.classList.contains("msel-q")) return; const q = e.target.value.trim().toLowerCase(); e.target.closest(".msel").querySelectorAll(".msel-o").forEach(o => o.hidden = q && !(o.textContent.toLowerCase().includes(q) || o.querySelector("input").value.toLowerCase().includes(q))); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") { const w = e.target.closest && e.target.closest(".msel.open"); if (w) { e.stopPropagation(); mselClose(w, true); } } }, true);

  // ---------- CREW ----------
  fillSelect($("#crewTerm"), C.TERMS); fillSelect($("#crewCohort"), liveCohorts());
  const deptOf = r => Object.keys(C.ROLE_GROUPS).find(g => C.ROLE_GROUPS[g].includes(r)) || "";
  const fillDepts = () => { const sel = $("#crewDept"), v = sel.value; sel.innerHTML = `<option value="">All departments</option>` + Object.keys(C.ROLE_GROUPS).map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join(""); sel.value = v; };
  fillDepts();
  const crewRoles = new Set();
  let crewTs = null;
  function drawCrewChips() {
    const learn = $("#crewLearn") && $("#crewLearn").checked;
    $("#crewRoleChips").innerHTML = mselHtml("crewRoles", "Roles", allRoles(), [...crewRoles]) + `<label class="toggle crew-learn"><input type="checkbox" id="crewLearn" ${learn ? "checked" : ""}> <span>Include people who want to shadow</span></label>`;
    $("#crewLearn").addEventListener("change", renderCrew);
  }
  drawCrewChips();
  $("#crewRoleChips").addEventListener("msel", e => { crewRoles.clear(); e.detail.values.forEach(v => crewRoles.add(v)); renderCrew(); });
  $("#crewSort").addEventListener("change", () => { crewTs = null; renderCrew(); });
  $("#view-crew").addEventListener("click", e => {
    const t = e.target.closest("#crewList [data-tsort]");
    if (t) { const i = +t.dataset.tsort; crewTs = crewTs && crewTs.i === i ? (crewTs.dir > 0 ? { i, dir: -1 } : null) : { i, dir: 1 }; renderCrew(); }
  });
  ["#crewSearch", "#crewFrom", "#crewTo", "#crewTerm", "#crewCohort", "#crewDept", "#crewKitOnly"].forEach(s => $(s).addEventListener("input", renderCrew));
  function renderCrew() {
    const q = $("#crewSearch").value.trim().toLowerCase();
    let from = $("#crewFrom").value, to = $("#crewTo").value;
    if (from && !to) to = from; if (to && !from) from = to; if (from && to && to < from) [from, to] = [to, from];
    if ($("#crewDept").options.length - 1 !== Object.keys(C.ROLE_GROUPS).length) fillDepts();
    const dept = $("#crewDept").value, inDept = r => (C.ROLE_GROUPS[dept] || []).includes(r);
    const days = from ? daysIn(from, to) : null, term = $("#crewTerm").value, cohort = $("#crewCohort").value, kitOnly = $("#crewKitOnly").checked, learn = $("#crewLearn") && $("#crewLearn").checked;
    let list = S.students.filter(listed)
      .filter(s => !q || [s.name, s.pref, s.bio, s.pathway, s.based, s.from, ...s.roles, ...s.learn, ...s.kit.map(k => k.item + " " + k.cat)].join(" ").toLowerCase().includes(q))
      .filter(s => !crewRoles.size || s.roles.some(r => crewRoles.has(r)) || (learn && s.learn.some(r => crewRoles.has(r))))
      .filter(s => !dept || s.roles.some(inDept) || (learn && s.learn.some(inDept)))
      .filter(s => !term || s.term === term).filter(s => !cohort || s.cohort === cohort).filter(s => !kitOnly || s.kit.length)
      .map(s => ({ s, n: days ? freeDaysCount(s, days) : null }));
    if (days) list = list.filter(x => x.n > 0 || x.s.openToOffers);
    const byName = (a, b) => a.s.name.localeCompare(b.s.name), srt = $("#crewSort").value;
    const hits = s => crewRoles.size ? (crewRoles.has(s.primary) ? 2 : 0) + s.roles.filter(r => crewRoles.has(r)).length : 0;
    list.sort(srt === "name" ? byName : srt === "updated" ? (a, b) => (b.s.updated || "").localeCompare(a.s.updated || "") || byName(a, b)
      : srt === "credits" ? (a, b) => creditsOf(b.s).length - creditsOf(a.s).length || byName(a, b) : srt === "kit" ? (a, b) => b.s.kit.length - a.s.kit.length || byName(a, b)
      : (a, b) => (days ? b.n - a.n : 0) || hits(b.s) - hits(a.s) || (nextFree(a.s) ? 0 : 1) - (nextFree(b.s) ? 0 : 1) || byName(a, b));
    const tc = crewTs && CREW_COLS[crewTs.i];
    if (tc) { const k = colKey(tc); list = list.map(x => [k(x), x]).sort((a, b) => cmpKey(a[0], b[0]) * crewTs.dir).map(x => x[1]); }
    const full = days ? list.filter(x => x.n === days.length).length : null;
    $("#crewMeta").textContent = days ? `${list.length} ${list.length === 1 ? "person" : "people"} · ${full} free for all of ${fmtRange({ from, to })}` : `${list.length} ${list.length === 1 ? "person" : "people"}${crewRoles.size ? ` who do ${[...crewRoles].join(" or ")}` : dept ? ` in ${dept}` : ""}. Add dates to check availability.`;
    $("#crewList").innerHTML = !list.length ? `<div class="empty"><p class="empty-t">No one matches yet.</p><p class="muted">Try fewer roles, another department or a wider date range.</p></div>`
      : tableHtml({ color: () => "transparent", cols: CREW_COLS.map(c => [c[0], x => `<div class="cell"${c[4] ? ` title="${esc(c[4](x))}"` : ""}>${c[1](x, days)}</div>`, c[2], c[3]]) }, list, crewTs);
    bindOpeners($("#crewList"));
  }
  const availBadge = (s, n, days) => days ? (n === days.length ? `<span class="badge badge-free">Free all ${days.length} day${days.length > 1 ? "s" : ""}</span>` : n > 0 ? `<span class="badge badge-part">Free ${n} of ${days.length} days</span>` : `<span class="badge badge-off">Open to offers</span>`)
    : (nextFree(s) ? `<span class="badge badge-free">Free ${esc(nextFree(s))}</span>` : `<span class="badge badge-off">${s.openToOffers ? "Open to offers" : "No dates set"}</span>`);
  const crewContact = s => me() && s.id === me().id ? `<span class="muted small">This is you</span>` : emailVisible(s) ? `<a class="btn btn-accent btn-xs" href="${mailto(s.email, "Crewing up: are you free?", `Hi ${first(s.name)},\n\nI found you on Crew Call. `)}" target="_blank" rel="noopener">Email</a>` : `<button class="btn btn-accent btn-xs" data-msg="${s.id}">Message</button>`;
  // [label, (row, days) => html, class, sort key, full text on hover]
  // Every row is the same height: anything that doesn't fit is cut off with … and shown in full on hover or in the profile
  const roleChips = (rs, cls = "") => rs.map(r => `<span class="chip ${cls} ${crewRoles.has(r) ? "chip-hit" : ""}">${esc(r)}</span>`).join("");
  const CREW_COLS = [
    ["Name", x => `<button class="link-btn bt-t" data-student="${x.s.id}">${esc(x.s.name)}${prefTag(x.s)}</button>${x.s.guest ? ` <span class="tag-guest">Guest</span>` : ""}<span class="bt-sub">${esc(x.s.pathway)}</span>`, "c-name", x => x.s.name, x => [x.s.name, x.s.pref, x.s.pathway].filter(Boolean).join(" · ")],
    ["Department", x => esc(deptOf(x.s.primary || x.s.roles[0]) || "") || `<span class="muted">Not set</span>`, "small", x => deptOf(x.s.primary || x.s.roles[0]) || "~", x => [...new Set(x.s.roles.map(deptOf).filter(Boolean))].join(", ")],
    ["Main role", x => x.s.primary ? `<span class="chip chip-primary ${crewRoles.has(x.s.primary) ? "chip-hit" : ""}">${esc(x.s.primary)}</span>` : `<span class="muted small">None</span>`, "", x => x.s.primary || "~", x => x.s.primary || ""],
    ["Also does", x => { const o = x.s.roles.filter(r => r !== x.s.primary); if (!o.length) return `<span class="muted small">None</span>`; const hit = o.filter(r => crewRoles.has(r)), rest = o.filter(r => !crewRoles.has(r)), sh = [...hit, ...rest]; return `<span class="chips-1">${roleChips(sh.slice(0, 1))}${sh.length > 1 ? `<span class="more-n">+${sh.length - 1}</span>` : ""}</span>`; }, "", x => -x.s.roles.length, x => x.s.roles.filter(r => r !== x.s.primary).join(", ")],
    ["Based in", x => x.s.based ? esc(x.s.based) : `<span class="muted">Not set</span>`, "small", x => (x.s.based || "~").toLowerCase(), x => [x.s.based, x.s.from ? "from " + x.s.from : ""].filter(Boolean).join(", ")],
    ["Term", x => `<span class="term-tag">${esc(tLabel(x.s))}</span>`, "small", x => C.TERMS.indexOf(x.s.term), x => tLabel(x.s)],
    ["Free", (x, days) => availBadge(x.s, x.n, days), "", x => x.n != null ? -x.n : (x.s.avail.find(r => r.to >= TODAY) || { from: "9999" }).from],
    ["Kit", x => x.s.kit.length ? esc(x.s.kit.map(k => k.item).join(", ")) : `<span class="muted">None</span>`, "small", x => -x.s.kit.length, x => x.s.kit.map(k => k.item).join(", ")],
    ["Credits", x => String(creditsOf(x.s).length), "mono small", x => -creditsOf(x.s).length],
    ["Updated", x => esc(updatedLabel(x.s)), "small", x => -(D(x.s.updated || "2000-01-01").getTime())],
    ["Contact", x => crewContact(x.s), "", x => (emailVisible(x.s) ? 0 : 1)]
  ];
  const pinIco = `<svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>`;
  function openStudent(id, backPid) {
    const s = student(id); if (!s) return;
    const back = backPid && project(backPid);
    if (!me()) return openSignIn("Sign in to see crew profiles.");
    const booked = live().filter(p => onProject(p, s.id) && isActive(p));
    const credits = creditsOf(s);
    const mine = live().filter(p => isActive(p) && runs(p) && openRoles(p).some(r => s.roles.includes(r.role)));
    openModal(`
      ${back ? `<button type="button" class="link-btn m-back" data-proj="${back.id}"><span aria-hidden="true">←</span> <span>Back to ${esc(back.title)}</span></button>` : ""}
      <div class="m-head"><div class="crew-top"><span class="avatar avatar-lg">${initials(s.name)}</span>
        <div><h2 id="modalTitle" class="m-title">${esc(s.name)}${prefTag(s)}</h2><p class="card-sub">${esc(s.pathway)} · <span class="term-tag">${esc(tLabel(s))}</span>${s.guest ? ` <span class="tag-guest">Guest${s.invitedBy && student(s.invitedBy) ? `, invited by ${esc(student(s.invitedBy).name)}` : ""}</span>` : ""}</p></div></div></div>
      ${s.bio ? `<p class="logline">${esc(s.bio)}</p>` : ""}
      <dl class="meta-list">
        ${s.based || s.from ? `<div><dt>Based in</dt><dd>${s.based ? esc(s.based) : `<span class="muted">Not set</span>`}${s.from ? ` <span class="muted">· from ${esc(s.from)}</span>` : ""}</dd></div>` : ""}
        <div><dt>Roles</dt><dd><div class="chips">${[s.primary, ...s.roles.filter(r => r !== s.primary)].filter(Boolean).map(r => `<span class="chip ${r === s.primary ? "chip-primary" : ""}">${r === s.primary ? "★ " : ""}${esc(r)}</span>`).join("")}</div></dd></div>
        ${s.learn.length ? `<div><dt>Wants to learn</dt><dd><div class="chips">${s.learn.map(r => `<span class="chip chip-learn">${esc(r)}</span>`).join("")}</div></dd></div>` : ""}
        <div><dt>Kit</dt><dd>${s.kit.length ? `<ul class="kit-list">${s.kit.map(k => `<li><span class="kit-cat">${esc(k.cat)}</span>${esc(k.item)}</li>`).join("")}</ul>` : `<span class="muted">No kit listed</span>`}</dd></div>
        <div><dt>Free</dt><dd class="mono">${s.avail.filter(r => r.to >= TODAY).length ? s.avail.filter(r => r.to >= TODAY).map(fmtRange).join(", ") : "No dates set"}${s.openToOffers ? ` <span class="muted">· open to offers</span>` : ""}<br><span class="upd">${esc(updatedLabel(s))}</span></dd></div>
        <div><dt>Booked on</dt><dd>${booked.length ? booked.map(p => `<button class="link-btn" data-proj="${p.id}">${esc(p.title)}</button> <span class="mono muted">${p.shoots.map(fmtRange).join(" + ")}</span>`).join("<br>") : `<span class="muted">Nothing yet</span>`}</dd></div>
        <div><dt>Credits</dt><dd>${credits.length ? `<ul class="credit-list">${credits.map(x => `<li><span class="cr-role">${x.shadow ? "Shadow " : ""}${esc(x.role)}</span><button class="link-btn" data-proj="${x.p.id}">${esc(x.p.title)}</button><span class="muted">${esc(x.p.type)} · ${monYear(x.p.shoots[0].from)}</span></li>`).join("")}</ul>` : `<span class="muted">No wrapped shoots yet</span>`}</dd></div>
        ${portfolioHtml(s)}
        <div><dt>Contact</dt><dd>${reach(s)}</dd></div>
      </dl>
      ${mine.length ? `<h3 class="dp-sub">Invite to one of your projects</h3>
      <div class="invite"><select id="inviteSel">${mine.map(p => [...new Set(openRoles(p).filter(r => s.roles.includes(r.role)).map(r => r.role))].map(r => `<option value="${p.id}|${esc(r)}">${esc(p.title)} — ${esc(r)}</option>`).join("")).join("")}</select><button class="btn btn-accent btn-sm" id="inviteBtn">Send invite</button></div>` : ""}`);
    const btn = modalBody.querySelector("#inviteBtn");
    if (btn) btn.addEventListener("click", () => {
      const [pid, role] = $("#inviteSel").value.split("|"), p = project(pid);
      notify(s.id, "invite", `${me().name} would like you as ${role} on ${p.title} (${p.shoots.map(fmtRange).join(" + ")}). Open the project to request the role.`, pid);
      toast(`Invite sent to ${first(s.name)}`);
    });
    if (me() && s.id !== me().id) addReportLink("person", s.id);
  }

  // ---------- shared opener binding ----------
  function bindOpeners(root) {
    root.querySelectorAll("[data-proj]").forEach(b => (b.onclick = () => openProject(b.dataset.proj)));
    root.querySelectorAll("[data-student]").forEach(b => (b.onclick = () => b.dataset.student && openStudent(b.dataset.student)));
    root.querySelectorAll("[data-copy]").forEach(b => (b.onclick = () => copy(b.dataset.copy)));
    root.querySelectorAll("[data-msg]").forEach(b => (b.onclick = () => openMessage(b.dataset.msg)));
    root.querySelectorAll("[data-signin]").forEach(b => (b.onclick = () => openSignIn()));
    root.querySelectorAll("[data-action=post]").forEach(b => (b.onclick = () => openPostForm()));
  }

  // ---------- POST / EDIT PROJECT ----------
  $("#postProjectBtn").addEventListener("click", () => openPostForm());
  const rangeRow = (r = { from: "", to: "" }) => `<div class="range-row"><label class="field-inline"><span>From</span><input type="date" class="r-from" value="${r.from}" required></label><label class="field-inline"><span>To</span><input type="date" class="r-to" value="${r.to}"></label><button type="button" class="icon-btn icon-sm r-del" aria-label="Remove dates">×</button></div>`;
  const readRanges = root => [...root.querySelectorAll(".range-row")].map(row => { const f = row.querySelector(".r-from").value, t = row.querySelector(".r-to").value || f; return f ? (t < f ? { from: t, to: f } : { from: f, to: t }) : null; }).filter(Boolean);
  const prodRow = (x = { name: "", email: "", sid: null }) => { const st = x.sid && student(x.sid); return `<div class="prow"><input class="p-name" list="ccMembers" autocomplete="off" placeholder="Pick a member or type a name" aria-label="Producer" value="${esc(st ? memberLabel(st) : x.name)}"><input class="p-email prow-email" type="email" ${st ? "disabled" : ""} placeholder="${st ? "On Crew Call" : "Email, if they're not on Crew Call"}" aria-label="Producer email" value="${esc(st ? "" : x.email || "")}"><button type="button" class="btn btn-quiet btn-xs p-del">Remove</button></div>`; };
  const locRow = (l = { name: "", detail: "" }) => `<div class="range-row loc-row" ${l.lat != null ? `data-lat="${l.lat}" data-lng="${l.lng}" data-pinned="${esc(l.name)}"` : ""}><input class="l-name" placeholder="Location or postcode, e.g. Campus Studio 1" aria-label="Location name" value="${esc(l.name)}"><input class="l-detail" placeholder="Notes, e.g. interiors" aria-label="Location notes" value="${esc(l.detail)}"><button type="button" class="btn btn-quiet btn-xs l-pin" aria-label="Pin ${esc(l.name || "this location")} on the map">${l.lat != null ? "Pinned" : "Pin on map"}</button><button type="button" class="icon-btn icon-sm l-del" aria-label="Remove location">×</button><span class="l-pin-st small muted" aria-live="polite"></span></div>`;
  // Pinning looks the place up once, when asked, through OpenStreetMap's free Nominatim search (max one lookup a second, no autocomplete).
  // https://operations.osmfoundation.org/policies/nominatim/
  const CAMPUS = [{ re: /shelton|black ?box|campus cinema/i, name: "LFS Shelton Street", lat: 51.5136, lng: -0.1256 }, { re: /campus|parker st|lfs/i, name: "LFS Parker Street", lat: 51.5156, lng: -0.1213 }];
  let lastLookup = 0;
  async function pinPlace(q) {
    const c = CAMPUS.find(x => x.re.test(q)); if (c) return { lat: c.lat, lng: c.lng, label: c.name };
    const wait = 1100 - (Date.now() - lastLookup); if (wait > 0) await new Promise(r => setTimeout(r, wait));
    lastLookup = Date.now();
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=gb&q=${encodeURIComponent(q)}`, { headers: { "Accept-Language": "en-GB" } });
    if (!r.ok) throw new Error("lookup");
    const j = await r.json(); if (!j.length) return null;
    return { lat: +(+j[0].lat).toFixed(5), lng: +(+j[0].lon).toFixed(5), label: j[0].display_name.split(", ").slice(0, 3).join(", ") };
  }
  function bindPins(root) {
    root.addEventListener("click", async e => {
      const b = e.target.closest(".l-pin"); if (!b) return;
      const row = b.closest(".loc-row"), q = row.querySelector(".l-name").value.trim(), st = row.querySelector(".l-pin-st");
      if (!q) { st.textContent = "Type the place or a postcode first."; return; }
      b.disabled = true; st.textContent = "Looking it up…";
      try {
        const hit = await pinPlace(q);
        if (!hit) { st.textContent = "Couldn't find that. Try adding the street or postcode."; b.textContent = "Pin on map"; delete row.dataset.lat; delete row.dataset.lng; }
        else { Object.assign(row.dataset, { lat: hit.lat, lng: hit.lng, pinned: q }); b.textContent = "Pinned"; st.textContent = `Pinned near ${hit.label}`; }
      } catch (err) { st.textContent = "The map lookup isn't reachable right now. You can save and pin it later."; }
      b.disabled = false;
    });
    // editing the name after pinning clears the pin, so a stale pin never shows
    root.addEventListener("input", e => { if (!e.target.classList.contains("l-name")) return; const row = e.target.closest(".loc-row"); if (row.dataset.lat && row.dataset.pinned !== e.target.value.trim()) { delete row.dataset.lat; delete row.dataset.lng; row.querySelector(".l-pin").textContent = "Pin on map"; row.querySelector(".l-pin-st").textContent = ""; } });
  }

  const linkRow = (l = { label: "", url: "" }) => `<div class="range-row link-row"><input class="h-label" placeholder="Label, e.g. Call sheet" aria-label="Link label" value="${esc(l.label)}"><input class="h-url" inputmode="url" autocapitalize="off" spellcheck="false" placeholder="e.g. drive.google.com/…" aria-label="Link address" value="${esc(l.url)}"><button type="button" class="icon-btn icon-sm h-del" aria-label="Remove link">×</button></div>`;

  // Long forms are split into tabs. bindFormTabs wires a .ptabs bar whose buttons have data-<prefix>tab
  const PF_TABS = [["basics", "Basics"], ["when", "Dates and places"], ["roles", "Roles"], ["cast", "Casting"], ["hub", "Crew hub"]];
  function bindFormTabs(form, pre, first) {
    const bs = [...form.querySelectorAll(`[data-${pre}tab]`)];
    const show = k => { bs.forEach(b => { const on = b.dataset[pre + "tab"] === k; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; });
      form.querySelectorAll(`.${pre}-panel`).forEach(x => (x.hidden = x.id !== `${pre}p-${k}`)); };
    bs.forEach(b => b.addEventListener("click", () => show(b.dataset[pre + "tab"])));
    bs[0].parentElement.addEventListener("keydown", e => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const i = bs.indexOf(document.activeElement); if (i < 0) return;
      const fwd = (e.key === "ArrowRight") !== (document.dir === "rtl"), n = bs[(i + (fwd ? 1 : bs.length - 1)) % bs.length]; n.focus(); n.click();
    });
    form._showTab = show; show(first);
  }
  // show a post-form error and switch to the tab it's about
  function pfFail(form, msg, el) {
    const box = form.querySelector("#postErr"); if (box) box.textContent = msg; if (!msg) return;
    const tab = el ? el.closest(".pf-panel").id.slice(4) : /casting/i.test(msg) ? "cast" : /WhatsApp|key links/i.test(msg) ? "hub" : /shoot date|location/i.test(msg) ? "when" : /role|brief|booked/i.test(msg) ? "roles" : "basics";
    if (form._showTab) form._showTab(tab);
    if (el) el.focus();
  }
  function openPostForm(edit, tab) {
    const m = me(); if (!m) return openSignIn("Sign in to post a project.");
    if (edit && !canManage(edit)) return toast("Only the producer or director can edit this project");
    const p = edit || null;
    const roles = p ? p.roles.map(r => ({ ...r })) : [];
    const sched = p ? JSON.parse(JSON.stringify(p.days || {})) : {};
    openModal(`
      <h2 id="modalTitle" class="m-title">${p ? `Edit ${esc(p.title)}` : "Post a shoot"}</h2>
      <p class="muted small">${p ? "Only this project's producer and director (and admins) can edit it. Locked crew are told if dates or call times change." : "Your shoot appears on the calendar and people whose roles and free days match are notified."}</p>
      <form id="postForm" class="post-form" novalidate>
        <div class="ptabs pf-tabs" role="tablist" aria-label="Project details">${PF_TABS.map(([k, l]) => `<button type="button" role="tab" class="ptab" id="pfb-${k}" aria-controls="pfp-${k}" aria-selected="false" data-pftab="${k}">${l}<span class="count" data-pfcount="${k}" hidden></span></button>`).join("")}</div>
        <div class="ptab-panel pf-panel" id="pfp-basics" role="tabpanel" aria-labelledby="pfb-basics">
        <div class="form-grid">
          <label class="field span-2"><span>Project title</span><input name="title" required maxlength="60" value="${esc(p ? p.title : "")}"></label>
          <label class="field"><span>Type</span><select name="type">${C.TYPES.map(t => `<option ${p && p.type === t ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></label>
          <label class="field"><span>Term</span><select name="term">${C.TERMS.map(t => `<option ${(p ? p.term : m.term) === t ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></label>
          <label class="field"><span>Director <small>pick a member or type a name</small></span><input name="director" required list="ccMembers" autocomplete="off" value="${esc(p ? (p.dsid && student(p.dsid) ? memberLabel(student(p.dsid)) : p.director) : memberLabel(m))}"></label>
          <label class="field"><span>Director email <small>only if they're not on Crew Call</small></span><input name="email" type="email" value="${esc(p && !(p.dsid && student(p.dsid)) ? p.email || "" : "")}"></label>
          <label class="field span-2"><span>Logline</span><textarea name="logline" rows="2" maxlength="200" required>${esc(p ? p.logline : "")}</textarea></label>
        </div>
        <fieldset class="fs"><legend>Producers <small>they can edit the project and manage crew</small></legend>
          <div class="prows" id="postProds">${(p ? prodsOf(p) : []).map(x => prodRow(x)).join("")}</div>
          <button type="button" class="btn btn-ghost btn-sm" id="postProdAdd">Add a producer</button>
          <p class="muted small">No producer yet? Leave this empty and a Producer role is added for people to offer.</p>
        </fieldset>
        <datalist id="ccMembers">${memberOptions("")}</datalist>
        ${photoField(p ? p.cover : "")}
        </div>
        <div class="ptab-panel pf-panel" id="pfp-when" role="tabpanel" aria-labelledby="pfb-when" hidden>
        <fieldset class="fs"><legend>Locations</legend>
          <div class="range-list" id="postLocs">${(p && locs(p).length ? locs(p) : [undefined]).map(l => locRow(l)).join("")}</div>
          <button type="button" class="btn btn-ghost btn-sm" id="postLocAdd">Add another location</button>
        </fieldset>
        <fieldset class="fs"><legend>Shoot dates</legend>
          <div class="range-list" id="postRanges">${(p ? p.shoots : [undefined]).map(r => rangeRow(r)).join("")}</div>
          <button type="button" class="btn btn-ghost btn-sm" id="postRangeAdd">Add another block</button>
          <label class="field mt"><span>Delivery date <small>optional: when post has to be finished. The film stays on Post until then</small></span><input name="delivery" type="date" value="${p && p.delivery ? p.delivery : ""}"></label>
        </fieldset>
        <fieldset class="fs"><legend>Call, wrap and location for each day</legend>
          <div id="schedRows"></div>
        </fieldset>
        </div>
        <div class="ptab-panel pf-panel" id="pfp-roles" role="tabpanel" aria-labelledby="pfb-roles" hidden>
        <fieldset class="fs"><legend>Roles</legend>
          <p class="muted small">Already know who's doing a role? Type their name to put them down. People who list the role come first. <span>Use Details to add a brief or mark a role as paid. Paid roles also show on Paid.</span></p>
          <div class="rrows" id="postRoles"></div>
          <div class="kit-add"><select id="postRoleSel">${roleOptions("DoP")}</select><input id="postRoleQty" type="number" min="1" max="10" value="1" aria-label="How many"><button type="button" class="btn btn-ghost btn-sm" id="postRoleAdd">Add role</button></div>
          ${p ? "" : `<label class="toggle mt"><input type="checkbox" name="iDirect" checked> <span>List me as Director (filled)</span></label>`}
        </fieldset>
        <fieldset class="fs"><legend>What crew get</legend>
          <div class="perk-row">${[["pkMeals", "meals", "Meals"], ["pkTravel", "travel", "Travel"], ["pkCredit", "credit", "Credit"]].map(([n, k, l]) => `<label class="toggle"><input type="checkbox" name="${n}" ${p ? (perksOf(p)[k] ? "checked" : "") : k === "travel" ? "" : "checked"}> <span>${l}</span></label>`).join("")}</div>
          <p class="muted small">Tick what everyone on the shoot gets. Paid roles are set on each role, under Details.</p>
        </fieldset>
        <label class="field"><span>Kit wanted (optional)</span><input name="kitNeeded" placeholder="e.g. haze machine, gimbal" value="${esc(p ? p.kitNeeded : "")}"></label>
        </div>
        <div class="ptab-panel pf-panel" id="pfp-cast" role="tabpanel" aria-labelledby="pfb-cast" hidden>
        <fieldset class="fs"><legend>Casting <small>optional: for Talent and Supporting artist roles</small></legend>
          <p class="muted small">Add Talent or Supporting artist in the Roles tab, then open Details to name the character. Actors can request a part here, or apply through your casting call.</p>
          <div class="form-grid">
            <label class="field span-2"><span>Casting call link <small>Backstage, Spotlight, StarNow, Mandy or a form</small></span><input name="castLink" inputmode="url" autocapitalize="off" spellcheck="false" placeholder="backstage.com/casting/…" value="${esc(p && castOf(p).link ? shortUrl(castOf(p).link) : "")}"></label>
            <label class="field"><span>Applications close</span><input name="castCloses" type="date" value="${p ? castOf(p).closes : ""}"></label>
            <label class="field"><span>Paid? <small>optional</small></span><input name="castPay" maxlength="60" placeholder="e.g. Expenses and lunch" value="${esc(p ? castOf(p).pay : "")}"></label>
            <label class="field span-2"><span>Notes for actors <small>optional</small></span><textarea name="castNotes" rows="2" maxlength="600" placeholder="Self-tape or in-person audition, recall dates, what to send">${esc(p ? castOf(p).notes : "")}</textarea></label>
          </div>
        </fieldset>
        </div>
        <div class="ptab-panel pf-panel" id="pfp-hub" role="tabpanel" aria-labelledby="pfb-hub" hidden>
        <fieldset class="fs"><legend>Crew hub: WhatsApp, links and details</legend>
          <p class="muted small">Everything your crew need in one place. Shown only to locked crew, the producer, director and admins, unless you choose otherwise.</p>
          <label class="field"><span>WhatsApp group invite link <small>optional</small></span><input name="hubWa" inputmode="url" autocapitalize="off" spellcheck="false" placeholder="chat.whatsapp.com/…" value="${esc(p ? hubOf(p).whatsapp : "")}"></label>
          <p class="hub-help muted small">In WhatsApp: open the group, tap its name, then Invite via link, and copy it here.</p>
          <span class="field-lbl">Key links</span>
          <div class="range-list" id="hubLinks">${(p && hubOf(p).links.length ? hubOf(p).links : [undefined]).map(l => linkRow(l)).join("")}</div>
          <button type="button" class="btn btn-ghost btn-sm" id="hubLinkAdd">Add another link</button>
          <label class="field mt"><span>Key details <small>optional</small></span><textarea name="hubDetails" rows="3" maxlength="1200" placeholder="Nearest station, parking, meeting point, food, what to wear, kit drop-off">${esc(p ? hubOf(p).details : "")}</textarea></label>
          <label class="field"><span>Who can see this</span><select name="hubVis"><option value="crew" ${p && hubOf(p).vis === "members" ? "" : "selected"}>Locked crew only</option><option value="members" ${p && hubOf(p).vis === "members" ? "selected" : ""}>Everyone signed in</option></select></label>
        </fieldset>
        </div>
        <p class="form-err" id="postErr" role="alert"></p>
        <div class="form-actions"><button class="btn btn-accent" type="submit">${p ? "Save changes" : "Post project"}</button><button class="btn btn-ghost" type="button" ${p ? 'id="postBack"' : "data-close"}>Cancel</button></div>
      </form>`, true);
    if (p) $("#postBack").addEventListener("click", () => openProject(p.id));
    bindFormTabs($("#postForm"), "pf", tab || "basics");

    const wasFilled = new Set(roles.filter(r => r.filledBy).map(r => r.rid));
    const dlId = {}; let dlN = 0;
    const saveRolesDom = () => $$("#postRoles .rrow").forEach(row => { const r = roles[+row.dataset.i]; if (!r) return;
      const w = row.querySelector(".r-who"); if (w) r._who = w.value;
      const ch = row.querySelector(".r-char"); if (ch) { r._ch = ch.value; r._age = row.querySelector(".r-age").value; }
      r._hod = row.querySelector(".r-hod").checked; r._paid = row.querySelector(".r-paid").checked; r._pay = row.querySelector(".r-pay").value; r._bt = row.querySelector(".r-btext").value; r._bu = row.querySelector(".r-burl").value; r._open = !row.querySelector(".rrow-brief").hidden; });
    const drawRoles = () => {
      saveRolesDom();
      const lists = [...new Set(roles.filter(r => !wasFilled.has(r.rid)).map(r => r.role))].map(role => { if (!(role in dlId)) dlId[role] = `ccRole${dlN++}`; return `<datalist id="${dlId[role]}">${memberOptions(role)}</datalist>`; }).join("");
      $("#postRoles").innerHTML = roles.length ? lists + roles.map((r, i) => {
        const locked = wasFilled.has(r.rid), hod = r._hod != null ? r._hod : isHod(r);
        const who = r._who != null ? r._who : r.filledBy && !locked ? (isExt(r) ? extName(r) : student(r.filledBy) ? memberLabel(student(r.filledBy)) : "") : "";
        const bt = r._bt != null ? r._bt : (r.brief && r.brief.text) || "", bu = r._bu != null ? r._bu : shortUrl((r.brief && r.brief.url) || "");
        const open = r._open != null ? r._open : false, cast = isCast(r);
        const ch = r._ch != null ? r._ch : r.character || "", age = r._age != null ? r._age : r.age || "";
        const paid = r._paid != null ? r._paid : !!r.paid, pay = r._pay != null ? r._pay : r.pay || "";
        return `<div class="rrow${cast ? " is-cast" : ""}" data-i="${i}"><div class="rrow-top"><span class="rrow-name">${esc(r.role)}${cast && ch ? ` <span class="rrow-char">${esc(ch)}</span>` : ""}${hod ? ` <span class="tag-hod" title="Head of department">HOD</span>` : ""}${paid ? ` <span class="pay-tag">${esc(pay || "Paid")}</span>` : ""}</span>
          ${locked ? `<span class="rrow-done rrow-assign">${esc(isExt(r) ? extName(r) : (student(r.filledBy) || { name: "Locked in" }).name)} · reopen it in the project window to change</span>`
            : `<input class="r-who rrow-assign" list="${dlId[r.role]}" autocomplete="off" placeholder="Open: anyone can offer. Or type a name" aria-label="Who is doing ${esc(r.role)}" value="${esc(who)}">`}
          <button type="button" class="btn btn-quiet btn-xs r-bt" aria-expanded="${open}">${cast ? (ch || bt || paid ? "Details ✓" : "Details") : bt || bu || paid ? "Details ✓" : "Details"}</button>
          ${locked ? "<span></span>" : `<button type="button" class="btn btn-quiet btn-xs r-del" aria-label="Remove ${esc(r.role)}">Remove</button>`}</div>
          <div class="rrow-brief" ${open ? "" : "hidden"}>${cast ? `<div class="form-grid"><label class="field"><span>Character <small>optional</small></span><input class="r-char" maxlength="40" placeholder="e.g. Maya" value="${esc(ch)}"></label>
            <label class="field"><span>Playing age <small>optional</small></span><input class="r-age" maxlength="20" placeholder="e.g. 25 to 35" value="${esc(age)}"></label></div>` : ""}<div class="r-payrow"><label class="toggle"><input type="checkbox" class="r-paid" ${paid ? "checked" : ""}> <span>This role is paid</span></label><label class="field r-payf"><span>Pay <small>optional</small></span><input class="r-pay" maxlength="40" placeholder="e.g. £150 a day" value="${esc(pay)}"></label></div>
            <label class="toggle"${cast ? " hidden" : ""}><input type="checkbox" class="r-hod" ${hod ? "checked" : ""}> <span>Head of department</span></label>
            <label class="field"><span>${cast ? "About the part" : "Brief"} <small>only people signed in can read it</small></span><textarea class="r-btext" rows="3" maxlength="1500" placeholder="${cast ? "Who they are, what the scenes ask for, accents, any intimacy or stunts, self-tape details" : "What they need to know: the look, references, budget, kit, deadlines"}">${esc(bt)}</textarea></label>
            <label class="field"><span>Brief link <small>optional: a doc, deck or moodboard</small></span><input class="r-burl" inputmode="url" autocapitalize="off" spellcheck="false" placeholder="docs.google.com/…" value="${esc(bu)}"></label></div></div>`;
      }).join("") : `<span class="muted small">No roles added yet.</span>`;
    };
    drawRoles();
    $("#postRoles").addEventListener("input", e => { if (e.target.classList.contains("r-pay") && e.target.value.trim()) e.target.closest(".rrow").querySelector(".r-paid").checked = true; });
    $("#postRoles").addEventListener("click", e => {
      const d = e.target.closest(".r-del"); if (d) { saveRolesDom(); roles.splice(+d.closest(".rrow").dataset.i, 1); $$("#postRoles .rrow").forEach(x => x.remove()); return drawRoles(); }
      const b = e.target.closest(".r-bt"); if (b) { const box = b.closest(".rrow").querySelector(".rrow-brief"); box.hidden = !box.hidden; b.setAttribute("aria-expanded", String(!box.hidden)); if (!box.hidden) box.querySelector(".r-btext").focus(); }
    });
    $("#postRoles").addEventListener("change", e => { if (e.target.closest(".r-hod")) drawRoles(); });
    $("#postRoleAdd").addEventListener("click", () => { saveRolesDom(); const n = Math.max(1, Math.min(10, +$("#postRoleQty").value || 1)); for (let i = 0; i < n; i++) roles.push({ role: $("#postRoleSel").value, filledBy: null, rid: uid("r") }); drawRoles(); });
    $("#postProdAdd").addEventListener("click", () => { $("#postProds").insertAdjacentHTML("beforeend", prodRow()); $("#postProds .prow:last-child .p-name").focus(); });
    $("#postProds").addEventListener("click", e => { if (e.target.closest(".p-del")) e.target.closest(".prow").remove(); });
    $("#postProds").addEventListener("input", e => { const n = e.target.closest(".p-name"); if (!n) return; const row = n.closest(".prow"), mem = findMember(n.value), em = row.querySelector(".p-email"); em.disabled = !!mem; em.placeholder = mem ? "On Crew Call" : "Email, if they're not on Crew Call"; });

    const locNames = () => [...$("#postLocs").querySelectorAll(".l-name")].map(i => i.value.trim()).filter(Boolean);
    const saveSchedDom = () => $$("#schedRows .sc-row").forEach(row => { sched[row.dataset.d] = { call: row.querySelector(".s-call").value || "08:00", wrap: row.querySelector(".s-wrap").value || "18:00", loc: +row.querySelector(".s-loc").value || 0 }; });
    const drawSched = () => {
      saveSchedDom();
      const ds = readRanges($("#postRanges")).flatMap(r => daysIn(r.from, r.to)).filter((v, i, a) => a.indexOf(v) === i).sort();
      const names = locNames();
      $("#schedRows").innerHTML = ds.length ? `<div class="sc-head" aria-hidden="true"><span>Day</span><span>Call</span><span>Wrap</span><span>Location</span></div>` + ds.map((d, i) => {
        const v = Object.assign({ call: "08:00", wrap: "18:00", loc: 0 }, sched[d] || {});
        return `<div class="sc-row" data-d="${d}"><span class="sc-lbl"><b>Day ${i + 1}</b> ${fmtDay(d)}</span>
          <input type="time" class="s-call" value="${v.call}" aria-label="Call time, ${fmtDay(d)}"><input type="time" class="s-wrap" value="${v.wrap}" aria-label="Wrap time, ${fmtDay(d)}">
          <select class="s-loc" aria-label="Location, ${fmtDay(d)}">${(names.length ? names : ["Location TBC"]).map((n, j) => `<option value="${j}" ${v.loc === j ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></div>`;
      }).join("") + (ds.length > 1 ? `<button type="button" class="btn btn-quiet btn-xs mt" id="schedCopy">Copy day 1 times to every day</button>` : "") : `<p class="muted small">Add shoot dates above and each day appears here.</p>`;
      const cp = $("#schedCopy"); if (cp) cp.addEventListener("click", () => { const rows = $$("#schedRows .sc-row"); rows.slice(1).forEach(r => { r.querySelector(".s-call").value = rows[0].querySelector(".s-call").value; r.querySelector(".s-wrap").value = rows[0].querySelector(".s-wrap").value; }); });
    };
    drawSched();
    $("#postRanges").addEventListener("change", drawSched);
    $("#postLocs").addEventListener("change", drawSched);
    $("#postRangeAdd").addEventListener("click", () => { $("#postRanges").insertAdjacentHTML("beforeend", rangeRow()); });
    $("#postRanges").addEventListener("click", e => { if (e.target.closest(".r-del")) { e.target.closest(".range-row").remove(); drawSched(); } });
    $("#postLocAdd").addEventListener("click", () => $("#postLocs").insertAdjacentHTML("beforeend", locRow()));
    bindPins($("#postLocs"));
    $("#postLocs").addEventListener("click", e => { if (e.target.closest(".l-del")) { e.target.closest(".loc-row").remove(); drawSched(); } });
    $("#hubLinkAdd").addEventListener("click", () => $("#hubLinks").insertAdjacentHTML("beforeend", linkRow()));
    $("#hubLinks").addEventListener("click", e => { if (e.target.closest(".h-del")) e.target.closest(".link-row").remove(); });

    bindPhoto($("#postForm"));
    $("#postForm").addEventListener("submit", e => {
      e.preventDefault(); saveSchedDom();
      const f = new FormData(e.target), err = { set textContent(msg) { pfFail(e.target, msg); } };
      for (const n of ["title", "director", "logline"]) { const el = e.target[n]; if (!el.value.trim()) { pfFail(e.target, n === "title" ? "Add a project title." : n === "director" ? "Add the director." : "Add a logline.", el); return; } }
      const shoots = readRanges($("#postRanges")).sort((a, b) => a.from.localeCompare(b.from));
      if (!shoots.length) return (err.textContent = "Add at least one shoot date.");
      const locations = [...$("#postLocs").querySelectorAll(".loc-row")].map(r => Object.assign({ name: r.querySelector(".l-name").value.trim(), detail: r.querySelector(".l-detail").value.trim() }, r.dataset.lat ? { lat: +r.dataset.lat, lng: +r.dataset.lng } : {})).filter(l => l.name);
      if (!locations.length) return (err.textContent = "Add at least one location.");
      if (!roles.length) return (err.textContent = "Add at least one role.");
      const waRaw = f.get("hubWa").trim(), wa = cleanUrl(waRaw);
      if (waRaw && !/^https:\/\/(chat\.whatsapp\.com|wa\.me)\//i.test(wa)) return (err.textContent = "WhatsApp invite links start with chat.whatsapp.com/");
      const hubLinks = [...$("#hubLinks").querySelectorAll(".link-row")].map(r => ({ label: r.querySelector(".h-label").value.trim(), url: cleanUrl(r.querySelector(".h-url").value) })).filter(l => l.url);
      if ([...$("#hubLinks").querySelectorAll(".h-url")].some(i => i.value.trim() && !cleanUrl(i.value))) return (err.textContent = "One of the key links isn't a web address.");
      const hub = { whatsapp: wa, links: hubLinks, details: f.get("hubDetails").trim(), vis: f.get("hubVis") };
      const castRaw = f.get("castLink").trim(), castLink = cleanUrl(castRaw);
      if (castRaw && !castLink) return (err.textContent = "The casting call link isn't a web address.");
      const casting = { link: castLink, closes: f.get("castCloses") || "", pay: f.get("castPay").trim().slice(0, 60), notes: f.get("castNotes").trim().slice(0, 600) };
      // producers
      const producers = []; let prodErr = "";
      $$("#postProds .prow").forEach(row => { const nm = row.querySelector(".p-name").value.trim(), em = row.querySelector(".p-email").value.trim(); if (!nm) return; const mem = findMember(nm);
        if (mem) { if (!producers.some(x => x.sid === mem.id)) producers.push({ name: mem.name, email: "", sid: mem.id }); }
        else if (!em) prodErr = `Pick ${nm} from the list if they're on Crew Call, or add their email so they can sign in and manage the project.`;
        else producers.push({ name: nm, email: em, sid: null }); });
      if (prodErr) return (err.textContent = prodErr);
      // director
      const dirIn = f.get("director").trim(), dirMem = findMember(dirIn), dirEmail = f.get("email").trim();
      if (!dirMem && !dirEmail) return (err.textContent = `Pick the director from the list if they're on Crew Call, or add their email.`);
      // roles: assignments and briefs
      saveRolesDom();
      const pDays = shoots.flatMap(r => daysIn(r.from, r.to));
      const assigned = [];
      for (const r of roles) {
        const bt = (r._bt != null ? r._bt : (r.brief && r.brief.text) || "").trim(), buRaw = (r._bu != null ? r._bu : (r.brief && r.brief.url) || "").trim(), bu = cleanUrl(buRaw);
        if (buRaw && !bu) return (err.textContent = `The brief link for ${r.role} isn't a web address.`);
        if (!wasFilled.has(r.rid) && r._who != null) {
          const who = r._who.trim(), mem = findMember(who), was = r.filledBy;
          if (!who) r.filledBy = null;
          else if (mem) {
            const clash = pDays.find(d => bookedOn(mem.id, d).some(x => !p || x.id !== p.id));
            if (clash && mem.id !== was) return (err.textContent = `${mem.name} is booked on another shoot on ${fmtDay(clash)}.`);
            r.filledBy = mem.id; if (mem.id !== was) assigned.push(r);
          } else { if (r.filledBy !== "ext:" + who.slice(0, 60)) r.extBy = me().id; r.filledBy = "ext:" + who.slice(0, 60); }
        }
        const hod = r._hod != null ? r._hod : isHod(r);
        if (hod === HOD_ROLES.has(r.role)) delete r.hod; else r.hod = hod;
        if (bt || bu) r.brief = { text: bt.slice(0, 1500), url: bu }; else delete r.brief;
        const paidNow = r._paid != null ? r._paid : !!r.paid, payNow = (r._pay != null ? r._pay : r.pay || "").trim().slice(0, 40);
        if (paidNow) { r.paid = true; if (payNow) r.pay = payNow; else delete r.pay; } else { delete r.paid; delete r.pay; }
        if (isCast(r)) { const ch = (r._ch != null ? r._ch : r.character || "").trim().slice(0, 40), age = (r._age != null ? r._age : r.age || "").trim().slice(0, 20); if (ch) r.character = ch; else delete r.character; if (age) r.age = age; else delete r.age; }
      }
      roles.forEach(r => { delete r._who; delete r._hod; delete r._bt; delete r._bu; delete r._open; delete r._ch; delete r._age; });
      if (!producers.length && !roles.some(r => r.role === "Producer")) roles.unshift({ role: "Producer", filledBy: null, rid: uid("r") });
      const days = shoots.flatMap(r => daysIn(r.from, r.to)), dayMap = {};
      days.forEach(d => { dayMap[d] = Object.assign({ call: "08:00", wrap: "18:00", loc: 0 }, sched[d] || {}); if (dayMap[d].loc >= locations.length) dayMap[d].loc = 0; });
      const data = { title: f.get("title").trim(), type: f.get("type"), term: f.get("term"), director: dirMem ? dirMem.name : dirIn, dsid: dirMem ? dirMem.id : null, email: dirMem ? "" : dirEmail, locations, producers, producer: producers[0] || null, logline: f.get("logline").trim(), shoots, kitNeeded: f.get("kitNeeded").trim(), delivery: f.get("delivery") || "", cover: f.get("cover") || "", days: dayMap, hub, casting, perks: { meals: !!f.get("pkMeals"), travel: !!f.get("pkTravel"), credit: !!f.get("pkCredit") } };
      if (p) dropOldCover(p.cover, data.cover);
      if (p) {
        const before = JSON.stringify([p.shoots, p.days]), oldR = new Set(p.roles.map(r => r.rid)), hadWa = hubOf(p).whatsapp;
        Object.assign(p, data); p.roles = roles;
        const removed = [...oldR].filter(x => !roles.some(r => r.rid === x));
        S.requests.filter(q => q.pid === p.id && removed.includes(q.rid) && q.status === "pending").forEach(q => { q.status = "closed"; notify(q.sid, "update", `The ${q.role} role on ${p.title} was removed, so your request was closed.`, p.id); });
        if (JSON.stringify([p.shoots, p.days]) !== before) [...new Set([...p.roles.filter(r => r.filledBy).map(r => r.filledBy), ...p.shadows.map(x => x.sid)])].forEach(sid => sid !== m.id && notify(sid, "update", `${p.title} changed: ${p.shoots.map(fmtRange).join(" + ")}, day 1 call ${dayInfo(p, projDays(p)[0]).call}.`, p.id));
        if (hub.whatsapp && hub.whatsapp !== hadWa) [...new Set([...p.roles.filter(r => r.filledBy && !isExt(r)).map(r => r.filledBy), ...p.shadows.map(x => x.sid)])].forEach(sid => sid !== m.id && notify(sid, "update", `${p.title} has a WhatsApp group. The link is in the project's crew hub.`, p.id));
        tellAssigned(p, assigned, m);
        const n = notifyMatches(p, roles.filter(r => !oldR.has(r.rid)));
        toast(`Saved${n ? `. ${n} matching ${n === 1 ? "person was" : "people were"} told about the new roles` : ""}`);
        openProject(p.id); render();
      } else {
        if (f.get("iDirect")) roles.unshift({ role: "Director", filledBy: m.id, rid: uid("r") });
        const np = { id: uid("p"), ...data, roles, shadows: [], created: TODAY };
        S.projects.push(np);
        tellAssigned(np, assigned, m);
        const n = notifyMatches(np, roles);
        closeModal(); calMonth = np.shoots[0].from.slice(0, 7) + "-01"; selDay = np.shoots[0].from;
        toast(`${np.title} posted. ${n} ${n === 1 ? "person" : "people"} with matching roles and free days ${n === 1 ? "was" : "were"} notified.`);
        setView("calendar");
      }
    });
  }
  // people put down for a role while posting or editing: close other offers and tell them, with a way to step down
  function tellAssigned(p, rs, by) {
    rs.forEach(r => {
      S.requests.filter(x => x.pid === p.id && x.rid === r.rid && x.status === "pending" && x.type === "crew").forEach(x => {
        if (x.sid === r.filledBy) x.status = "accepted";
        else { x.status = "filled"; notify(x.sid, "update", `The ${r.role} role on ${p.title} has been filled. Thanks for offering.`, p.id); }
      });
      if (r.filledBy === by.id) return;
      const d0 = projDays(p)[0];
      notify(r.filledBy, "update", `${by.name} put you down as ${r.role} on ${p.title}${d0 ? `, day 1 ${fmtDay(d0)}` : ""}.${hasBrief(r) ? " There's a brief for you in the project." : ""} If that's not right, open the project and choose Step down.`, p.id);
    });
  }
  function notifyMatches(p, roles) {
    const fd = projDays(p).filter(d => d >= TODAY), names = [...new Set(roles.filter(r => !r.filledBy).map(r => r.role))];
    let count = 0;
    S.students.filter(listed).filter(s => !runs(p, s) && (!me() || s.id !== me().id)).forEach(s => {
      if (!notifyOf(s).match) return;
      const hit = names.filter(r => s.roles.includes(r)); if (!hit.length) return;
      const n = freeDaysCount(s, fd); if (!n) return;
      notify(s.id, "match", `New role that fits you: ${hit.join(", ")} on ${p.title}. You're free ${n === fd.length ? "every shoot day" : `${n} of ${fd.length} days`}.`, p.id); count++;
    });
    return count;
  }

  // ---------- WRAP: finish a shoot and move it on to Post ----------
  function openWrap(p) {
    const later = projDays(p).filter(d => d > TODAY).length, pend = S.requests.filter(q => q.pid === p.id && q.status === "pending").length;
    openModal(`<h2 id="modalTitle" class="m-title">Wrap ${esc(p.title)}?</h2>
      <p class="muted"><span>It comes off the Shoot board, and everyone on the crew gets the credit on their profile.</span>${later ? ` <span>${later === 1 ? "The shoot day after today comes off the calendar, and the crew are told." : `The ${later} shoot days after today come off the calendar, and the crew are told.`}</span>` : ""}${pend ? ` <span>${pend === 1 ? "The request still waiting is closed." : `The ${pend} requests still waiting are closed.`}</span>` : ""}</p>
      <p class="muted">Next, list it in Post to find an editor, colourist, sound designer or composer.</p>
      <div class="form-actions"><button class="btn btn-accent" id="wrapPost">Wrap and move to Post</button><button class="btn btn-ghost" id="wrapOnly">Just wrap</button><button class="btn btn-quiet" data-close>Cancel</button></div>`);
    $("#wrapPost").onclick = () => { doWrap(p); moveToPost(p); };
    $("#wrapOnly").onclick = () => { doWrap(p); closeModal(); render(); toast(`${p.title} has wrapped`); };
  }
  function doWrap(p) {
    const early = projDays(p).some(d => d > TODAY), m = me();
    p.wrapped = TODAY;
    if (early) { p.unwrapShoots = JSON.parse(JSON.stringify(p.shoots)); p.shoots = p.shoots.filter(r => r.from <= TODAY).map(r => r.to > TODAY ? { ...r, to: TODAY } : r); }
    S.requests.filter(q => q.pid === p.id && q.status === "pending").forEach(q => { q.status = "declined"; notify(q.sid, "update", `${p.title} has wrapped, so your request for ${q.role} is closed. Thanks for offering.`, p.id); });
    const crew = [...new Set(p.roles.filter(r => r.filledBy && !isExt(r)).map(r => r.filledBy).concat(p.shadows.map(x => x.sid)))].filter(id => id !== (m && m.id));
    crew.forEach(id => notify(id, "update", `${p.title} has wrapped${early ? " early. The remaining shoot days are off the calendar" : ""}. Thanks for being on it. It's now a credit on your profile.`, p.id));
  }
  function moveToPost(p) { closeModal(); setView("post"); openPostFilmForm(null, p); }
  function unwrap(p) {
    confirmBox(`Undo the wrap on ${p.title}?`, p.unwrapShoots ? "The shoot days that came off the calendar go back on, and it returns to the Shoot board." : "It returns to the Shoot board until its last shoot day has passed.", "Undo wrap", () => {
      delete p.wrapped; if (p.unwrapShoots) { p.shoots = p.unwrapShoots; delete p.unwrapShoots; }
      closeModal(); render(); toast(`${p.title} is back on the Shoot board`);
    }, false);
  }

  // ---------- MY SHOOTS ----------
  function renderMine() {
    const m = me(), root = $("#view-mine");
    const running = S.projects.filter(p => runs(p, m) && !isPast(p));
    const active = running.filter(p => !p.archived), archived = running.filter(p => p.archived);
    const myReqs = S.requests.filter(q => q.sid === m.id && q.status !== "withdrawn" && project(q.pid)).sort((a, b) => b.at.localeCompare(a.at));
    const onShoots = live().filter(p => onProject(p, m.id) && !isPast(p) && !runs(p, m)).sort((a, b) => a.shoots[0].from.localeCompare(b.shoots[0].from));
    const myInv = S.invites.filter(i => i.by === m.id);
    const canInvite = isLfs(m.email);
    const runCard = p => { const w = S.requests.filter(q => q.pid === p.id && q.status === "pending").length, o = openRoles(p).length, d0 = projDays(p)[0];
      return `<li class="ms-row" style="--c:${projColor(p)}"><button class="ms-t link-btn" data-proj="${p.id}">${esc(p.title)}</button>
        <span class="ms-m">${p.shoots.map(fmtRange).join(" + ")} · call ${dayInfo(p, d0).call}</span>
        <span class="ms-s">${w ? `<span class="st st-pending">${w} request${w > 1 ? "s" : ""} waiting</span>` : ""}<span class="st">${o ? `${o} open` : "Crewed"}</span></span>
        <span class="ms-a">${p.archived ? `<button class="btn btn-ghost btn-xs" data-restore="${p.id}">Restore</button>` : `<button class="btn btn-ghost btn-xs" data-proj="${p.id}">${w ? "Review" : "Open"}</button><button class="btn btn-quiet btn-xs" data-editp="${p.id}">Edit</button>${started(p) ? `<button class="btn btn-quiet btn-xs" data-wrapp="${p.id}">Wrap shoot</button>` : ""}`}</span></li>`; };
    const wrappedMine = S.projects.filter(p => runs(p, m) && !p.archived && isPast(p) && !S.releases.some(r => r.pid === p.id)).sort((a, b) => (b.wrapped || b.shoots[b.shoots.length - 1].to).localeCompare(a.wrapped || a.shoots[a.shoots.length - 1].to)).slice(0, 6);
    const wrapCard = p => `<li class="ms-row" style="--c:${projColor(p)}"><button class="ms-t link-btn" data-proj="${p.id}">${esc(p.title)}</button><span class="ms-m">Wrapped ${fmtDay(p.wrapped || p.shoots[p.shoots.length - 1].to)}</span><span class="ms-a">${postOf(p) ? `<button class="btn btn-ghost btn-xs" data-inpostp="${p.id}">Open in Post</button>` : `<button class="btn btn-accent btn-xs" data-topostp="${p.id}">Move to Post</button>`}</span></li>`;
    root.innerHTML = `
      <div class="view-head"><h1 class="page-title">My shoots</h1><p class="muted">Projects you run, requests you've sent and shoots you're locked on.</p>
        <div class="ms-actions"><button class="btn btn-accent btn-sm" data-action="post">Post a shoot</button><button class="btn btn-ghost btn-sm" id="msSync">Sync to Outlook or another calendar</button></div></div>
      <div class="ms-grid">
        <section class="panel"><h2 class="panel-h">Projects I run <span class="count">${active.length}</span></h2>
          ${active.length ? `<ul class="ms-list">${active.map(runCard).join("")}</ul>` : `<p class="empty-sm">You're not producing or directing anything yet.</p>`}
          ${wrappedMine.length ? `<h3 class="panel-sub">Wrapped</h3><ul class="ms-list">${wrappedMine.map(wrapCard).join("")}</ul>` : ""}
          ${archived.length ? `<h3 class="panel-sub">Archived</h3><ul class="ms-list">${archived.map(runCard).join("")}</ul>` : ""}</section>
        <section class="panel"><h2 class="panel-h">Shoots I'm on <span class="count">${onShoots.length}</span></h2>
          ${onShoots.length ? `<ul class="ms-list">${onShoots.map(p => { const r = p.roles.find(x => x.filledBy === m.id), sh = p.shadows.find(x => x.sid === m.id), d0 = projDays(p).find(d => d >= TODAY) || projDays(p)[0], inf = dayInfo(p, d0);
            return `<li class="ms-row" style="--c:${projColor(p)}"><button class="ms-t link-btn" data-proj="${p.id}">${esc(p.title)}</button><span class="ms-m">${r ? esc(r.role) : `Shadow · ${esc(sh.role)}`} · ${fmtDay(d0)}, call ${inf.call}</span><span class="ms-m">${esc(locName(p, inf.loc))}</span></li>`; }).join("")}</ul>` : `<p class="empty-sm">Not locked on any shoots yet. Requests that get accepted land here.</p>`}</section>
        <section class="panel"><h2 class="panel-h">My requests <span class="count">${myReqs.length}</span></h2>
          ${myReqs.length ? `<ul class="ms-list">${myReqs.map(q => { const p = project(q.pid); return `<li class="ms-row" style="--c:${projColor(p)}"><button class="ms-t link-btn" data-proj="${p.id}">${esc(p.title)}</button><span class="ms-m">${q.type === "shadow" ? "Shadow · " : ""}${esc(q.role)} · sent ${ago(q.at).toLowerCase()}</span><span class="ms-s">${statusChip(q)}</span>${q.status === "pending" ? `<span class="ms-a"><button class="btn btn-quiet btn-xs" data-wd="${q.id}">Withdraw</button></span>` : ""}</li>`; }).join("")}</ul>` : `<p class="empty-sm">No requests yet. Open a project and tap Request to join.</p>`}</section>
        <section class="panel"><h2 class="panel-h">Invite someone</h2>
          ${canInvite ? `<p class="muted small">For people without an LFS email, like freelance HMU artists or actors. They can sign in once with the email you invite.</p>
          <form id="invForm" class="inv-form"><input type="email" name="email" required placeholder="their@email.com" aria-label="Email to invite"><button class="btn btn-ghost btn-sm" type="submit">Send invite</button></form><p class="form-err" id="invErr" role="alert"></p>
          ${myInv.length ? `<ul class="inv-list">${myInv.map(i => `<li><span>${esc(i.email)}</span><span class="st ${i.status === "joined" ? "st-ok" : "st-pending"}">${i.status === "joined" ? "Joined" : "Invited"}</span></li>`).join("")}</ul>` : ""}`
          : `<p class="muted small">Only members with an LFS email can invite people. You joined as a guest${m.invitedBy && student(m.invitedBy) ? ` thanks to ${esc(student(m.invitedBy).name)}` : ""}.</p>`}</section>
      </div>`;
    bindOpeners(root);
    root.querySelectorAll("[data-editp]").forEach(b => b.addEventListener("click", () => openPostForm(project(b.dataset.editp))));
    root.querySelectorAll("[data-restore]").forEach(b => b.addEventListener("click", () => { project(b.dataset.restore).archived = false; toast("Restored"); renderMine(); }));
    root.querySelectorAll("[data-wrapp]").forEach(b => b.addEventListener("click", () => openWrap(project(b.dataset.wrapp))));
    root.querySelectorAll("[data-topostp]").forEach(b => b.addEventListener("click", () => moveToPost(project(b.dataset.topostp))));
    root.querySelectorAll("[data-inpostp]").forEach(b => b.addEventListener("click", () => { setView("post"); openPostItem(postOf(project(b.dataset.inpostp)).id); }));
    root.querySelectorAll("[data-wd]").forEach(b => b.addEventListener("click", () => { S.requests.find(q => q.id === b.dataset.wd).status = "withdrawn"; toast("Request withdrawn"); renderMine(); }));
    $("#msSync").addEventListener("click", openSync);
    const inv = $("#invForm");
    if (inv) inv.addEventListener("submit", e => { e.preventDefault(); const r = invite(e.target.email.value); if (r) $("#invErr").textContent = r; else renderMine(); });
  }
  function invite(raw) {
    const e = raw.trim().toLowerCase(), m = me();
    if (isLfs(e)) return "LFS addresses don't need an invite. They can sign in straight away.";
    if (S.students.some(s => s.email.toLowerCase() === e)) return "That person is already on Crew Call.";
    if (S.invites.some(i => i.email === e)) return "That email has already been invited.";
    S.invites.unshift({ email: e, by: m.id, at: TODAY, status: "pending" });
    toast(`Invite emailed to ${e}`); return "";
  }

  // ---------- LANGUAGES: open sources for translations ----------
  // Wikidata (CC0) has names for film roles in many languages. Crew Call asks it when an admin adds a role,
  // or when they press Look up. Nothing is used until an admin checks it.
  const WD_LANGS = { "zh-Hant": ["zh-hant", "zh-tw", "zh-hk"], "zh-Hans": ["zh-hans", "zh-cn", "zh"], fr: ["fr"], es: ["es"], ru: ["ru"], ar: ["ar"], hi: ["hi"], pt: ["pt-br", "pt"] };
  const transLangs = () => (window.CCLang ? CCLang.langs.filter(l => l.code !== "en") : []);
  const langLabel = c => (transLangs().find(l => l.code === c) || { label: c }).label;
  const capFirst = (t, c) => !t || /^zh|^ar/.test(c) ? t : t.charAt(0).toLocaleUpperCase(c) + t.slice(1);
  async function wikidataLookup(term) {
    const api = "https://www.wikidata.org/w/api.php?format=json&origin=*&";
    const sr = await fetch(api + `action=wbsearchentities&type=item&language=en&uselang=en&limit=6&search=${encodeURIComponent(term)}`).then(r => r.json());
    const ids = (sr.search || []).map(x => x.id); if (!ids.length) return [];
    const codes = [...new Set(["en", ...Object.values(WD_LANGS).flat()])].join("|");
    const ent = await fetch(api + `action=wbgetentities&props=labels|descriptions&languages=${codes}&ids=${ids.join("|")}`).then(r => r.json());
    return ids.map(id => { const e = (ent.entities || {})[id] || {}, L = e.labels || {}, labels = {};
      Object.entries(WD_LANGS).forEach(([c, ks]) => { const k = ks.find(x => L[x]); labels[c] = k ? capFirst(L[k].value, c) : ""; });
      return { id, label: (L.en || {}).value || id, desc: ((e.descriptions || {}).en || {}).value || "", labels, url: `https://www.wikidata.org/wiki/${id}` }; })
      .filter(x => Object.values(x.labels).some(Boolean));
  }
  // LibreTranslate is open source and can run on a free server. If an admin sets one up, it drafts missing words.
  async function libreDraft(text, target) {
    const url = (S.settings.ltUrl || "").replace(/\/$/, ""); if (!url) throw new Error("no server");
    const r = await fetch(url + "/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: text, source: "en", target: target === "zh-Hant" ? "zt" : target === "zh-Hans" ? "zh" : target, format: "text" }) }).then(x => x.json());
    return r.translatedText || "";
  }
  function saveWords(en, by, why) {
    const clean = {}; Object.entries(by).forEach(([c, v]) => { v = (v || "").trim(); if (v) clean[c] = v; });
    if (!Object.keys(clean).length) return 0;
    S.customWords[en] = Object.assign(S.customWords[en] || {}, clean);
    if (window.CCLang) CCLang.addWords({ [en]: clean });
    logAdmin(`${why || "Updated translations"} for "${en}" (${Object.keys(clean).map(langLabel).join(", ")})`);
    return Object.keys(clean).length;
  }
  // a role added in Admin: look it up on Wikidata in the background and leave suggestions for an admin to check
  async function suggestRoleWords(role) {
    try {
      const hits = await wikidataLookup(role); const h = hits[0]; if (!h) return 0;
      let n = 0; Object.entries(h.labels).forEach(([c, v]) => { if (v && !(window.CCLang && CCLang.lookup(role)[c])) { S.transFixes.unshift({ id: uid("tf"), en: role, lang: c, now: "", better: v, by: null, source: "Wikidata", ref: h.url, at: TODAY, status: "open" }); n++; } });
      if (n && adminTab === "langs" && $("#view-admin") && !$("#view-admin").hidden) renderAdmin();
      return n;
    } catch (e) { return 0; }
  }
  function openWikidata(role) {
    openModal(`<h2 id="modalTitle" class="m-title">Translate "${esc(role)}"</h2><p class="muted small">Looking it up on Wikidata, the free knowledge base anyone can use (CC0).</p><div id="wdBody"><p class="empty-sm">Searching…</p></div>`);
    const now = window.CCLang ? CCLang.lookup(role) : {};
    const form = (h) => `<form id="wdForm" class="stack">${h ? `<p class="small">Using <a href="${esc(h.url)}" target="_blank" rel="noopener">${esc(h.label)}</a>${h.desc ? ` <span class="muted">· ${esc(h.desc)}</span>` : ""}</p>` : `<p class="muted small">Nothing on Wikidata. Type the translations yourself, or ask a student who speaks the language.</p>`}
      ${transLangs().map(l => `<label class="field"><span>${esc(l.label)}${now[l.code] ? ` <span class="muted small" data-noi18n>· now: ${esc(now[l.code])}</span>` : ""}</span><input name="${l.code}" lang="${l.code}" dir="${l.code === "ar" ? "rtl" : "ltr"}" value="${esc(now[l.code] || (h && h.labels[l.code]) || "")}" data-noi18n></label>`).join("")}
      <p class="muted small">Check film terms with someone who works in that language. Wikidata's name for a job isn't always what crews say on set.</p>
      <div class="form-actions"><button class="btn btn-accent">Save translations</button><button class="btn btn-ghost" type="button" data-close>Cancel</button></div></form>`;
    const bindForm = () => $("#wdForm").addEventListener("submit", e => { e.preventDefault(); const by = {}; transLangs().forEach(l => { const v = e.target[l.code].value.trim(); if (v && v !== now[l.code]) by[l.code] = v; }); const n = saveWords(role, by, "Translated a role"); closeModal(); toast(n ? `Saved ${n} translation${n === 1 ? "" : "s"} for ${role}` : "Nothing changed"); renderAdmin(); });
    wikidataLookup(role).then(hits => {
      const b = $("#wdBody"); if (!b) return;
      b.innerHTML = (hits.length > 1 ? `<label class="field"><span>Which meaning?</span><select id="wdPick">${hits.map((h, i) => `<option value="${i}">${esc(h.label)}${h.desc ? ` · ${esc(h.desc)}` : ""}</option>`).join("")}</select></label>` : "") + `<div id="wdF">${form(hits[0])}</div>`;
      bindForm();
      const pk = $("#wdPick"); if (pk) pk.addEventListener("change", () => { $("#wdF").innerHTML = form(hits[+pk.value]); bindForm(); });
    }).catch(() => { const b = $("#wdBody"); if (b) { b.innerHTML = `<p class="note-box">Couldn't reach Wikidata. Check the connection, or type the translations yourself.</p>${form(null)}`; bindForm(); } });
  }
  // anyone signed in can suggest a better translation; it goes to admins with the Terms and lists permission
  // where someone is in the app, in English, so admins can find the words
  const VIEW_NAMES = { calendar: "Calendar", projects: "Shoot", scripts: "Develop", post: "Post", release: "Release", paid: "Paid", crew: "Crew", mine: "My shoots", me: "My profile", admin: "Admin", about: "About", gate: "Sign-in page" };
  const ADMIN_NAMES = { home: "Overview", access: "Access", handover: "Handover", projects: "Projects", reports: "Reports", news: "Newsletter", langs: "Languages", terms: "Terms and cohorts", lists: "Lists", email: "Email", privacy: "Privacy and data", activity: "Activity" };
  const pageName = () => { let n = VIEW_NAMES[view] || view; if (view === "admin") n += ", " + (ADMIN_NAMES[adminTab] || adminTab); return n; };
  function spotOf(el) {
    const modalOpen = !$("#modal").hidden && el && el.closest("#modal");
    const sec = el && el.closest("section, .panel, .modal-box, article, li, form");
    const h = sec && sec.querySelector("h1, h2, h3, .panel-h, .m-title");
    const head = h ? (h.getAttribute("data-en") || (window.CCLang && CCLang.english(h.textContent.trim(), CCLang.get())) || h.textContent.trim()) : "";
    return { page: pageName() + (modalOpen ? ", pop-up" : ""), where: head.slice(0, 80) };
  }
  // the floating "Wrong word?" button: tap it, then tap the words on the page
  let picking = false;
  const fixBtn = document.createElement("button");
  fixBtn.type = "button"; fixBtn.className = "fix-word"; fixBtn.id = "fixWord"; fixBtn.hidden = true;
  fixBtn.innerHTML = `<span aria-hidden="true">Aa</span> Wrong word?`;
  const pickBar = document.createElement("div");
  pickBar.className = "pick-bar"; pickBar.hidden = true; pickBar.setAttribute("role", "status");
  pickBar.innerHTML = `<span>Tap the words that look wrong.</span><button type="button" class="btn btn-ghost btn-sm" data-pickskip>Describe it instead</button><button type="button" class="btn btn-quiet btn-sm" data-pickstop>Cancel</button>`;
  document.body.append(fixBtn, pickBar);
  const showFix = () => { fixBtn.hidden = !(window.CCLang && CCLang.get() !== "en"); };
  document.addEventListener("cc:lang", showFix); setTimeout(showFix, 0);
  const stopPick = () => { picking = false; pickBar.hidden = true; document.body.classList.remove("picking"); $$(".pick-hover").forEach(x => x.classList.remove("pick-hover")); };
  fixBtn.addEventListener("click", e => { e.stopPropagation(); if (!me()) return openSignIn("Sign in to suggest a better translation."); if (!$("#modal").hidden) closeModal(); picking = true; pickBar.hidden = false; document.body.classList.add("picking"); });
  pickBar.addEventListener("click", e => { e.stopPropagation(); if (e.target.closest("[data-pickstop]")) stopPick(); if (e.target.closest("[data-pickskip]")) { const at = spotOf(null); stopPick(); openTransFix({ page: at.page }); } });
  const pickable = t => t && !t.closest(".pick-bar, .fix-word") && t.closest("body");
  document.addEventListener("mouseover", e => { if (!picking) return; $$(".pick-hover").forEach(x => x.classList.remove("pick-hover")); if (pickable(e.target)) e.target.classList.add("pick-hover"); }, true);
  document.addEventListener("click", e => {
    if (!picking || !pickable(e.target)) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    const el = e.target, sel = (window.getSelection && String(window.getSelection())).trim();
    const raw = (sel || (el.value && el.tagName === "INPUT" ? el.placeholder || el.value : "") || el.innerText || el.getAttribute("aria-label") || el.getAttribute("placeholder") || "").trim().replace(/\s+/g, " ").slice(0, 200);
    const at = spotOf(el); stopPick(); openTransFix({ now: raw, page: at.page, where: at.where });
  }, true);
  document.addEventListener("keydown", e => { if (picking && e.key === "Escape") stopPick(); });

  function openTransFix(pre = {}) {
    const m = me(); if (!m) return openSignIn("Sign in to suggest a better translation.");
    const cur = window.CCLang ? CCLang.get() : "en";
    const spot = pre.page || pageName();
    openModal(`<h2 id="modalTitle" class="m-title">Suggest a better translation</h2>
      <p class="muted">Thank you. An admin checks it and it changes for everyone.</p>
      <p class="tf-spot small"><b>Page</b> <span data-noi18n>${esc(spot)}${pre.where ? ` · ${esc(pre.where)}` : ""}</span></p>
      <form id="tfForm" class="stack">
        <label class="field"><span>Language</span><select name="lang">${transLangs().map(l => `<option value="${l.code}" ${l.code === cur ? "selected" : ""} data-noi18n>${esc(l.label)}</option>`).join("")}</select></label>
        <label class="field"><span>What it says now</span><input name="now" required maxlength="200" placeholder="Copy the words from the page" value="${esc(pre.now || "")}" data-noi18n></label>
        <label class="field"><span>What it should say</span><input name="better" required maxlength="200" data-noi18n></label>
        <label class="field"><span>Why, optional</span><input name="why" maxlength="200" placeholder="e.g. On set we say…"></label>
        <div class="form-actions"><button class="btn btn-accent">Send</button><button class="btn btn-ghost" type="button" data-close>Cancel</button></div>
      </form>`);
    if (pre.now) setTimeout(() => $("#tfForm") && $("#tfForm").better.focus(), 30);
    $("#tfForm").addEventListener("submit", e => { e.preventDefault(); const f = e.target, lang = f.lang.value, now = f.now.value.trim();
      const en = (window.CCLang && CCLang.english(now, lang)) || "";
      S.transFixes.unshift({ id: uid("tf"), en, lang, now, better: f.better.value.trim(), why: f.why.value.trim(), by: m.id, source: "Member", page: spot, where: pre.where || "", at: TODAY, status: "open" });
      S.admins.forEach(id => id !== m.id && can("langs", student(id)) && notify(id, "update", `New translation suggestion for ${langLabel(lang)}. Open Admin, then Languages.`));
      closeModal(); drawHeader(); toast("Suggestion sent to the admins. Thank you."); });
  }
  document.addEventListener("click", e => { if (e.target.closest("[data-transfix]")) { const lm = document.getElementById("langMenu"); if (lm) lm.hidden = true; openTransFix(); } });

  // ---------- ADMIN ----------
  let adminTab = "home", openCourse = null;
  // Admin is grouped: Overview first, then people, content, the school calendar, and settings and data
  const ADMIN_GROUPS = [
    ["", [["home", "Overview"]]],
    ["People", [["access", "Access"], ["handover", "Handover"]]],
    ["Content", [["projects", "Projects", "projects"], ["reports", "Reports", "safety"], ["newsletter", "Newsletter", "news"], ["langs", "Languages", "langs"]]],
    ["School calendar", [["terms", "Terms and cohorts", "setup"], ["lists", "Lists", "setup"]]],
    ["Settings and data", [["email", "Email"], ["privacy", "Privacy and data", "safety"], ["log", "Activity"]]]
  ];
  const ADMIN_TABS = ADMIN_GROUPS.flatMap(g => g[1]);
  const HANDOVER_STEPS = [
    ["In the app", [
      ["a1", "Choose two successors, ideally from the intake below yours, so someone is always still at school. Make them admins.", "access"],
      ["a2", "Tick the permissions each successor needs. Give at least one of them every permission.", "access"],
      ["a3", "Make sure every cohort has a rep, then transfer ownership to one of them (ideally a rep from a younger cohort).", "access"],
      ["a4", "Check the help address and school mass email alias are still right.", "email"]
    ]],
    ["The accounts (outside the app)", [
      ["b1", "GitHub: invite the new owner to the Crew Call organisation as an Owner (organisation, then People). Add the reps as members. Wait until they accept before you leave."],
      ["b2", "Supabase: invite the new owner to the Crew Call organisation as Owner, and the reps as Developer or Admin (organisation, then Team). An organisation always needs one Owner, so invite first, then leave."],
      ["b3", "Email sender: if you set up a sending-only login (Brevo, or a Gmail used just for sending), move it to the new owner and put the new SMTP password into Supabase (Authentication, then Emails, then SMTP settings). Nobody signs in with it."],
      ["b4", "Share the new logins through a shared password manager folder, not by email or WhatsApp."]
    ]],
    ["Before you go", [
      ["c1", "Export a backup and keep it somewhere the course team can reach.", "export"],
      ["c2", "Check next year's term dates against the LFS key dates page.", "terms"],
      ["c3", "Once your successors have signed in, remove graduating admins, including yourself."],
      ["c4", "Check the nightly backups in GitHub Actions are green, and that the next owner can see them."],
      ["c5", "Check there are no open reports, and that the LFS safety contact is written in the notes below.", "reports"],
      ["c6", "Write anything the next owner should know in the notes below."]
    ]]
  ];
  const lockedPanel = label => `<section class="panel span-2 locked-panel"><h2 class="panel-h">View only</h2><p class="muted">You don't have the ${esc(label)} permission. Ask ${esc(student(S.owner).name)} (owner) or an admin with the People permission to tick it for you.</p></section>`;
  const exportData = () => download("crew-call-backup.json", JSON.stringify({ exported: TODAY, owner: S.owner, admins: S.admins, adminPerms: S.adminPerms, settings: S.settings, handover: S.handover, lists: C, termDates: C.TERM_DATES, students: S.students, projects: S.projects, requests: S.requests, invites: S.invites, scripts: S.scripts, scriptInterest: S.scriptInterest, releases: S.releases, releaseInterest: S.releaseInterest, posts: S.posts, postInterest: S.postInterest, funds: S.funds, gigs: S.gigs, gigApps: S.gigApps, reps: S.reps, reports: S.reports, newsletters: S.newsletters, nlAuto: S.nlAuto, ownerProposal: S.ownerProposal, adminVia: S.adminVia, adminLog: S.adminLog, courses: C.COURSES }, null, 2), "application/json");

  // ---------- NEWSLETTER (Admin > Newsletter) ----------
  // Two levels: "news" can design, save and ask for approval; "send" can approve, schedule and send.
  // The owner has both. With "newsSecond" on, a sender can't approve a newsletter they wrote or last edited.
  let nlOpen = null, nlWidth = "desk", nlViewer = null, nlMode = "designed";
  const NL_BLOCKS = [["heading", "Heading"], ["text", "Text"], ["image", "Image"], ["button", "Button"], ["divider", "Divider"], ["auto:roles", "Open roles"], ["auto:shoots", "Upcoming shoots"], ["auto:develop", "Develop posts"], ["auto:release", "Release films"], ["auto:paid", "Paid work"]];
  const NL_AUTO = { roles: "Open roles", shoots: "Upcoming shoots", develop: "Develop posts", release: "Release films", paid: "Paid work" };
  const NL_STATUS = { draft: ["Draft", "st-pending"], review: ["Waiting for approval", "st-warn"], scheduled: ["Scheduled", "st-ok"], sent: ["Sent", "st-ok"] };
  const nlFind = id => S.newsletters.find(n => n.id === id);
  const nlHolders = perm => S.admins.map(student).filter(a => a && can(perm, a));
  const nlAudiences = () => {
    const out = [["all", "Everyone on Crew Call"], ["lfs", "LFS students and staff (no guests)"]];
    C.COURSES.forEach(cr => out.push(["course:" + cr.id, cr.name]));
    const terms = [...new Set(S.students.filter(s => !s.guest && s.term).map(s => s.term))].filter(t => /^Term \d$|^Graduation term$/.test(t)).sort();
    terms.forEach(t => out.push(["term:" + t, t + " (MA Filmmaking)"]));
    const cohorts = [...new Set(S.students.filter(s => s.cohort && s.term !== "Alumni").map(s => s.cohort))].sort();
    cohorts.forEach(c => out.push(["cohort:" + c, "Cohort " + c]));
    out.push(["alumni", "Alumni"]);
    if (S.settings.schoolAlias) out.push(["alias", "School mass email alias (" + S.settings.schoolAlias + ")"]);
    return out;
  };
  const nlAudLabel = a => (nlAudiences().find(x => x[0] === a) || [a, a === "alias" ? "the school mass email alias" : a])[1];
  function nlRecipients(a) {
    const ms = S.students.filter(s => !s.incomplete && !s.hidden && notifyOf(s).news !== false);
    if (a === "all") return ms;
    if (a === "lfs") return ms.filter(s => !s.guest);
    if (a === "alumni") return ms.filter(s => s.term === "Alumni");
    if (a === "alias") return [];
    const [k, v] = a.split(":");
    if (k === "course") return ms.filter(s => s.course === v || (!s.course && v === "MAF" && !s.guest && /^Term|^Graduation/.test(s.term || "")));
    if (k === "term") return ms.filter(s => s.term === v);
    if (k === "cohort") return ms.filter(s => s.cohort === v);
    return [];
  }
  const nlCount = a => a === "alias" ? "everyone on the school list" : `${nlRecipients(a).length} ${nlRecipients(a).length === 1 ? "person" : "people"}`;
  function nlItems(b) {
    const n = Math.max(1, Math.min(6, +b.n || 3)), base = SITE;
    if (b.what === "roles") return live().filter(p => isActive(p) && openRoles(p).length).sort((a, c) => firstDay(a).localeCompare(firstDay(c))).slice(0, n)
      .map(p => ({ title: p.title, meta: `${p.shoots.map(fmtRange).join(" + ")} · ${locShort(p)}`, tags: [...new Set(openRoles(p).map(r => r.role))], url: base + "#p/" + p.id, color: projColor(p) }));
    if (b.what === "shoots") return live().filter(isActive).sort((a, c) => firstDay(a).localeCompare(firstDay(c))).slice(0, n)
      .map(p => ({ title: p.title, meta: `${p.type} · ${p.shoots.map(fmtRange).join(" + ")} · ${locShort(p)}`, tags: [], url: base + "#p/" + p.id, color: projColor(p) }));
    if (b.what === "develop") return S.scripts.filter(x => !x.hidden && x.status !== "closed").sort((a, c) => (c.posted || "").localeCompare(a.posted || "")).slice(0, n)
      .map(x => ({ title: x.title, meta: `${x.kind === "pitch" ? "Pitch" : "Script"} · ${x.type} · ${(student(x.by) || { name: "" }).name}`, tags: x.lookingFor || [], url: base + "#develop" }));
    if (b.what === "release") return S.releases.filter(x => !x.hidden && x.status !== "closed").slice(0, n)
      .map(x => ({ title: x.title, meta: `${x.type} · ${x.runtime} min${x.deadline ? " · deadline " + fmtFull(x.deadline) : ""}`, tags: x.needs.filter(nd => !x.attached.some(a => a.need === nd)), url: base + "#release" }));
    if (b.what === "paid") return S.gigs.filter(g => !g.hidden && gigOpen(g)).sort((a, c) => gigFirst(a).localeCompare(gigFirst(c))).slice(0, n)
      .map(g => ({ title: g.title, meta: `${g.rate} · ${g.dates.length ? g.dates.map(fmtRange).join(" + ") : "Dates to agree"} · ${g.loc}${g.deadline ? " · apply by " + fmtFull(g.deadline) : ""}`, tags: g.roles, url: base + "#paid" }));
    return [];
  }
  // ----- versions and the automatic edition -----
  const NL_KEYS = ["subject", "preheader", "issue", "audience", "signoff", "blocks"];
  const nlSnap = (nl, why) => { nl.versions = nl.versions || []; nl.versions.unshift({ at: TODAY, by: me().id, why, data: JSON.parse(JSON.stringify(Object.fromEntries(NL_KEYS.map(k => [k, nl[k]])))) }); };
  const AUTO_KEYS = ["subject", "preheader", "heading", "intro", "signoff", "sections", "audience"];
  const autoSnap = why => { const a = S.nlAuto; a.versions.unshift({ at: TODAY, by: me().id, why, data: JSON.parse(JSON.stringify(Object.fromEntries(AUTO_KEYS.map(k => [k, a[k]])))) }); };
  const autoMonth = () => MON_LONG[D(TODAY).getUTCMonth()] + " " + D(TODAY).getUTCFullYear();
  const autoNl = (a = S.nlAuto) => ({ subject: (a.subject || "").replace("{month}", autoMonth()), preheader: a.preheader, issue: monYear(TODAY), audience: a.audience, signoff: a.signoff,
    blocks: [{ t: "heading", text: a.heading }, { t: "text", text: a.intro }, ...a.sections.filter(x => x.on).map(x => ({ t: "auto", what: x.what, n: x.n, title: x.title })), { t: "button", label: "Open Crew Call", url: SITE }] });
  function autoNext() {
    const a = S.nlAuto; if (!a.on) return null;
    const nextMon = d => { let x = d; while (D(x).getUTCDay() !== 1) x = addDays(x, 1); return x; };
    if (a.freq === "fortnightly") { let x = nextMon(addDays(a.lastSent || TODAY, 14)); while (x <= TODAY) x = addDays(x, 14); return x; }
    const d = D(TODAY), y = d.getUTCMonth() === 11 ? d.getUTCFullYear() + 1 : d.getUTCFullYear(), mo = (d.getUTCMonth() + 1) % 12;
    return nextMon(`${y}-${String(mo + 1).padStart(2, "0")}-01`);
  }
  function nlVersionsHtml(list, mayRestore) {
    if (!list || !list.length) return `<p class="small muted">No saved versions yet. A version is saved when you ask for approval, when it's sent, and whenever you press Save version.</p>`;
    return `<ul class="nl-vers">${list.map((v, i) => `<li><span><b>${fmtFull(v.at)}</b> · ${esc(v.why)} <span class="muted small">by ${esc(nlWho(v.by))}</span></span><span>${v.data ? `<button type="button" class="btn btn-quiet btn-xs" data-nlvview="${i}">View</button>${mayRestore ? `<button type="button" class="btn btn-quiet btn-xs" data-nlvback="${i}">Restore</button>` : ""}` : ""}</span></li>`).join("")}</ul>`;
  }
  function autoBody() {
    const a = S.nlAuto, ed = can("news"), dis = ed ? "" : "disabled", nx = autoNext();
    const f = (k, label, max, hint = "") => `<label class="field"><span>${label}${hint ? ` <small>${hint}</small>` : ""}</span><input data-auf="${k}" maxlength="${max}" value="${esc(a[k] || "")}" ${dis}></label>`;
    return `<section class="panel span-2 nl-editor">
      <div class="ho-top"><h2 class="panel-h">Automatic edition</h2><span class="st ${a.on ? "st-ok" : "st-pending"}">${a.on ? "On" : "Off"}</span></div>
      <p class="small muted">Crew Call builds this one itself from what's on the site: open roles, upcoming shoots, paid work and more. The design stays the same so every issue looks like Crew Call. You can change any heading and text.</p>
      <div class="nl-grid">
        <div class="nl-form">
          <div class="form-grid">
            <label class="toggle"><input type="checkbox" data-aus="on" ${a.on ? "checked" : ""} ${can("send") ? "" : "disabled"}> <span>Automatic edition on</span></label>
            <label class="field"><span>How often</span><select data-aus="freq" ${can("send") ? "" : "disabled"}><option value="monthly" ${a.freq === "monthly" ? "selected" : ""}>Monthly (first Monday)</option><option value="fortnightly" ${a.freq === "fortnightly" ? "selected" : ""}>Every two weeks (Monday)</option></select></label>
            <label class="field"><span>Send to</span><select data-aus="audience" ${can("send") ? "" : "disabled"}>${nlAudiences().map(([v, l]) => `<option value="${esc(v)}" ${v === a.audience ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
${LIVE ? "" : `<label class="toggle"><input type="checkbox" data-aus="autoSend" ${a.autoSend ? "checked" : ""} ${can("send") ? "" : "disabled"}> <span>Send it without asking</span></label>`}
          </div>
          <p class="small muted">${a.on ? `Next issue: ${fmtFull(nx)}. ${a.autoSend && !LIVE ? "It goes out by itself at 09:00." : `It's ready as a draft that morning and ${nlHolders("send").map(x => esc(first(x.name))).join(" or ")} gets a notification to check and send it.`}` : "Turned off. Nothing is built or sent."} ${can("send") ? "" : "Only admins with Newsletter: send can change these four settings."}</p>
          <h3 class="panel-sub">Words</h3>
          ${f("subject", "Subject line", 90, "{month} becomes the month")}${f("preheader", "Preview line", 140)}${f("heading", "Heading", 80)}
          <label class="field"><span>Intro</span><textarea rows="4" data-auf="intro" ${dis}>${esc(a.intro)}</textarea></label>
          <h3 class="panel-sub">Sections</h3>
          <ol class="nl-blocks">${a.sections.map((x, i) => `<li class="nl-block"><div class="nl-bh"><label class="toggle"><input type="checkbox" data-aux="${i}|on" ${x.on ? "checked" : ""} ${dis}> <b>${esc(NL_AUTO[x.what])}</b></label></div>
            <div class="nl-auto"><label class="field"><span>How many</span><select data-aux="${i}|n" ${dis}>${[1, 2, 3, 4, 5, 6].map(k => `<option value="${k}" ${+x.n === k ? "selected" : ""}>${k}</option>`).join("")}</select></label><label class="field"><span>Heading</span><input data-aux="${i}|title" value="${esc(x.title || "")}" placeholder="${esc(NL_AUTO[x.what])}" ${dis}></label></div></li>`).join("")}</ol>
          ${f("signoff", "Sign-off", 80)}
          ${ed ? `<p class="small muted">Changes save as you type.</p>` : `<p class="note-box">View only. You need the Newsletter: draft permission to change the words.</p>`}
        </div>
        <div class="nl-prev">
          <div class="nl-prev-h"><b>This month's issue, live</b><div class="seg-btn" role="group" aria-label="Preview size"><button type="button" class="${nlWidth === "desk" ? "on" : ""}" data-nlw="desk" aria-pressed="${nlWidth === "desk"}">Computer</button><button type="button" class="${nlWidth === "phone" ? "on" : ""}" data-nlw="phone" aria-pressed="${nlWidth === "phone"}">Phone</button></div></div>
          <iframe id="nlFrame" class="nl-frame ${nlWidth}" title="Automatic newsletter preview" sandbox="" data-noi18n></iframe>
        </div>
      </div>
      <div class="nl-acts">${ed ? `<button type="button" class="btn btn-ghost btn-sm" id="auTest">Send me a test</button>` : ""}${can("send") ? `<button type="button" class="btn btn-accent btn-sm" id="auSend">Send now</button>` : ""}${ed ? `<button type="button" class="btn btn-ghost btn-sm" id="auCopy">Make an editable copy</button><button type="button" class="btn btn-quiet btn-sm" id="auSave">Save version</button>` : ""}</div>
      <h3 class="panel-sub">Versions</h3>${nlVersionsHtml(a.versions, ed)}
      <p class="small muted">Last sent ${a.lastSent ? fmtFull(a.lastSent) : "never"}.</p>
    </section>`;
  }
  // live: the email server picks these up (see supabase/functions/crewcall). The finished email is stored with the issue.
  const mailOut = (nl, after) => { if (LIVE) nl.mail = { html: nlHtml(nl), after: after || null, state: "queued", at: new Date().toISOString() }; };
  const mailTest = (holder, x, m) => { if (LIVE) holder.test = { html: nlHtml(x), subject: x.subject, to: m.id, at: new Date().toISOString() }; };
  function nlHtml(nl) {
    const blocks = nl.blocks.map(b => b.t === "auto" ? Object.assign({}, b, { items: nlItems(b), title: b.title || NL_AUTO[b.what] }) : b);
    return window.CrewCallNewsletter({ subject: nl.subject, preheader: nl.preheader, issueLabel: nl.issue, blocks, signoff: nl.signoff, audienceLabel: nlAudLabel(nl.audience),
      links: { app: SITE, settings: SITE + "#me/notifications", unsubscribe: SITE + "#me/notifications" } });
  }
  const nlWho = id => { const s = student(id); return s ? s.name : "Former member"; };
  // can this person approve and send this newsletter?
  const nlMaySend = (nl, m = me()) => can("send", m) && !(S.settings.newsSecond && (nl.createdBy === m.id || nl.editedBy === m.id) && nlHolders("send").length > 1);
  const nlMayEdit = nl => can("news") && (nl.status === "draft" || nl.status === "review");

  function newsletterBody() {
    if (nlViewer !== S.meId) { nlViewer = S.meId; nlOpen = null; }
    const drafters = nlHolders("news"), senders = nlHolders("send"), owner = student(S.owner);
    const nameList = list => list.length ? list.map(a => `${esc(a.name)}${a.id === S.owner ? ` <span class="tag-admin">Owner</span>` : ""}`).join(", ") : `<span class="muted">Nobody yet</span>`;
    const who = `<section class="panel span-2 nl-who"><h2 class="panel-h">Who controls the newsletter</h2>
      <div class="nl-levels">
        <div><h3 class="panel-sub">Newsletter: draft</h3><p class="small muted">Design newsletters, save drafts, send a test to yourself and ask for approval.</p><p>${nameList(drafters)}</p></div>
        <div><h3 class="panel-sub">Newsletter: send</h3><p class="small muted">Approve, schedule and send to everyone or a chosen group.</p><p>${nameList(senders)}</p></div>
        <div><h3 class="panel-sub">Second approval</h3><p class="small muted">When this is on, the person who wrote or last edited a newsletter can't also send it, as long as another admin can.</p>
          <label class="toggle"><input type="checkbox" id="nlSecond" ${S.settings.newsSecond ? "checked" : ""} ${isOwner() ? "" : "disabled"}> <span>Needs a second admin to send</span></label>
          ${isOwner() ? "" : `<p class="small muted">Only ${esc(first(owner.name))} (owner) can change this.</p>`}</div>
      </div>
      <p class="small muted">${can("people") ? `Change who has each level in <button type="button" class="link-btn" data-atab="access">Access</button>.` : `Admins with the People permission choose who has each level, in Access.`} Every admin can read newsletters and the history.</p></section>`;
    const nl = nlOpen && nlFind(nlOpen);
    if (!nl) {
      const rows = S.newsletters.map(n => { const [lbl, cls] = NL_STATUS[n.status];
        const meta = n.status === "sent" ? `Sent ${fmtFull(n.sentAt)} by ${esc(nlWho(n.sentBy))} to ${n.recipients == null ? "the school list" : n.recipients + (n.recipients === 1 ? " person" : " people")}${n.approvedBy && n.approvedBy !== n.sentBy ? ` · approved by ${esc(nlWho(n.approvedBy))}` : ""}${n.mail && n.mail.state === "queued" && n.status === "sent" ? " · being emailed now" : ""}`
          : n.status === "scheduled" ? `Scheduled for ${fmtFull(n.schedDate)} at ${esc(n.schedTime)} · approved by ${esc(nlWho(n.approvedBy))}`
          : n.status === "review" ? `Asked by ${esc(nlWho(n.submittedBy))} on ${fmtFull(n.submittedAt)}` : `Drafted by ${esc(nlWho(n.createdBy))}`;
        return `<li class="nl-row"><div><button type="button" class="link-btn nl-t" data-nlopen="${n.id}">${esc(n.subject || "Untitled newsletter")}</button><span class="muted small">${esc(nlAudLabel(n.audience))} · ${meta}</span></div><span class="st ${cls}">${lbl}</span></li>`; }).join("");
      const mode = `<div class="seg-btn nl-mode" role="group" aria-label="Newsletter type"><button type="button" class="${nlMode === "designed" ? "on" : ""}" data-nlmode="designed" aria-pressed="${nlMode === "designed"}">Designed issues</button><button type="button" class="${nlMode === "auto" ? "on" : ""}" data-nlmode="auto" aria-pressed="${nlMode === "auto"}">Automatic</button></div>`;
      if (nlMode === "auto") return who + `<div class="span-2">${mode}</div>` + autoBody();
      return who + `<div class="span-2">${mode}</div><section class="panel span-2"><div class="ho-top"><h2 class="panel-h">Newsletters <span class="count">${S.newsletters.length}</span></h2>${can("news") ? `<button class="btn btn-accent btn-sm" id="nlNew">New newsletter</button>` : ""}</div>
        ${can("news") ? "" : `<p class="note-box">View only. You need the Newsletter: draft permission to design one.</p>`}
        ${S.newsletters.length ? `<ul class="nl-list">${rows}</ul>` : `<p class="empty-sm">No newsletters yet.</p>`}
        <p class="small muted">${LIVE ? `Emails go from ${esc(S.settings.senderEmail || "the sending address in Email settings")} within about 10 minutes of sending, once the email server is set up (SETUP.md, step 10). People can turn the newsletter off in My profile.` : `Demo: nothing is really emailed here. In the live app, sends go from ${esc(S.settings.senderEmail || "the sending address in Email settings")} and people can turn the newsletter off in My profile.`}</p></section>`;
    }
    const edit = nlMayEdit(nl), dis = edit ? "" : "disabled", [lbl, cls] = NL_STATUS[nl.status];
    const blockForm = (b, i) => {
      const name = b.t === "auto" ? NL_AUTO[b.what] : (NL_BLOCKS.find(x => x[0] === b.t) || [0, b.t])[1];
      const f = (k, label, type = "text", ph = "") => `<label class="field"><span>${label}</span><input ${type === "url" ? `inputmode="url" autocapitalize="off" spellcheck="false"` : `type="${type}"`} data-nlb="${i}|${k}" value="${esc(type === "url" ? shortUrl(b[k] || "") : b[k] || "")}" placeholder="${esc(ph)}" ${dis}></label>`;
      let inner = "";
      if (b.t === "heading") inner = f("text", "Heading");
      if (b.t === "text") inner = `<label class="field"><span>Text</span><textarea rows="4" data-nlb="${i}|text" ${dis}>${esc(b.text || "")}</textarea></label><p class="small muted">Leave a blank line between paragraphs.</p>`;
      if (b.t === "image") inner = f("url", "Image link", "url", "example.com/picture.jpg") + f("alt", "Describe the image") + f("caption", "Caption") + f("link", "Opens when tapped", "url", "example.com");
      if (b.t === "button") inner = f("label", "Button text") + f("url", "Link", "url", "example.com");
      if (b.t === "auto") inner = `<div class="nl-auto"><label class="field"><span>How many</span><select data-nlb="${i}|n" ${dis}>${[1, 2, 3, 4, 5, 6].map(k => `<option value="${k}" ${+b.n === k ? "selected" : ""}>${k}</option>`).join("")}</select></label>${f("title", "Heading", "text", NL_AUTO[b.what])}</div><p class="small muted">Filled in from Crew Call when it's sent.</p>`;
      return `<li class="nl-block"><div class="nl-bh"><b>${esc(name)}</b>${edit ? `<span class="nl-bacts"><button type="button" class="btn btn-quiet btn-xs" data-nlmove="${i}|-1" aria-label="Move ${esc(name)} up" ${i === 0 ? "disabled" : ""}>↑</button><button type="button" class="btn btn-quiet btn-xs" data-nlmove="${i}|1" aria-label="Move ${esc(name)} down" ${i === nl.blocks.length - 1 ? "disabled" : ""}>↓</button><button type="button" class="btn btn-quiet btn-xs" data-nldel="${i}" aria-label="Remove ${esc(name)}">×</button></span>` : ""}</div>${inner}</li>`;
    };
    const m = me(), maySend = nlMaySend(nl, m);
    let acts = "";
    if (nl.status === "draft" || nl.status === "review") {
      if (can("news")) acts += `<button type="button" class="btn btn-ghost btn-sm" id="nlTest">Send me a test</button>`;
      if (nl.status === "draft" && can("news")) acts += `<button type="button" class="btn btn-ghost btn-sm" id="nlAsk">Ask for approval</button>`;
      if (maySend) acts += `<button type="button" class="btn btn-ghost btn-sm" id="nlSched">Schedule</button><button type="button" class="btn btn-accent btn-sm" id="nlSend">${nl.status === "review" ? "Approve and send" : "Send now"}</button>`;
      if (nl.status === "review" && can("send")) acts += `<button type="button" class="btn btn-quiet btn-sm" id="nlBack">Send back to draft</button>`;
      if (can("news")) acts += `<button type="button" class="btn btn-quiet btn-sm" id="nlDel">Delete</button>`;
    }
    if (nl.status === "scheduled" && can("send")) acts += `<button type="button" class="btn btn-ghost btn-sm" id="nlUnsched">Cancel the schedule</button>`;
    if (nl.status === "sent" && can("news")) acts += `<button type="button" class="btn btn-accent btn-sm" id="nlAnother">Send another</button>`;
    if (edit) acts += `<button type="button" class="btn btn-quiet btn-sm" id="nlSave">Save version</button>`;
    if (can("news")) acts += `<button type="button" class="btn btn-quiet btn-sm" id="nlDup">Make a copy</button>`;
    const why = (nl.status === "draft" || nl.status === "review") && can("send") && !maySend ? `<p class="note-box">You wrote or last edited this, and second approval is on, so another admin with Newsletter: send has to send it: ${nlHolders("send").filter(a => a.id !== m.id).map(a => esc(a.name)).join(", ")}.</p>`
      : nl.status === "review" && !can("send") ? `<p class="small muted">Waiting for ${nlHolders("send").map(a => esc(first(a.name))).join(" or ")} to approve it. You can keep editing until then.</p>`
      : nl.status === "draft" && !can("send") ? `<p class="small muted">You can't send newsletters yourself. Ask for approval and ${nlHolders("send").map(a => esc(first(a.name))).join(" or ")} will get a notification.</p>` : "";
    const trail = [["Drafted by", nl.createdBy], ["Last edited by", nl.editedBy], ["Asked for approval", nl.submittedBy], ["Approved by", nl.approvedBy], ["Sent by", nl.sentBy]].filter(x => x[1]).map(([l, id]) => `<span><span class="muted">${l}</span> ${esc(nlWho(id))}</span>`).join("");
    return who + `<section class="panel span-2 nl-editor">
      <div class="ho-top"><h2 class="panel-h"><button type="button" class="link-btn" id="nlClose">Newsletters</button> / ${esc(nl.subject || "Untitled newsletter")}</h2><span class="st ${cls}">${lbl}</span></div>
      <p class="nl-trail small">${trail}${nl.status === "sent" ? `<span><span class="muted">Sent</span> ${fmtFull(nl.sentAt)} to ${nl.recipients == null ? "the school list" : nl.recipients + (nl.recipients === 1 ? " person" : " people")}</span>` : ""}${nl.status === "scheduled" ? `<span><span class="muted">Goes out</span> ${fmtFull(nl.schedDate)} at ${esc(nl.schedTime)}</span>` : ""}</p>
      ${edit ? "" : nl.status === "draft" || nl.status === "review" ? `<p class="note-box">View only. You need the Newsletter: draft permission to edit this.</p>` : `<p class="small muted">${nl.status === "sent" ? "Sent newsletters can't be changed. Press Send another to start the next issue with the same layout." : "Cancel the schedule to make changes."}</p>`}
      <div class="nl-grid">
        <div class="nl-form">
          <label class="field"><span>Subject line</span><input data-nlf="subject" maxlength="90" value="${esc(nl.subject)}" ${dis}></label>
          <label class="field"><span>Preview line <small>shown under the subject in most inboxes</small></span><input data-nlf="preheader" maxlength="140" value="${esc(nl.preheader)}" ${dis}></label>
          <div class="form-grid">
            <label class="field"><span>Send to</span><select data-nlf="audience" ${dis}>${nlAudiences().map(([v, l]) => `<option value="${esc(v)}" ${v === nl.audience ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
            <label class="field"><span>Issue label</span><input data-nlf="issue" maxlength="30" value="${esc(nl.issue)}" ${dis}></label>
          </div>
          <p class="small muted nl-count" id="nlCount">Goes to ${esc(nlCount(nl.audience))}${nl.audience === "alias" ? "" : ", not counting anyone who has turned the newsletter off"}.</p>
          <h3 class="panel-sub">Blocks</h3>
          <ol class="nl-blocks">${nl.blocks.map(blockForm).join("")}</ol>
          ${edit ? `<div class="nl-add"><span class="small muted">Add</span>${NL_BLOCKS.map(([k, l]) => `<button type="button" class="chip" data-nladd="${k}">${l}</button>`).join("")}</div>` : ""}
          <label class="field mt"><span>Sign-off</span><input data-nlf="signoff" maxlength="80" value="${esc(nl.signoff)}" ${dis}></label>
          ${edit ? `<p class="small muted">Changes save as you type. The design stays the same so every issue looks like Crew Call. You can change any heading and text.</p>` : ""}
        </div>
        <div class="nl-prev">
          <div class="nl-prev-h"><b>Preview</b><div class="seg-btn" role="group" aria-label="Preview size"><button type="button" class="${nlWidth === "desk" ? "on" : ""}" data-nlw="desk" aria-pressed="${nlWidth === "desk"}">Computer</button><button type="button" class="${nlWidth === "phone" ? "on" : ""}" data-nlw="phone" aria-pressed="${nlWidth === "phone"}">Phone</button></div></div>
          <iframe id="nlFrame" class="nl-frame ${nlWidth}" title="Newsletter preview" sandbox="" data-noi18n></iframe>
        </div>
      </div>
      ${why}
      <div class="nl-acts">${acts}</div>
      <h3 class="panel-sub">Versions</h3>${nlVersionsHtml(nl.versions, edit)}
    </section>`;
  }

  function bindNewsletter(root) {
    const again = () => { renderAdmin(); };
    const nl = nlOpen && nlFind(nlOpen), m = me();
    const second = root.querySelector("#nlSecond");
    if (second) second.addEventListener("change", () => { if (!isOwner()) return; S.settings.newsSecond = second.checked; logAdmin(`Turned second approval for newsletters ${second.checked ? "on" : "off"}`); toast(second.checked ? "Second approval on" : "Second approval off"); again(); });
    root.querySelectorAll("[data-nlopen]").forEach(b => b.addEventListener("click", () => { nlOpen = b.dataset.nlopen; again(); window.scrollTo({ top: 0 }); }));
    const nb = root.querySelector("#nlNew");
    if (nb) nb.addEventListener("click", () => {
      if (!can("news")) return;
      const n = { id: uid("nl"), subject: "", preheader: "", issue: monYear(TODAY), audience: "all", signoff: "From the Crew Call admins",
        blocks: [{ t: "heading", text: "" }, { t: "text", text: "" }, { t: "auto", what: "roles", n: 3 }, { t: "button", label: "Open Crew Call", url: SITE }],
        status: "draft", createdBy: m.id, editedBy: m.id, versions: [] };
      S.newsletters.unshift(n); nlOpen = n.id; logAdmin("Started a new newsletter"); again(); const s = root.querySelector('[data-nlf="subject"]'); if (s) s.focus();
    });
    root.querySelectorAll("[data-nlmode]").forEach(b => b.addEventListener("click", () => { nlMode = b.dataset.nlmode; again(); }));
    const viewVer = (v, title) => { openModal(`<h2 id="modalTitle" class="m-title">${esc(title)}</h2><p class="muted small">${fmtFull(v.at)} · ${esc(v.why)} · ${esc(nlWho(v.by))}</p><iframe class="nl-frame desk nl-vframe" title="Saved version" sandbox="" data-noi18n></iframe><div class="form-actions"><button type="button" class="btn btn-ghost" data-close>Close</button></div>`); const fr = modalBody.querySelector("iframe"); fr.srcdoc = nlHtml(v.data.blocks ? v.data : autoNl(Object.assign({}, S.nlAuto, v.data))); };
    if (!nl && nlMode === "auto") {
      const A = S.nlAuto, frame = root.querySelector("#nlFrame"), paint = () => { if (frame) frame.srcdoc = nlHtml(autoNl()); };
      paint(); let t = 0; const later = () => { clearTimeout(t); t = setTimeout(paint, 150); };
      root.querySelectorAll("[data-auf]").forEach(inp => inp.addEventListener("input", () => { if (!can("news")) return; A[inp.dataset.auf] = inp.value; later(); }));
      root.querySelectorAll("[data-aux]").forEach(inp => inp.addEventListener(inp.type === "checkbox" || inp.tagName === "SELECT" ? "change" : "input", () => { if (!can("news")) return; const [i, k] = inp.dataset.aux.split("|"); A.sections[+i][k] = k === "on" ? inp.checked : k === "n" ? +inp.value : inp.value; later(); }));
      root.querySelectorAll("[data-aus]").forEach(inp => inp.addEventListener("change", () => { if (!can("send")) return; const k = inp.dataset.aus; A[k] = inp.type === "checkbox" ? inp.checked : inp.value; logAdmin(k === "on" ? `Turned the automatic newsletter ${A.on ? "on" : "off"}` : k === "autoSend" ? `Set the automatic newsletter to ${A.autoSend ? "send by itself" : "wait for an admin to send it"}` : k === "freq" ? `Set the automatic newsletter to ${A.freq}` : `Set the automatic newsletter to go to ${nlAudLabel(A.audience)}`); toast("Saved"); again(); }));
      root.querySelectorAll("[data-nlw]").forEach(b => b.addEventListener("click", () => { nlWidth = b.dataset.nlw; again(); }));
      root.querySelectorAll("[data-nlvview]").forEach(b => b.addEventListener("click", () => viewVer(A.versions[+b.dataset.nlvview], "Automatic edition")));
      root.querySelectorAll("[data-nlvback]").forEach(b => b.addEventListener("click", () => { const v = A.versions[+b.dataset.nlvback]; if (!v.data || !can("news")) return; autoSnap("Before restoring an older version"); Object.assign(A, JSON.parse(JSON.stringify(v.data))); logAdmin(`Restored the automatic newsletter to the version from ${fmtFull(v.at)}`); toast("Older version restored"); again(); }));
      const on = (id, fn) => { const b = root.querySelector(id); if (b) b.addEventListener("click", fn); };
      on("#auTest", () => { mailTest(A, autoNl(), m); toast(LIVE ? `Test on its way to ${m.email}. It can take up to 10 minutes.` : `Demo: a test would go to ${m.email}`); });
      on("#auSave", () => { autoSnap("Saved by hand"); toast("Version saved"); again(); });
      on("#auCopy", () => { const x = autoNl(); const n = Object.assign(x, { id: uid("nl"), status: "draft", createdBy: m.id, editedBy: m.id, versions: [] }); S.newsletters.unshift(n); nlMode = "designed"; nlOpen = n.id; logAdmin("Made an editable copy of the automatic newsletter"); toast("Editable copy made"); again(); });
      on("#auSend", () => { if (!can("send")) return; const x = autoNl(), to = nlRecipients(A.audience);
        confirmBox(`Send “${x.subject}” now?`, `It goes to ${esc(nlAudLabel(A.audience))}: ${esc(nlCount(A.audience))}. You can't unsend an email.`, "Send newsletter", () => {
          to.forEach(s => notify(s.id, "news", `New newsletter from the Crew Call admins: “${x.subject}”.`));
          A.lastSent = TODAY; autoSnap(`Sent to ${A.audience === "alias" ? "the school list" : to.length + " people"}`);
          S.newsletters.unshift(Object.assign(x, { id: uid("nl"), status: "sent", auto: true, createdBy: m.id, editedBy: m.id, approvedBy: m.id, sentBy: m.id, sentAt: TODAY, recipients: A.audience === "alias" ? null : to.length, versions: [] })); mailOut(x);
          logAdmin(`Sent the automatic newsletter “${x.subject}” to ${to.length} people`); closeModal(); toast(`Newsletter sent to ${to.length} people`); again(); drawHeader(); }, false); });
      return;
    }
    if (!nl) return;
    root.querySelectorAll("[data-nlvview]").forEach(b => b.addEventListener("click", () => viewVer(nl.versions[+b.dataset.nlvview], nl.subject || "Untitled newsletter")));
    root.querySelectorAll("[data-nlvback]").forEach(b => b.addEventListener("click", () => { const v = nl.versions[+b.dataset.nlvback]; if (!v.data || !nlMayEdit(nl)) return; nlSnap(nl, "Before restoring an older version"); Object.assign(nl, JSON.parse(JSON.stringify(v.data))); nl.editedBy = m.id; logAdmin(`Restored “${nl.subject}” to the version from ${fmtFull(v.at)}`); toast("Older version restored"); again(); }));
    const frame = root.querySelector("#nlFrame");
    const paint = () => { if (frame) frame.srcdoc = nlHtml(nl); };
    paint();
    let t = 0;
    const touched = () => { nl.editedBy = m.id; clearTimeout(t); t = setTimeout(paint, 150); };
    root.querySelectorAll("[data-nlf]").forEach(inp => inp.addEventListener(inp.tagName === "SELECT" ? "change" : "input", () => {
      if (!nlMayEdit(nl)) return;
      nl[inp.dataset.nlf] = inp.value; touched();
      if (inp.dataset.nlf === "audience") { const c = root.querySelector("#nlCount"); if (c) c.textContent = `Goes to ${nlCount(nl.audience)}${nl.audience === "alias" ? "" : ", not counting anyone who has turned the newsletter off"}.`; }
    }));
    root.querySelectorAll("[data-nlb]").forEach(inp => inp.addEventListener(inp.tagName === "SELECT" ? "change" : "input", () => {
      if (!nlMayEdit(nl)) return;
      const [i, k] = inp.dataset.nlb.split("|"); nl.blocks[+i][k] = k === "n" ? +inp.value : inp.inputMode === "url" ? (inp.value.trim() ? cleanUrl(inp.value) || inp.value : "") : inp.value; touched();
    }));
    root.querySelectorAll("[data-nladd]").forEach(b => b.addEventListener("click", () => {
      if (!nlMayEdit(nl)) return;
      const [k, w] = b.dataset.nladd.split(":");
      nl.blocks.push(k === "auto" ? { t: "auto", what: w, n: 3 } : k === "button" ? { t: "button", label: "", url: "" } : k === "image" ? { t: "image", url: "", alt: "", caption: "", link: "" } : { t: k, text: "" });
      nl.editedBy = m.id; again();
      const last = root.querySelectorAll(".nl-block"); const f = last.length && last[last.length - 1].querySelector("input, textarea, select"); if (f) f.focus();
    }));
    root.querySelectorAll("[data-nlmove]").forEach(b => b.addEventListener("click", () => { const [i, d] = b.dataset.nlmove.split("|").map(Number), j = i + d; if (j < 0 || j >= nl.blocks.length) return; [nl.blocks[i], nl.blocks[j]] = [nl.blocks[j], nl.blocks[i]]; nl.editedBy = m.id; again(); }));
    root.querySelectorAll("[data-nldel]").forEach(b => b.addEventListener("click", () => { nl.blocks.splice(+b.dataset.nldel, 1); nl.editedBy = m.id; again(); }));
    root.querySelectorAll("[data-nlw]").forEach(b => b.addEventListener("click", () => { nlWidth = b.dataset.nlw; again(); }));
    const on = (id, fn) => { const b = root.querySelector(id); if (b) b.addEventListener("click", fn); };
    const ready = () => { if (!nl.subject.trim()) { toast("Add a subject line first"); const s = root.querySelector('[data-nlf="subject"]'); if (s) s.focus(); return false; } if (!nl.blocks.length) { toast("Add at least one block"); return false; } return true; };
    on("#nlClose", () => { nlOpen = null; again(); });
    on("#nlTest", () => { if (!ready()) return; mailTest(nl, nl, m); toast(LIVE ? `Test on its way to ${m.email}. It can take up to 10 minutes.` : `Demo: a test would go to ${m.email}`); });
    on("#nlAsk", () => {
      if (!ready()) return;
      Object.assign(nl, { status: "review", submittedBy: m.id, submittedAt: TODAY }); nlSnap(nl, "Asked for approval");
      nlHolders("send").filter(a => a.id !== m.id).forEach(a => notify(a.id, "update", `${m.name} asked you to approve the newsletter “${nl.subject}”. It's in Admin, Newsletter.`));
      logAdmin(`Asked for approval to send the newsletter “${nl.subject}”`); toast("Sent for approval"); again();
    });
    on("#nlBack", () => { if (!can("send")) return; nl.status = "draft"; if (nl.submittedBy && nl.submittedBy !== m.id) notify(nl.submittedBy, "update", `${m.name} sent the newsletter “${nl.subject}” back to draft. Have a look in Admin, Newsletter.`); logAdmin(`Sent the newsletter “${nl.subject}” back to draft`); toast("Back to draft"); again(); });
    on("#nlDel", () => confirmBox("Delete this newsletter?", "The draft is deleted for everyone. This can't be undone.", "Delete", () => { S.newsletters = S.newsletters.filter(x => x !== nl); logAdmin(`Deleted the newsletter draft “${nl.subject || "Untitled"}”`); nlOpen = null; closeModal(); toast("Newsletter deleted"); again(); }));
    on("#nlDup", () => { const c = JSON.parse(JSON.stringify(nl)); Object.assign(c, { id: uid("nl"), subject: nl.subject + " (copy)", status: "draft", createdBy: m.id, editedBy: m.id, versions: [] }); ["submittedBy", "submittedAt", "approvedBy", "sentBy", "sentAt", "recipients", "schedDate", "schedTime", "mail", "test"].forEach(k => delete c[k]); S.newsletters.unshift(c); nlOpen = c.id; logAdmin(`Copied the newsletter “${nl.subject}”`); toast("Copy made"); again(); });
    on("#nlSave", () => { if (!nlMayEdit(nl)) return; nlSnap(nl, "Saved by hand"); toast("Version saved"); again(); });
    on("#nlAnother", () => { if (!can("news")) return; const c = JSON.parse(JSON.stringify(nl)); const iss = monYear(TODAY);
      Object.assign(c, { id: uid("nl"), issue: iss, subject: nl.subject.replace(nl.issue, iss), status: "draft", createdBy: m.id, editedBy: m.id, versions: [] }); ["submittedBy", "submittedAt", "approvedBy", "sentBy", "sentAt", "recipients", "schedDate", "schedTime", "auto", "mail", "test"].forEach(k => delete c[k]);
      S.newsletters.unshift(c); nlOpen = c.id; logAdmin(`Started a new issue from “${nl.subject}”`); toast("New issue started with the same layout. Change the words and send."); again(); });
    on("#nlUnsched", () => { if (!can("send")) return; nl.status = "draft"; delete nl.schedDate; delete nl.schedTime; delete nl.mail; logAdmin(`Cancelled the scheduled newsletter “${nl.subject}”`); toast("Schedule cancelled"); again(); });
    const audText = () => nl.audience === "alias" ? `the school mass email alias, ${esc(S.settings.schoolAlias)}` : `${esc(nlAudLabel(nl.audience))}: ${esc(nlCount(nl.audience))}`;
    on("#nlSend", () => {
      if (!ready() || !nlMaySend(nl)) return;
      confirmBox(`Send “${nl.subject}” now?`, `It goes to ${audText()}, from ${esc(S.settings.senderName)} &lt;${esc(S.settings.senderEmail || "sender not set up")}&gt;. You can't unsend an email.`, "Send newsletter", () => {
        const to = nlRecipients(nl.audience);
        Object.assign(nl, { status: "sent", approvedBy: m.id, sentBy: m.id, sentAt: TODAY, recipients: nl.audience === "alias" ? null : to.length }); mailOut(nl); nlSnap(nl, "Sent");
        to.forEach(s => notify(s.id, "news", `New newsletter from the Crew Call admins: “${nl.subject}”.`));
        if (nl.submittedBy && nl.submittedBy !== m.id) notify(nl.submittedBy, "update", `${m.name} approved and sent your newsletter “${nl.subject}”.`);
        logAdmin(`Sent the newsletter “${nl.subject}” to ${nl.audience === "alias" ? "the school alias" : to.length + " people"}${nl.createdBy !== m.id ? ` (drafted by ${nlWho(nl.createdBy)})` : ""}`);
        closeModal(); toast(nl.audience === "alias" ? "Newsletter sent to the school list" : `Newsletter sent to ${to.length} people`); again(); drawHeader();
      }, false);
    });
    on("#nlSched", () => {
      if (!ready() || !nlMaySend(nl)) return;
      openModal(`<h2 id="modalTitle" class="m-title">Schedule “${esc(nl.subject)}”</h2><p class="muted">It goes to ${audText()}.</p>
        <form id="nlSchedForm" class="form-grid"><label class="field"><span>Date</span><input type="date" name="d" required min="${addDays(TODAY, 1)}" value="${addDays(TODAY, 1)}"></label><label class="field"><span>Time</span><input type="time" name="t" required value="09:00"></label>
        <div class="form-actions span-2"><button class="btn btn-accent">Schedule</button><button type="button" class="btn btn-ghost" data-close>Cancel</button></div></form>`);
      $("#nlSchedForm").addEventListener("submit", e => { e.preventDefault(); const f = e.target;
        Object.assign(nl, { status: "scheduled", approvedBy: m.id, schedDate: f.d.value, schedTime: f.t.value }); mailOut(nl, `${f.d.value}T${f.t.value}`);
        if (nl.submittedBy && nl.submittedBy !== m.id) notify(nl.submittedBy, "update", `${m.name} approved your newsletter “${nl.subject}”. It goes out on ${fmtFull(nl.schedDate)}.`);
        logAdmin(`Scheduled the newsletter “${nl.subject}” for ${fmtFull(nl.schedDate)} at ${nl.schedTime}`); closeModal(); toast(`Scheduled for ${fmtFull(nl.schedDate)}`); again(); });
    });
  }

  function repsPanel() {
    const m = me(), owner = student(S.owner), mayPeople = can("people"), pr = S.ownerProposal;
    const rows = liveCohorts().map(c => {
      const r = repOf(c), mayEdit = mayPeople || (r && r.id === m.id);
      const pool = S.students.filter(s => s.cohort === c && !s.guest && !s.incomplete).sort((a, b) => a.name.localeCompare(b.name));
      return `<tr><td><b>${esc(c)}</b><br><span class="muted small">${pool.length} ${pool.length === 1 ? "person" : "people"}</span></td>
        <td>${r ? `${esc(r.name)}${r.id === m.id ? ` <span class="muted small">(you)</span>` : ""}${r.id === S.owner ? ` <span class="tag-admin">Owner</span>` : ""}` : `<span class="muted">No rep yet</span>`}</td>
        <td>${mayEdit ? `<select data-rep="${esc(c)}" aria-label="Rep for ${esc(c)}"><option value="">${r ? "Change rep…" : "Choose a rep…"}</option>${pool.filter(s => !r || s.id !== r.id).map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select>` : ""}</td></tr>`;
    }).join("");
    let prop = "";
    if (pr) {
      const to = student(pr.to), by = student(pr.by), agreed = pr.agree.filter(id => id !== pr.by).map(student).filter(Boolean);
      const mayAgree = isRep(m) && !pr.agree.includes(m.id) && m.id !== pr.to;
      prop = `<div class="note-box rep-prop"><p><b>${esc(by.name)}</b> proposed <b>${esc(to.name)}</b> as the new owner on ${fmtFull(pr.at)}.</p>
        <p class="small">${ownerAway() ? `${esc(first(owner.name))} looks to have left or gone quiet, so one more rep agreeing is enough.` : `${esc(first(owner.name))} is still active, so the owner has to accept it.`}${agreed.length ? ` Agreed: ${agreed.map(a => esc(a.name)).join(", ")}.` : ""}</p>
        <div class="form-actions">${isOwner() ? `<button class="btn btn-accent btn-sm" id="propAccept">Accept and transfer</button><button class="btn btn-quiet btn-sm" id="propDecline">Decline</button>` : ""}${!isOwner() && mayAgree && ownerAway() ? `<button class="btn btn-accent btn-sm" id="propAgree">Agree</button>` : ""}${pr.by === m.id ? `<button class="btn btn-quiet btn-sm" id="propCancel">Withdraw</button>` : ""}</div></div>`;
    }
    const cands = S.admins.map(student).filter(s => s && s.id !== S.owner && !s.guest && s.term !== "Alumni");
    return `<section class="panel span-2"><h2 class="panel-h">Cohort reps <span class="count">${repList().length}/${liveCohorts().length}</span></h2>
      <p class="muted small">One rep per cohort keeps Crew Call going when people graduate. Reps become admins, can hand their rep role to someone in their cohort, and can propose a new owner. ${mayPeople ? "You can choose any cohort's rep." : ""}</p>
      <div class="td-wrap"><table class="td-table rep-table"><thead><tr><th>Cohort</th><th>Rep</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
      <h3 class="panel-sub">Handing on ownership</h3>
      <label class="toggle"><input type="checkbox" id="repsTransfer" ${S.settings.repsTransfer ? "checked" : ""} ${isOwner() ? "" : "disabled"}> <span>Reps can propose a new owner</span></label>
      <p class="small muted">The owner accepts, or, if the owner has graduated or not signed in for 30 days, a second rep agrees. ${isOwner() ? "" : `Only ${esc(first(owner.name))} (owner) can change this.`}</p>
      ${prop}
      ${!pr && isRep(m) && !isOwner() && S.settings.repsTransfer ? (cands.length ? `<div class="kit-add"><select id="propTo" aria-label="Proposed owner">${cands.map(s => `<option value="${s.id}" ${s.id === m.id ? "selected" : ""}>${esc(s.name)}${s.id === m.id ? " (you)" : isRep(s) ? " · Rep for " + esc(repCohort(s)) : ""}</option>`).join("")}</select><button class="btn btn-ghost btn-sm" id="propBtn">Propose as owner</button></div>` : "") : ""}
    </section>`;
  }
  function bindReps(root) {
    const m = me(), pr = S.ownerProposal, again = () => { renderAdmin(); drawHeader(); };
    root.querySelectorAll("[data-rep]").forEach(sel => sel.addEventListener("change", () => {
      const c = sel.dataset.rep, id = sel.value; if (!id) return;
      const r = repOf(c); if (!(can("people") || (r && r.id === m.id))) return;
      const s = student(id);
      confirmBox(`Make ${s.name} the rep for ${c}?`, `${esc(first(s.name))} becomes an admin${S.admins.includes(id) ? "" : " with the Projects permission"} and gets a notification.${r ? ` ${esc(r.name)} stops being the rep.` : ""}`, "Make rep", () => { setRep(c, id); closeModal(); toast(`${s.name} is the rep for ${c}`); again(); });
    }));
    const rt = root.querySelector("#repsTransfer");
    if (rt) rt.addEventListener("change", () => { if (!isOwner()) return; S.settings.repsTransfer = rt.checked; if (!rt.checked) S.ownerProposal = null; logAdmin(`${rt.checked ? "Let" : "Stopped"} reps propose a new owner`); toast(rt.checked ? "Reps can propose a new owner" : "Only you can hand on ownership"); again(); });
    const on = (id, fn) => { const b = root.querySelector(id); if (b) b.addEventListener("click", fn); };
    on("#propBtn", () => {
      const to = student(root.querySelector("#propTo").value);
      S.ownerProposal = { to: to.id, by: m.id, at: TODAY, agree: [m.id] };
      notify(S.owner, "update", `${m.name} proposed ${to.id === m.id ? "themselves" : to.name} as the new owner of Crew Call. Accept or decline in Admin, then Access.`);
      repList().filter(r => r.id !== m.id).forEach(r => notify(r.id, "update", `${m.name} proposed ${to.id === m.id ? "themselves" : to.name} as the new owner of Crew Call. See Admin, then Access.`));
      logAdmin(`Proposed ${to.name} as the new owner`); toast("Proposal sent"); again();
    });
    if (!pr) return;
    const to = student(pr.to);
    on("#propAccept", () => confirmBox(`Make ${to.name} the owner?`, `${esc(first(to.name))} gets every permission. You stay an admin.`, "Transfer", () => { transferOwner(to, "(proposed by a rep, accepted by the owner)"); closeModal(); toast(`${to.name} is now the owner`); again(); }));
    on("#propDecline", () => { notify(pr.by, "update", `${m.name} declined the proposal to make ${to.name} owner.`); logAdmin(`Declined the proposal to make ${to.name} owner`); S.ownerProposal = null; toast("Declined"); again(); });
    on("#propCancel", () => { S.ownerProposal = null; logAdmin("Withdrew the ownership proposal"); toast("Withdrawn"); again(); });
    on("#propAgree", () => { if (!ownerAway() || !isRep(m)) return; pr.agree.push(m.id); transferOwner(to, `(agreed by two reps: ${student(pr.by).name} and ${m.name})`); toast(`${to.name} is now the owner`); again(); });
  }

  function renderAdmin() {
    const root = $("#view-admin"), m = me(), members = S.students.filter(s => !s.incomplete), guests = members.filter(s => s.guest);
    if (!S.admins.includes(S.owner)) S.admins.unshift(S.owner);
    syncReps();
    const owner = student(S.owner), mayPeople = can("people");
    const tabBtn = ([id, label, perm]) => `<button class="atab ${adminTab === id ? "on" : ""}" data-atab="${id}" role="tab" aria-selected="${adminTab === id}">${esc(label)}${id === "reports" && can("safety") && S.reports.some(r => r.status === "open") ? ` <span class="count">${S.reports.filter(r => r.status === "open").length}</span>` : ""}${perm && !can(perm) ? ` <span class="atab-lock">view only</span>` : ""}</button>`;
    const doneN = HANDOVER_STEPS.flatMap(g => g[1]).filter(x => S.handover.done[x[0]]).length, allN = HANDOVER_STEPS.flatMap(g => g[1]).length;
    let body = "";

    if (adminTab === "home") {
      const openR = S.reports.filter(r => r.status === "open").length, review = S.newsletters.filter(n => n.status === "review").length;
      const noRep = liveCohorts().filter(c => !repOf(c)), due = retentionList().filter(x => x.due).length;
      const invites = S.invites.filter(i => i.status === "pending").length, tfN = S.transFixes.filter(t => t.status === "open").length;
      const ntt = nextTerm(), nxCh = ntt && (() => { const ch = cohortChanges(ntt), j = ch.flatMap(c => c.joins.map(o => o.code)), l = ch.flatMap(c => c.leaves.map(o => o.code)); return j.length || l.length ? [`${ntt.name} starts ${fmtFull(ntt.start)}`, ...j.map(c => `${c} starts`), ...l.map(c => `${c} becomes Alumni`)].join(" · ") : ""; })();
      const todo = [
        openR && [`${openR} open report${openR === 1 ? "" : "s"}`, "reports", "Read them"],
        review && [`${review} newsletter${review === 1 ? "" : "s"} waiting for approval`, "newsletter", "Review"],
        noRep.length && [`No rep yet for ${noRep.join(", ")}`, "access", "Choose reps"],
        due && [`${due} old profile${due === 1 ? "" : "s"} due for deletion`, "privacy", "Check"],
        tfN && [`${tfN} translation suggestion${tfN === 1 ? "" : "s"} to check`, "langs", "Check"],
        nxCh && [`${nxCh}`, "terms", "See changes"],
        doneN && doneN < allN && [`Handover: ${doneN} of ${allN} steps done`, "handover", "Open checklist"]
      ].filter(Boolean);
      const upcoming = []; for (let i = 0; i <= 150 && upcoming.length < 5; i++) { const d = addDays(TODAY, i); keyDatesOn(d).forEach(k => upcoming.length < 5 && upcoming.push([d, k])); }
      const now = termNow(), nt = nextTerm(), liveP = S.projects.filter(p => !p.archived && !isPast(p)).length;
      body = `
        <section class="panel"><h2 class="panel-h">To do <span class="count">${todo.length}</span></h2>
          ${todo.length ? `<ul class="ov-todo">${todo.map(([t, tab, b]) => `<li><span>${esc(t)}</span><button class="btn btn-ghost btn-xs" data-atab="${tab}">${esc(b)}</button></li>`).join("")}</ul>` : `<p class="empty-sm">Nothing needs doing right now.</p>`}</section>
        <section class="panel"><h2 class="panel-h">School calendar</h2>
          <p class="small">${now ? `${esc(now.name)} · ends ${fmtFull(now.end)}` : nt ? `Holidays · ${esc(nt.name)} · starts ${fmtFull(nt.start)}` : "No term dates yet"}</p>
          <h3 class="panel-sub">Coming up</h3>
          ${upcoming.length ? `<ul class="inv-list">${upcoming.map(([d, k]) => `<li><span>${esc(k)}</span><span class="mono small">${fmtFull(d)}</span></li>`).join("")}</ul>` : `<p class="empty-sm">Nothing in the next few months. Add next year's term dates.</p>`}
          <button class="btn btn-ghost btn-sm mt" data-atab="terms">Terms and cohorts</button></section>
        <section class="panel span-2"><h2 class="panel-h">At a glance</h2>
          <dl class="ov-stats"><div><dt>Members</dt><dd>${members.length - guests.length}</dd></div><div><dt>Guests</dt><dd>${guests.length}</dd></div><div><dt>Live projects</dt><dd>${liveP}</dd></div><div><dt>Admins</dt><dd>${S.admins.length}</dd></div><div><dt>Cohorts with a rep</dt><dd>${liveCohorts().length - noRep.length}/${liveCohorts().length}</dd></div><div><dt>Invites waiting</dt><dd>${invites}</dd></div></dl></section>`;
    }

    if (adminTab === "access") {
      const others = S.admins.filter(id => id !== S.owner && student(id) && !student(id).guest);
      body = `
        <section class="panel"><h2 class="panel-h">Owner</h2>
          <div class="owner-card"><span class="avatar avatar-lg">${initials(owner.name)}</span><div><p class="contact-name">${esc(owner.name)}${isOwner() ? ` <span class="muted small">(you)</span>` : ""}</p><p class="muted small">${esc(owner.email)} · ${esc(tLabel(owner))}</p></div></div>
          <p class="muted small">The owner signs in with their own school email, has every permission and can't be removed. They also own the GitHub and Supabase organisations. Before they graduate, they hand ownership to a cohort rep.</p>
          ${isOwner() ? (others.length ? `<h3 class="panel-sub">Transfer ownership</h3><div class="kit-add"><select id="ownerTo" aria-label="New owner">${[...others].sort((a, b) => (isRep(student(b)) ? 1 : 0) - (isRep(student(a)) ? 1 : 0)).map(id => `<option value="${id}">${esc(student(id).name)} · ${isRep(student(id)) ? "Rep for " + esc(repCohort(student(id))) : esc(tLabel(student(id)))}</option>`).join("")}</select><button class="btn btn-accent btn-sm" id="ownerBtn">Transfer</button></div><p class="muted small">You'll stay an admin with every permission until someone removes you.</p>` : `<p class="note-box">Make someone an admin first, then you can transfer ownership to them.</p>`) : `<p class="muted small">Only ${esc(first(owner.name))} can transfer ownership.</p>`}
        </section>
        ${repsPanel()}
        <section class="panel"><h2 class="panel-h">Add an admin</h2>
          ${mayPeople ? `<p class="muted small">Pick someone with an LFS email who has signed in, and tick what they can do. Guests can't be admins.</p>
          <form id="adminAddForm"><select name="sid" aria-label="Person" class="full">${members.filter(s => !S.admins.includes(s.id) && !s.guest).sort((a, b) => a.name.localeCompare(b.name)).map(s => `<option value="${s.id}">${esc(s.name)} · ${esc(tLabel(s))}</option>`).join("")}</select>
            <div class="perm-picks">${PERMS.map(([k, l]) => `<label class="toggle"><input type="checkbox" name="perm" value="${k}" checked> <span>${esc(l)}</span></label>`).join("")}</div>
            <button class="btn btn-ghost btn-sm">Make admin</button></form>` : `<p class="muted small">You need the People permission to add admins.</p>`}
        </section>
        <section class="panel span-2"><h2 class="panel-h">Admins and permissions <span class="count">${S.admins.length}</span></h2>
          <div class="td-wrap"><table class="td-table perm-table"><thead><tr><th>Admin</th>${PERMS.map(([k, l]) => `<th>${esc(l)}</th>`).join("")}<th></th></tr></thead><tbody>
          ${S.admins.map(id => { const s = student(id); if (!s) return ""; const own = id === S.owner, ps = own ? ALL_PERMS : (S.adminPerms[id] || []);
            return `<tr><td><b>${esc(s.name)}</b>${own ? ` <span class="tag-admin">Owner</span>` : ""}${isRep(s) ? ` <span class="tag-rep">Rep · ${esc(repCohort(s))}</span>` : ""}${id === m.id ? ` <span class="muted small">(you)</span>` : ""}<br><span class="muted small">${esc(tLabel(s))}</span></td>${PERMS.map(([k, l]) => `<td><input type="checkbox" data-perm="${id}|${k}" aria-label="${esc(s.name)}: ${esc(l)}" ${ps.includes(k) ? "checked" : ""} ${own || !mayPeople ? "disabled" : ""}></td>`).join("")}<td>${own ? `<span class="muted small">Can't be removed</span>` : mayPeople ? `<button class="btn btn-quiet btn-xs" data-unadmin="${id}">Remove</button>` : ""}</td></tr>`; }).join("")}
          </tbody></table></div>
          <dl class="perm-key">${PERMS.map(([k, l, d]) => `<div><dt>${esc(l)}</dt><dd>${esc(d)}</dd></div>`).join("")}<div><dt>Every admin</dt><dd>Sees this page, the handover checklist and the activity log.</dd></div></dl>
        </section>
        <section class="panel"><h2 class="panel-h">Change a sign-in email</h2>
          ${mayPeople ? `<p class="muted small">For a new address, a typo or a name change. Students must use an LFS address. The person is told, and their projects follow them.</p>
          <form id="emailFix"><select name="sid" class="full" aria-label="Person">${members.sort((a, b) => a.name.localeCompare(b.name)).map(s => `<option value="${s.id}">${esc(s.name)} · ${esc(s.email)}</option>`).join("")}</select>
            <div class="kit-add"><input name="email" type="email" required placeholder="new.address@student.lfs.org.uk" aria-label="New email"><button class="btn btn-ghost btn-sm">Change</button></div>
            <p class="form-err" id="emailFixErr" role="alert"></p></form>
          <p class="muted small">In the live app, a code goes to the new address and the change only happens once it's entered.</p>` : `<p class="muted small">You need the People permission to change someone's email.</p>`}
        </section>
        <section class="panel"><h2 class="panel-h">Members <span class="count">${members.length}</span></h2>
          <p class="muted small">${members.length - guests.length} with LFS email · ${guests.length} guest${guests.length === 1 ? "" : "s"}</p>
          <h3 class="panel-sub">Guests</h3>
          ${guests.length ? `<ul class="inv-list">${guests.map(s => `<li><span>${esc(s.name)} <span class="muted small">invited by ${esc((student(s.invitedBy) || { name: "?" }).name)}</span></span>${mayPeople ? `<button class="btn btn-quiet btn-xs" data-rmguest="${s.id}">Remove</button>` : ""}</li>`).join("")}</ul>` : `<p class="empty-sm">No guests.</p>`}
          <h3 class="panel-sub">Invites</h3>
          <ul class="inv-list">${S.invites.map((i, k) => `<li><span>${esc(i.email)} <span class="muted small">by ${esc((student(i.by) || { name: "?" }).name)}</span></span>${i.status === "pending" ? (mayPeople ? `<button class="btn btn-quiet btn-xs" data-revoke="${k}">Revoke</button>` : `<span class="st st-pending">Pending</span>`) : `<span class="st st-ok">Joined</span>`}</li>`).join("")}</ul></section>`;
    }

    if (adminTab === "newsletter") body = newsletterBody();

    if (adminTab === "email") {
      const st = S.settings, ok = can("email"), dis = ok ? "" : "disabled";
      body = `
        <section class="panel span-2"><h2 class="panel-h">Email settings</h2>
          ${ok ? "" : `<p class="note-box">View only. You need the Email settings permission to change these.</p>`}
          <form id="mailForm" class="form-grid">
            <label class="field"><span>Sender name</span><input name="senderName" required maxlength="40" value="${esc(st.senderName)}" ${dis}></label>
            <label class="field"><span>Sending address <small>the SMTP sender in Supabase</small></span><input name="senderEmail" type="email" placeholder="Not set up yet" value="${esc(st.senderEmail)}" ${dis}></label>
            <label class="field"><span>Help and reply-to address <small>empty = the owner's email</small></span><input name="replyTo" type="email" placeholder="${esc(student(S.owner).email)}" value="${esc(st.replyTo)}" ${dis}></label>
            <label class="field"><span>School mass email alias <small>for announcements</small></span><input name="schoolAlias" type="email" placeholder="Ask Student Services for the address" value="${esc(st.schoolAlias)}" ${dis}></label>
            <label class="field"><span>Weekly digest day</span><select name="digestDay" ${dis}>${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(d => `<option ${d === st.digestDay ? "selected" : ""}>${d}</option>`).join("")}</select></label>
            <label class="field"><span>Digest time</span><input name="digestTime" type="time" value="${esc(st.digestTime)}" ${dis}></label>
            ${ok ? `<div class="form-actions span-2"><button class="btn btn-accent">Save email settings</button></div>` : ""}
          </form>
        </section>
        <section class="panel"><h2 class="panel-h">How it looks in an inbox</h2>
          <div class="mail-preview"><p><span class="muted">From</span> <b>${esc(st.senderName)}</b> &lt;${esc(st.senderEmail || "not set up yet")}&gt;</p><p><span class="muted">Reply to</span> ${esc(replyAddr())}</p><p><span class="muted">Digest</span> ${esc(st.digestDay)}s at ${esc(st.digestTime)}, for people who turn it on</p><p><span class="muted">Announcements</span> ${st.schoolAlias ? esc(st.schoolAlias) : "Not set"}</p></div>
        </section>
        <section class="panel"><h2 class="panel-h">If you change the sending address</h2>
          <ol class="handover"><li>Set up the new sender: an LFS shared mailbox if the school gives you one, or Brevo's free plan, or a Gmail used only for sending.</li><li>Get its SMTP login (for Gmail, an app password).</li><li>In Supabase, open Authentication, then Emails, then SMTP settings, and swap in the new address and password.</li><li>Save the new address here so the app and digest footer match.</li></ol>
          <p class="muted small">Changing the help address or the alias needs nothing else.</p>
        </section>`;
    }

    if (adminTab === "handover") {
      body = `
        <section class="panel span-2"><div class="ho-top"><h2 class="panel-h">Handover checklist</h2><span class="ho-count">${doneN} of ${allN} done</span></div>
          <div class="ho-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${allN}" aria-valuenow="${doneN}"><span style="width:${Math.round(doneN / allN * 100)}%"></span></div>
          <p class="muted small">Work through this before the owner graduates. Ticks are shared, so successors can see what's been done.</p>
          ${HANDOVER_STEPS.map(([g, steps]) => `<h3 class="panel-sub">${esc(g)}</h3><ul class="ho-list">${steps.map(([id, t, go]) => `<li class="${S.handover.done[id] ? "done" : ""}"><label><input type="checkbox" data-ho="${id}" ${S.handover.done[id] ? "checked" : ""}> <span>${esc(t)}</span></label>${go === "export" ? `<button class="btn btn-ghost btn-xs" data-export>Export backup</button>` : go === "terms" ? `<a class="btn btn-ghost btn-xs" href="https://lfs.org.uk/key-dates/" target="_blank" rel="noopener">LFS key dates</a>` : go ? `<button class="btn btn-ghost btn-xs" data-atab="${go}">Open ${esc(ADMIN_TABS.find(x => x[0] === go)[1])}</button>` : ""}</li>`).join("")}</ul>`).join("")}
          <div class="ho-foot"><button class="btn btn-quiet btn-sm" id="hoReset">Start a fresh checklist</button><a class="btn btn-quiet btn-sm" href="docs/HANDOVER.md" target="_blank" rel="noopener">Full handover document</a></div>
        </section>
        <section class="panel"><h2 class="panel-h">Notes for the next owner</h2>
          <textarea id="hoNotes" rows="6" class="full" aria-label="Notes for the next owner" placeholder="Where the logins live, who to ask at school, anything that's broken">${esc(S.handover.notes)}</textarea>
          <button class="btn btn-ghost btn-sm mt" id="hoSave">Save notes</button>
        </section>
        <section class="panel"><h2 class="panel-h">Owners so far <span class="count">${S.handover.log.length}</span></h2>
          <ul class="inv-list">${S.handover.log.slice().reverse().map(l => `<li><span>${esc(l.to)} <span class="muted small">from ${esc(l.from)}</span></span><span class="mono small">${fmtFull(l.at)}</span></li>`).join("")}</ul>
          <p class="muted small">Added automatically when ownership is transferred.</p>
        </section>`;
    }

    if (adminTab === "terms") body = !can("setup") ? lockedPanel("Terms and lists") : `
        <section class="panel span-2"><h2 class="panel-h">Term dates <span class="count">${C.TERM_DATES.length}</span></h2>
          <p class="muted small">From the LFS key dates. Everyone moves up one term when each term starts, and gets a notification to check it. Dates lock once a term has started.</p>
          <div class="td-wrap"><table class="td-table"><thead><tr><th>Term</th><th>Enrolment and induction</th><th>Starts</th><th>Ends</th><th>Status</th></tr></thead><tbody>
          ${TD().map(t => { const st = t.end < TODAY ? "Done" : t.start <= TODAY ? "Now" : nextTerm() && nextTerm().id === t.id ? "Next" : "Upcoming", locked = t.start <= TODAY, en = t.enrol || [];
            return `<tr class="${st === "Now" ? "td-now" : ""}"><td>${esc(t.name)}</td><td>${locked ? (en[0] ? `${fmtRange({ from: en[0], to: en[1] || en[0] })} ${D(en[0]).getUTCFullYear()}` : "–") : `<span class="td-pair"><input type="date" value="${en[0] || ""}" data-tden="${t.id}|0" aria-label="${esc(t.name)} enrolment first day"><input type="date" value="${en[1] || ""}" data-tden="${t.id}|1" aria-label="${esc(t.name)} enrolment last day"></span>`}<br><span class="muted small">${esc(enrolLabel(t))}</span></td><td>${locked ? fmtFull(t.start) : `<input type="date" value="${t.start}" data-td="${t.id}|start" aria-label="${esc(t.name)} start">`}</td><td>${locked && t.end < TODAY ? fmtFull(t.end) : `<input type="date" value="${t.end}" data-td="${t.id}|end" aria-label="${esc(t.name)} end">`}</td><td><span class="st ${st === "Now" ? "st-ok" : st === "Next" ? "st-pending" : ""}">${st}</span></td></tr>`; }).join("")}
          </tbody></table></div>
          <form class="td-add" id="tdAdd"><input name="name" required placeholder="e.g. Autumn 2029" aria-label="Term name"><input name="start" type="date" required aria-label="Start"><input name="end" type="date" required aria-label="End"><button class="btn btn-ghost btn-sm">Add term</button></form>
          <div class="td-foot"><label class="field-inline">People can change their cohort for the first <select id="lockWeeks">${[1, 2, 3, 4].map(n => `<option ${n === C.LOCK_WEEKS ? "selected" : ""}>${n}</option>`).join("")}</select> week${C.LOCK_WEEKS === 1 ? "" : "s"} of each term</label>
          ${nextTerm() && !LIVE ? `<button class="btn btn-quiet btn-sm" id="adminPreview">Prototype: preview ${esc(nextTerm().name)} starting</button>` : ""}</div>
          <h3 class="panel-sub">When the next term starts</h3>
          ${(() => { const nt = nextTerm(); if (!nt) return `<p class="empty-sm">Add next year's term dates and Crew Call will show who moves up.</p>`;
            const ch = cohortChanges(nt);
            return `<p class="muted small">On ${fmtFull(nt.start)} (${esc(nt.name)}) Crew Call moves everyone up on its own and tells them. Nobody has to edit anything.</p>
            <ul class="cc-changes">${ch.map(c => `<li><b>${esc(c.cr.name)}</b><span>${c.joins.length ? c.joins.map(o => `<span class="cc-join">${esc(o.code)} starts</span>`).join(" ") : ""}${c.leaves.length ? c.leaves.map(o => `<span class="cc-leave">${esc(o.code)} becomes Alumni${c.count(o) ? ` · ${c.count(o)} ${c.count(o) === 1 ? "person" : "people"}` : ""}</span>`).join(" ") : ""}${!c.joins.length && !c.leaves.length ? `<span class="muted small">No change</span>` : ""}</span></li>`).join("")}</ul>
            ${ch.filter(c => c.cr.every === "term").map(c => `<div class="table-wrap"><table class="td-table cc-grid"><caption class="muted small">${esc(c.cr.name)}</caption><thead><tr><th></th>${Array.from({ length: c.cr.terms }, (_, i) => `<th>${i + 1 === c.cr.terms ? "Graduation term" : `Term ${i + 1}`}</th>`).join("")}<th>Alumni</th></tr></thead><tbody>
              <tr><th>Now</th>${Array.from({ length: c.cr.terms }, (_, i) => { const o = c.now.find(x => Math.min(x.n, c.cr.terms) === i + 1); return `<td class="mono">${o ? esc(o.code) : "–"}</td>`; }).join("")}<td class="mono muted">–</td></tr>
              <tr><th>From ${esc(fmtFull(nt.start))}</th>${Array.from({ length: c.cr.terms }, (_, i) => { const o = c.next.find(x => Math.min(x.n, c.cr.terms) === i + 1); return `<td class="mono ${o && c.joins.includes(o) ? "cc-new" : ""}">${o ? esc(o.code) : "–"}</td>`; }).join("")}<td class="mono cc-out">${c.leaves.map(o => esc(o.code)).join(", ") || "–"}</td></tr></tbody></table></div>`).join("")}
`; })()}
          <h3 class="panel-sub">Courses</h3>
          <p class="muted small">Everyone picks their course and cohort once, and Crew Call works out their term from it each term. Edit a course here if LFS changes it. If the cohort numbering ever drifts (for example an intake is skipped), set which code is in which term now and everyone else follows.</p>
          <div class="course-list">${C.COURSES.map(cr => { const live = cohortOptions(cr).filter(o => o.n >= 1 && o.term !== "Alumni"), nextIn = cohortOptions(cr).find(o => o.n === 0); return `<details class="course-ed ${cr.closed ? "is-closed" : ""}" ${openCourse === cr.id ? "open" : ""} data-course="${cr.id}">
            <summary class="ce-h"><span><b>${esc(cr.name)}</b><span class="muted small ce-sum">${cr.every === "term" ? "New cohort every term" : "New cohort every September"} · ${cr.terms} term${cr.terms === 1 ? "" : "s"}${live.length ? ` · ${live.length} cohort${live.length === 1 ? "" : "s"} studying` : ""}</span></span>${cr.closed ? `<span class="st">Closed to new students</span>` : `<span class="st st-ok">Taking new students</span>`}</summary>
            <div class="ce-grid">
              <label class="field"><span>Name</span><input data-cedit="${cr.id}|name" value="${esc(cr.name)}"></label>
              <label class="field"><span>New cohort</span><select data-cedit="${cr.id}|every"><option value="term" ${cr.every === "term" ? "selected" : ""}>Every term</option><option value="year" ${cr.every === "year" ? "selected" : ""}>Every September</option></select></label>
              <label class="field"><span>Length</span><select data-cedit="${cr.id}|terms">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<option value="${n}" ${n === cr.terms ? "selected" : ""}>${n} term${n === 1 ? "" : "s"}</option>`).join("")}</select></label>
              <label class="field"><span>Finishes</span><select data-cedit="${cr.id}|ends"><option value="gradterm" ${cr.ends === "gradterm" ? "selected" : ""}>End of the last term</option><option value="summer" ${cr.ends === "summer" ? "selected" : ""}>End of Summer term</option><option value="sept" ${cr.ends === "sept" ? "selected" : ""}>Late September after</option></select></label>
              ${cr.every === "term" ? `<label class="field"><span>Code prefix</span><input data-cedit="${cr.id}|prefix" value="${esc(cr.prefix)}" style="max-width:8em"></label>` : `<label class="field"><span>Short name</span><input data-cedit="${cr.id}|label" value="${esc(cr.label || "")}"></label><label class="field"><span>Code prefix</span><input data-cedit="${cr.id}|prefix" value="${esc(cr.prefix)}" placeholder="Optional"></label>`}
              <label class="field ce-note"><span>Note</span><input data-cedit="${cr.id}|note" value="${esc(cr.note || "")}" placeholder="e.g. Term 1 at a partner university"></label>
            </div>
            ${cr.every === "term" ? `<p class="field-inline small">Numbering: Term <select data-canchor-t="${cr.id}" aria-label="Term">${Array.from({ length: cr.terms - 1 }, (_, i) => i + 1).map(n => `<option ${n === Math.min(4, cr.terms - 1) ? "selected" : ""}>${n}</option>`).join("")}</select> now is ${esc(cr.prefix)}<input data-canchor-c="${cr.id}" type="number" min="1" value="${(live.find(o => o.n === Math.min(4, cr.terms - 1)) || {}).intake || ""}" aria-label="Cohort number" style="width:5.5em"></p>` : ""}
            <p class="muted small"><span>Studying now: ${live.length ? live.map(o => `${esc(o.code)}${cr.every === "term" ? ` T${o.n >= cr.terms ? "G" : o.n}` : ""}`).join(", ") : "nobody"}</span>${nextIn && !cr.closed ? `<br><span>Next to start: ${esc(nextIn.code)}</span>` : ""}</p>
            <button type="button" class="btn btn-quiet btn-xs" data-cclose="${cr.id}">${cr.closed ? "Reopen to new students" : "Close to new students"}</button>
          </details>`; }).join("")}</div>
          <form class="kit-add" id="courseAdd"><input name="name" required placeholder="New course, e.g. MA Documentary" aria-label="Course name"><select name="every" aria-label="New cohort"><option value="year">Every September</option><option value="term">Every term</option></select><select name="terms" aria-label="Length">${[1, 2, 3, 4, 5, 6].map(n => `<option value="${n}" ${n === 3 ? "selected" : ""}>${n} term${n === 1 ? "" : "s"}</option>`).join("")}</select><button class="btn btn-ghost btn-sm">Add course</button></form>
          <h3 class="panel-sub">Cohort dates</h3>
          <p class="muted small">When each cohort started and finishes. People stay on their course until it finishes, then become Alumni. LFS sets MA Filmmaking end dates for each intake, so enter the real date when you have it. MA Screenwriting, MA Film Producing and MA Film Marketing starting in September 2026 finish on 24 Sep 2027.</p>
          <div class="table-wrap"><table class="td-table"><thead><tr><th>Cohort</th><th>Right now</th><th>Started</th><th>Finishes</th></tr></thead><tbody>
          ${C.COURSES.map(cr => cohortOptions(cr).filter(o => o.n >= 1 && o.term !== "Alumni").map(o => { const d = cohortDates(cr, o.intake);
            return `<tr><td><b>${esc(o.code)}</b><br><span class="muted small">${esc(cr.name)}</span></td><td>${esc(o.term)}</td><td>${esc(d.start)}</td><td><input type="date" value="${d.exact ? d.end : ""}" data-cend="${cr.id}|${o.intake}" aria-label="${esc(o.code)} finishes"><br><span class="muted small">${d.exact ? "Date from LFS" : d.end ? `Expected ${fmtFull(d.end)}` : d.approx ? `In ${esc(d.approx)}` : "Not known yet"}</span></td></tr>`; }).join("")).join("")}
          </tbody></table></div>
          <h3 class="panel-sub">Fix someone's cohort</h3>
          <p class="muted small">For anyone repeating a term, intermitting or who picked the wrong code. Their term updates from the new cohort.</p>
          <form class="kit-add" id="fixTerm"><select name="sid" aria-label="Person">${members.filter(s => !s.guest).sort((a, b) => a.name.localeCompare(b.name)).map(s => `<option value="${s.id}">${esc(s.name)} · ${esc(tLabel(s) || "not set")}</option>`).join("")}</select><select name="cohort" aria-label="Cohort">${cohortSelectHtml("")}</select><button class="btn btn-ghost btn-sm">Save</button></form></section>`;

    if (adminTab === "langs") {
      const open = S.transFixes.filter(t => t.status === "open"), langs = transLangs();
      const roles = allRoles(), have = r => { const w = window.CCLang ? CCLang.lookup(r) : {}; return langs.filter(l => w[l.code] && w[l.code] !== r).length; };
      const gaps = roles.filter(r => have(r) < langs.length), added = Object.keys(S.customWords);
      body = !can("langs") ? lockedPanel("Languages") : `
        <section class="panel span-2"><h2 class="panel-h">Suggestions <span class="count">${open.length}</span></h2>
          <p class="muted small">From members who spotted a wrong word, and from Wikidata when a role is added. Check the wording, then use it. It changes for everyone straight away.</p>
          ${open.length ? `<ul class="tf-list">${open.map(t => `<li class="tf-item"><div class="tf-h"><b>${esc(langLabel(t.lang))}</b> <span class="muted small">${t.source === "Member" ? `from ${esc((student(t.by) || { name: "a former member" }).name)}` : t.ref ? `from <a href="${esc(t.ref)}" target="_blank" rel="noopener">${esc(t.source)}</a>` : `from ${esc(t.source)}`} · ${fmtFull(t.at)}</span>${t.page ? `<span class="tf-page small"><b>Page</b> <span data-noi18n>${esc(t.page)}${t.where ? ` · ${esc(t.where)}` : ""}</span></span>` : ""}</div>
            <div class="tf-grid"><label class="field"><span>English</span><input data-tfen="${t.id}" value="${esc(t.en)}" placeholder="The English words" data-noi18n></label>${t.now ? `<label class="field"><span>Now</span><input value="${esc(t.now)}" disabled data-noi18n></label>` : ""}<label class="field"><span>Use</span><input data-tfbetter="${t.id}" value="${esc(t.better)}" lang="${esc(t.lang)}" dir="${t.lang === "ar" ? "rtl" : "ltr"}" data-noi18n></label></div>
            ${t.why ? `<p class="small muted" data-noi18n>${esc(t.why)}</p>` : ""}
            <div class="rep-acts"><button class="btn btn-accent btn-sm" data-tfok="${t.id}">Use this</button><button class="btn btn-ghost btn-sm" data-tfno="${t.id}">Dismiss</button></div></li>`).join("")}</ul>` : `<p class="empty-sm">No suggestions waiting.</p>`}</section>
        <section class="panel"><h2 class="panel-h">Role names <span class="count">${roles.length - gaps.length}/${roles.length}</span></h2>
          <p class="muted small">Roles translated into every language. For the rest, look them up on Wikidata, where film role names are free to use, then check them. Short forms like DIT and VFX are often kept in English, which is fine.</p>
          ${gaps.length ? `<ul class="inv-list">${gaps.map(r => `<li><span>${esc(r)} <span class="muted small">${have(r)} of ${langs.length}</span></span><button class="btn btn-ghost btn-xs" data-wdrole="${esc(r)}">Look up</button></li>`).join("")}</ul>` : `<p class="empty-sm">Every role has a name in every language.</p>`}
          <label class="field mt"><span>Any role</span><select id="wdAny">${roles.map(r => `<option>${esc(r)}</option>`).join("")}</select></label><button class="btn btn-ghost btn-sm" id="wdAnyBtn">Look up on Wikidata</button></section>
        <section class="panel"><h2 class="panel-h">Added in the app <span class="count">${added.length}</span></h2>
          <p class="muted small">Translations saved here apply straight away. To keep them in the code too, download the file and add it to GitHub with this name. The next build folds it in.</p><p class="small"><code data-noi18n>tools/i18n/locales/app-additions.json</code></p>
          ${added.length ? `<ul class="inv-list">${added.slice(0, 12).map(en => `<li><span>${esc(en)}</span><span class="muted small">${Object.keys(S.customWords[en]).map(langLabel).join(", ")}</span></li>`).join("")}</ul>` : `<p class="empty-sm">Nothing yet.</p>`}
          <button class="btn btn-ghost btn-sm mt" id="tfDownload" ${added.length ? "" : "disabled"}>Download translations (JSON)</button></section>
        <section class="panel span-2"><h2 class="panel-h">Where translations come from</h2>
          <ul class="os-list">
            <li><b>Unicode CLDR</b> <span>Built into the browser. Gives month and day names, date order, plurals, lists such as "A, B and C", and phrases such as "yesterday" and "3 days ago". Always right, nothing to edit.</span> <a href="https://cldr.unicode.org/" target="_blank" rel="noopener">cldr.unicode.org</a></li>
            <li><b>Wikidata</b> <span>Role names in many languages, free to use (CC0). Used when you add a role or press Look up.</span> <a href="https://www.wikidata.org/" target="_blank" rel="noopener">wikidata.org</a></li>
            <li><b>OpenCC</b> <span>Makes Simplified Chinese from Traditional when the code is built.</span> <a href="https://github.com/BYVoid/OpenCC" target="_blank" rel="noopener">OpenCC</a></li>
            <li><b>Weblate</b> <span>A translation website where volunteers fix wording without touching code. The build writes files Weblate can read and edit. It's free for open-source projects; the steps are in the translation guide.</span> <a href="https://weblate.org/en/hosting/" target="_blank" rel="noopener">weblate.org</a></li>
            <li><b>LibreTranslate</b> <span>Open-source machine translation you can run on a free server. Drafts only. Always have a speaker check.</span> <a href="https://github.com/LibreTranslate/LibreTranslate" target="_blank" rel="noopener">LibreTranslate</a></li>
          </ul>
          <form class="kit-add" id="ltForm"><input name="url" inputmode="url" autocapitalize="off" spellcheck="false" value="${esc(shortUrl(S.settings.ltUrl || ""))}" placeholder="LibreTranslate server, e.g. translate.example.org" aria-label="LibreTranslate server"><button class="btn btn-ghost btn-sm">Save server</button>${S.settings.ltUrl ? `<button type="button" class="btn btn-ghost btn-sm" id="ltDraft">Draft missing role names</button>` : ""}</form></section>`;
    }

    if (adminTab === "lists") body = !can("setup") ? lockedPanel("Terms and lists") : `
        <section class="panel span-2"><h2 class="panel-h">Lists</h2>
          <p class="muted small">Edit the options people pick from. Removing an item doesn't change existing projects or profiles.</p>
          <div class="lists">
            <div><h3 class="panel-sub">Terms</h3><div class="chips">${C.TERMS.map((t, i) => `<span class="chip">${esc(t)}<button class="chip-x" data-rmlist="TERMS|${i}" aria-label="Remove ${esc(t)}">×</button></span>`).join("")}</div><form class="inv-form" data-addlist="TERMS"><input required placeholder="Add a term" aria-label="Add a term"><button class="btn btn-ghost btn-sm">Add</button></form></div>
            <div><h3 class="panel-sub">Cohorts</h3><p class="muted small">Cohort codes are worked out from each course. Edit them in <button type="button" class="link-btn" data-atab="terms">Terms and cohorts</button>.</p></div>
            <div><h3 class="panel-sub">Project types</h3><div class="chips">${C.TYPES.map((t, i) => `<span class="chip">${esc(t)}<button class="chip-x" data-rmlist="TYPES|${i}" aria-label="Remove ${esc(t)}">×</button></span>`).join("")}</div><form class="inv-form" data-addlist="TYPES"><input required placeholder="Add a type" aria-label="Add a project type"><button class="btn btn-ghost btn-sm">Add</button></form></div>
            <div class="span-2"><h3 class="panel-sub">Crew roles</h3>${Object.entries(C.ROLE_GROUPS).map(([g, rs]) => `<p class="rp-g">${esc(g)}</p><div class="chips">${rs.map((r, i) => `<span class="chip">${esc(r)}<button class="chip-x" data-rmrole="${esc(g)}|${i}" aria-label="Remove ${esc(r)}">×</button></span>`).join("")}</div>`).join("")}
              <form class="kit-add" id="roleAdd"><select name="g">${Object.keys(C.ROLE_GROUPS).map(g => `<option>${esc(g)}</option>`).join("")}</select><input name="r" required placeholder="New role, e.g. Drone Operator"><button class="btn btn-ghost btn-sm">Add role</button></form></div>
          </div></section>`;

    if (adminTab === "projects") {
      const allP = [...S.projects].sort((a, b) => b.shoots[0].from.localeCompare(a.shoots[0].from));
      body = !can("projects") ? lockedPanel("Projects") : `
        <section class="panel span-2"><h2 class="panel-h">All projects <span class="count">${allP.length}</span></h2>
          <ul class="ms-list">${allP.map(p => `<li class="ms-row" style="--c:${projColor(p)}"><button class="ms-t link-btn" data-proj="${p.id}">${esc(p.title)}</button><span class="ms-m">${esc(contactOf(p).name)} · ${p.shoots.map(fmtRange).join(" + ")}${hubOf(p).whatsapp ? " · WhatsApp" : ""}</span><span class="ms-s">${p.archived ? `<span class="st">Archived</span>` : isPast(p) ? `<span class="st">Wrapped</span>` : `<span class="st st-ok">Live</span>`}</span><span class="ms-a"><button class="btn btn-quiet btn-xs" data-arch="${p.id}">${p.archived ? "Restore" : "Archive"}</button><button class="btn btn-danger btn-xs" data-del="${p.id}">Delete</button></span></li>`).join("")}</ul></section>`;
    }

    if (adminTab === "reports") {
      const open = S.reports.filter(r => r.status === "open"), done = S.reports.filter(r => r.status !== "open");
      const row = r => { const by = student(r.by), t = reportTarget(r); return `<li class="rep-item ${r.status === "open" ? "rep-open" : ""}">
          <div class="rep-h"><b>${esc(r.reason)}</b> <span class="muted small">${r.kind === "general" ? "general" : `about the ${r.kind === "person" ? "profile" : r.kind}`} ${r.kind === "general" ? "" : t ? (r.kind === "project" ? `<button class="link-btn" data-proj="${r.target}">${esc(reportName(r))}</button>` : r.kind === "person" ? `<button class="link-btn" data-student="${r.target}">${esc(reportName(r))}</button>` : esc(reportName(r))) : "(removed)"} · ${fmtFull(r.at)} · from ${esc(by ? by.name : "former member")}</span></div>
          <p class="rep-d">${esc(r.details)}</p>
          ${r.status === "open" ? `<div class="rep-acts"><input data-repnote="${r.id}" placeholder="What you did, for the record" aria-label="Note"><button class="btn btn-accent btn-sm" data-represolve="${r.id}">Mark dealt with</button>${t && r.kind === "project" && !t.archived ? `<button class="btn btn-ghost btn-sm" data-rephide="${r.id}">Hide project</button>` : ""}${t && r.kind === "script" ? `<button class="btn btn-ghost btn-sm" data-rephide="${r.id}">Hide script</button>` : ""}${t && r.kind === "person" && t.id !== S.owner ? `<button class="btn btn-danger btn-sm" data-repremove="${r.id}">Remove person</button>` : ""}</div>`
            : `<p class="muted small">Dealt with on ${fmtFull(r.doneAt)} by ${esc((student(r.doneBy) || { name: "an admin" }).name)}${r.note ? `: ${esc(r.note)}` : ""}</p>`}</li>`; };
      body = !can("safety") ? lockedPanel("Reports and privacy") : `
        <section class="panel span-2"><h2 class="panel-h">Open reports <span class="count">${open.length}</span></h2>
          <p class="muted small">Anyone signed in can report a profile, project or script. Treat these as private. For anything involving safety, harassment or discrimination, pass it to LFS Student Services as well. Crew Call admins are students, not investigators.</p>
          ${open.length ? `<ul class="rep-list">${open.map(row).join("")}</ul>` : `<p class="empty-sm">No open reports.</p>`}
          ${done.length ? `<h3 class="panel-sub">Dealt with</h3><ul class="rep-list">${done.map(row).join("")}</ul>` : ""}</section>`;
    }

    if (adminTab === "privacy") {
      const due = retentionList();
      body = !can("safety") ? lockedPanel("Reports and privacy") : `
        <section class="panel span-2"><h2 class="panel-h">Privacy notice</h2>
          <p class="muted small">Shown in the footer and when people sign in. It's a draft: ask LFS to check it before launch.</p>
          <button class="btn btn-ghost btn-sm" data-privacy>Read the privacy notice</button></section>
        <section class="panel span-2"><h2 class="panel-h">Old profiles <span class="count">${due.length}</span></h2>
          <p class="muted small">Alumni and guests are deleted after <select id="retainMonths" aria-label="Months">${[6, 12, 18, 24].map(n => `<option ${n === S.settings.retainMonths ? "selected" : ""}>${n}</option>`).join("")}</select> months without signing in. </p>
          <label class="toggle"><input type="checkbox" id="autoClean" ${S.settings.autoClean !== false ? "checked" : ""}> Delete old profiles automatically each night</label>
          <p class="muted small">${S.settings.autoClean !== false ? "Each night the server emails a warning 30 days before, keeps the profile if they sign in, and then deletes it." : "Nothing is deleted on its own. The server still emails the warning; delete people by hand below."} The owner and admins are never removed.</p>
          ${due.length ? `<ul class="inv-list">${due.map(({ s, due: d, on }) => `<li><span><button class="link-btn" data-student="${s.id}">${esc(s.name)}</button> <span class="muted small">${esc(tLabel(s))} · last active ${fmtFull(lastSeen(s))}</span></span><span>${d ? `<span class="st st-pending">Due now</span> <button class="btn btn-danger btn-xs" data-retremove="${s.id}">Delete</button>` : `<span class="st">Deletes ${fmtFull(on)}</span> <button class="btn btn-quiet btn-xs" data-retwarn="${s.id}">Send warning</button>`}</span></li>`).join("")}</ul>` : `<p class="empty-sm">Nobody is due.</p>`}</section>
        <section class="panel span-2"><h2 class="panel-h">Backups</h2>
          <p class="muted small">Supabase's free plan doesn't back up your database, so the GitHub repository includes a nightly backup job (see docs/BACKUPS.md). You can also download a copy here at any time, and restore one if something goes wrong.</p>
          <div class="form-actions"><button class="btn btn-ghost btn-sm" data-export>Download a backup (JSON)</button><label class="btn btn-quiet btn-sm file-btn">Restore from a backup<input type="file" id="restoreFile" accept="application/json,.json" hidden></label></div></section>`;
    }

    if (adminTab === "log") body = `
        <section class="panel span-2"><h2 class="panel-h">Admin activity <span class="count">${S.adminLog.length}</span></h2>
          <p class="muted small">Every change to admins, ownership, emails and settings, so the next owner can see what happened.</p>
          ${S.adminLog.length ? `<ul class="inv-list">${S.adminLog.map(l => `<li><span>${esc(l.text)} <span class="muted small">by ${esc((student(l.by) || { name: "former member" }).name)}</span></span><span class="mono small">${fmtFull(l.at)}</span></li>`).join("")}</ul>` : `<p class="empty-sm">Nothing yet.</p>`}
          <button class="btn btn-ghost btn-sm mt" data-export>Export all data (JSON)</button></section>`;

    root.innerHTML = `
      <div class="view-head"><h1 class="page-title">Admin</h1><p class="muted">Run Crew Call without touching code. Changes apply for everyone straight away. You're ${isOwner() ? "the owner" : "an admin"}.</p></div>
      <label class="admin-pick"><span>Section</span><select id="adminPick" aria-label="Admin section">${ADMIN_GROUPS.map(([g, ts]) => g ? `<optgroup label="${esc(g)}">${ts.map(([id, l]) => `<option value="${id}" ${adminTab === id ? "selected" : ""}>${esc(l)}</option>`).join("")}</optgroup>` : ts.map(([id, l]) => `<option value="${id}" ${adminTab === id ? "selected" : ""}>${esc(l)}</option>`).join("")).join("")}</select></label>
      ${doneN && doneN < allN && adminTab !== "handover" ? `<p class="ho-nudge">Handover in progress: ${doneN} of ${allN} steps done. <button class="link-btn" data-atab="handover">Open checklist</button></p>` : ""}
      <div class="admin-layout"><nav class="admin-nav" aria-label="Admin sections">${ADMIN_GROUPS.map(([g, ts]) => `<div class="an-group">${g ? `<p class="an-h">${esc(g)}</p>` : ""}<div role="tablist" aria-orientation="vertical">${ts.map(tabBtn).join("")}</div></div>`).join("")}</nav>
      <div class="ms-grid admin-grid">${body}</div></div>`;
    bindOpeners(root);
    const on = (sel, fn) => root.querySelectorAll(sel).forEach(b => b.addEventListener("click", () => { fn(b); renderAdmin(); drawHeader(); }));
    const sub = (sel, fn) => { const f = root.querySelector(sel); if (f) f.addEventListener("submit", e => { e.preventDefault(); fn(e.target); }); };
    root.querySelectorAll("[data-atab]").forEach(b => b.addEventListener("click", () => { adminTab = b.dataset.atab; renderAdmin(); window.scrollTo({ top: 0 }); }));
    const ap = root.querySelector("#adminPick"); if (ap) ap.addEventListener("change", () => { adminTab = ap.value; renderAdmin(); window.scrollTo({ top: 0 }); });
    root.querySelectorAll("[data-export]").forEach(b => b.addEventListener("click", exportData));
    if (adminTab === "newsletter") bindNewsletter(root);
    if (adminTab === "access") bindReps(root);

    // reports + privacy
    const rep = id => S.reports.find(r => r.id === id);
    const closeRep = (r, note) => { Object.assign(r, { status: "done", doneAt: TODAY, doneBy: m.id, note }); const by = student(r.by); if (by && by.id !== m.id) notify(by.id, "update", `Thanks for your report about ${reportName(r)}. An admin has looked at it and dealt with it.`); logAdmin(`Closed a report about ${reportName(r)}`); };
    on("[data-represolve]", b => { const r = rep(b.dataset.represolve), n = root.querySelector(`[data-repnote="${r.id}"]`); closeRep(r, n ? n.value.trim() : ""); toast("Report closed"); });
    on("[data-rephide]", b => { const r = rep(b.dataset.rephide), t = reportTarget(r); if (r.kind === "project") t.archived = true; else t.hidden = true; closeRep(r, `Hid the ${r.kind}`); toast(`${reportName(r)} hidden`); render(); });
    root.querySelectorAll("[data-repremove]").forEach(b => b.addEventListener("click", () => { const r = rep(b.dataset.repremove), t = reportTarget(r); confirmBox(`Remove ${t.name}?`, "Their profile, availability and requests are deleted, and they're taken off any shoots. They can sign in again later unless you also tell LFS.", "Remove", () => { closeRep(r, "Removed the person"); removeStudent(t); closeModal(); renderAdmin(); drawHeader(); toast("Removed"); }); }));
    if ($("#autoClean")) $("#autoClean").addEventListener("change", e => { S.settings.autoClean = e.target.checked; logAdmin(e.target.checked ? "Turned on nightly clean-up of old profiles" : "Turned off nightly clean-up of old profiles"); renderAdmin(); });
    if ($("#retainMonths")) $("#retainMonths").addEventListener("change", e => { S.settings.retainMonths = +e.target.value; logAdmin(`Set old profiles to be deleted after ${S.settings.retainMonths} months`); renderAdmin(); });
    on("[data-retwarn]", b => { const s = student(b.dataset.retwarn); notify(s.id, "update", `Your Crew Call profile will be deleted soon because you haven't signed in for a while. Sign in to keep it.`); toast(`Warning sent to ${first(s.name)}`); });
    root.querySelectorAll("[data-retremove]").forEach(b => b.addEventListener("click", () => { const s = student(b.dataset.retremove); confirmBox(`Delete ${s.name}?`, `They haven't signed in for over ${S.settings.retainMonths} months. Their profile is deleted for good. Credits on wrapped shoots stay as text on the project.`, "Delete", () => { removeStudent(s); logAdmin(`Deleted old profile: ${s.name}`); closeModal(); renderAdmin(); toast("Deleted"); }); }));
    if ($("#restoreFile")) $("#restoreFile").addEventListener("change", e => { const file = e.target.files[0]; if (!file) return; file.text().then(t => { let d; try { d = JSON.parse(t); } catch (_) { return toast("That file isn't a Crew Call backup"); } if (!d.students || !d.projects) return toast("That file isn't a Crew Call backup"); confirmBox("Restore this backup?", `From ${esc(d.exported || "an unknown date")}: ${d.students.length} people and ${d.projects.length} projects. Everything now in Crew Call is replaced.`, "Restore", () => { ["students", "projects", "requests", "invites", "scripts", "scriptInterest", "releases", "releaseInterest", "posts", "postInterest", "funds", "gigs", "gigApps", "reps", "reports", "admins", "adminPerms", "adminVia", "settings", "handover", "newsletters", "nlAuto", "adminLog", "customWords", "transFixes"].forEach(k => { if (d[k]) S[k] = d[k]; }); if (d.owner) S.owner = d.owner; langsUpgrade(); if (d.termDates) C.TERM_DATES = d.termDates; if (d.courses) C.COURSES = d.courses; if (!student(S.meId)) S.meId = S.owner; logAdmin(`Restored a backup from ${d.exported || "unknown date"}`); applyTerms(false); refreshCohortFilter(); closeModal(); drawHeader(); render(); toast("Backup restored"); }, false); }); });

    // access
    if ($("#ownerBtn")) $("#ownerBtn").addEventListener("click", () => {
      const to = student($("#ownerTo").value);
      confirmBox(`Make ${to.name} the owner?`, `${esc(first(to.name))} gets every permission and becomes the only person who can transfer ownership. You stay an admin with every permission until someone removes you. Then invite them as Owner in the GitHub and Supabase organisations.`, "Transfer ownership", () => {
        const from = me(); S.owner = to.id; S.adminPerms[from.id] = [...ALL_PERMS]; S.adminPerms[to.id] = [...ALL_PERMS];
        S.handover.log.push({ at: TODAY, from: `${from.name} (${tLabel(from)})`, to: to.name }); S.handover.done.a3 = true;
        notify(to.id, "update", `${from.name} made you the owner of Crew Call. The handover checklist is in Admin.`);
        logAdmin(`Transferred ownership from ${from.name} to ${to.name}`);
        closeModal(); toast(`${to.name} is now the owner`); renderAdmin(); drawHeader();
      }, false);
    });
    sub("#adminAddForm", f => { const s = student(f.sid.value); if (!s) return; const ps = [...f.querySelectorAll("[name=perm]:checked")].map(i => i.value); if (!ps.length) return toast("Tick at least one permission");
      S.admins.push(s.id); S.adminPerms[s.id] = ps; notify(s.id, "update", `${m.name} made you a Crew Call admin (${ps.map(k => PERMS.find(x => x[0] === k)[1].toLowerCase()).join(", ")}).`);
      logAdmin(`Made ${s.name} an admin (${ps.map(k => PERMS.find(x => x[0] === k)[1].toLowerCase()).join(", ")})`); toast(`${s.name} is now an admin`); renderAdmin(); });
    root.querySelectorAll("[data-perm]").forEach(cb => cb.addEventListener("change", () => { const [id, k] = cb.dataset.perm.split("|"), ps = new Set(S.adminPerms[id] || []); cb.checked ? ps.add(k) : ps.delete(k); S.adminPerms[id] = [...ps];
      const lbl = PERMS.find(x => x[0] === k)[1]; logAdmin(`${cb.checked ? "Gave" : "Took away"} ${lbl} ${cb.checked ? "to" : "from"} ${student(id).name}`); toast(`${student(id).name}: ${lbl} ${cb.checked ? "on" : "off"}`); if (id === m.id) renderAdmin(); }));
    on("[data-unadmin]", b => { const s = student(b.dataset.unadmin); if (s.id === S.owner) return; S.admins = S.admins.filter(x => x !== s.id); delete S.adminPerms[s.id]; logAdmin(`Removed ${s.name} as admin`); toast(`${s.name} is no longer an admin`); if (!isAdmin()) setView("calendar"); });
    sub("#emailFix", f => {
      const s = student(f.sid.value), e = f.email.value.trim().toLowerCase(), err = $("#emailFixErr"), old = s.email;
      if (S.students.some(x => x.email.toLowerCase() === e && x.id !== s.id)) return (err.textContent = "Someone already uses that email.");
      if (!s.guest && !C.LFS_DOMAINS.includes(e.split("@")[1])) return (err.textContent = `Students need an LFS address (${C.LFS_DOMAINS.join(" or ")}).`);
      if (e === old.toLowerCase()) return (err.textContent = "That's already their email.");
      s.email = e; S.projects.forEach(p => { if (p.email === old) p.email = e; if (p.producer && p.producer.email === old) p.producer.email = e; (p.producers || []).forEach(x => { if (x.email === old) x.email = e; }); });
      notify(s.id, "update", `${m.name} changed your sign-in email from ${old} to ${e}. Use the new one next time you sign in.`);
      logAdmin(`Changed ${s.name}'s sign-in email from ${old} to ${e}`); toast(`${s.name} now signs in with ${e}`); renderAdmin(); drawHeader();
    });
    on("[data-rmguest]", b => { const s = student(b.dataset.rmguest); removeStudent(s); logAdmin(`Removed guest ${s.name}`); toast(`${s.name} removed`); });
    on("[data-revoke]", b => { const i = S.invites[+b.dataset.revoke]; S.invites.splice(+b.dataset.revoke, 1); logAdmin(`Revoked invite for ${i.email}`); toast("Invite revoked"); });

    // email
    sub("#mailForm", f => { const was = S.settings.senderEmail; ["senderName", "senderEmail", "replyTo", "schoolAlias", "digestDay", "digestTime"].forEach(k => (S.settings[k] = f[k].value.trim()));
      logAdmin(`Updated email settings${was !== S.settings.senderEmail ? ` (sending address now ${S.settings.senderEmail})` : ""}`); toast(was !== S.settings.senderEmail ? "Saved. Update the SMTP details in Supabase too" : "Email settings saved"); renderAdmin(); });

    // handover
    root.querySelectorAll("[data-ho]").forEach(cb => cb.addEventListener("change", () => { S.handover.done[cb.dataset.ho] = cb.checked; renderAdmin(); }));
    if ($("#hoReset")) $("#hoReset").addEventListener("click", () => confirmBox("Start a fresh checklist?", "This clears every tick for the next handover. Your notes and the list of owners stay.", "Clear ticks", () => { S.handover.done = {}; logAdmin("Started a fresh handover checklist"); closeModal(); renderAdmin(); }, false));
    if ($("#hoSave")) $("#hoSave").addEventListener("click", () => { S.handover.notes = $("#hoNotes").value.trim(); logAdmin("Updated the handover notes"); toast("Notes saved"); });

    // projects, terms, lists
    on("[data-arch]", b => { const p = project(b.dataset.arch); p.archived = !p.archived; });
    root.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => deleteProject(project(b.dataset.del))));
    on("[data-rmlist]", b => { const [k, i] = b.dataset.rmlist.split("|"); C[k].splice(+i, 1); refreshLists(); });
    on("[data-rmrole]", b => { const [g, i] = b.dataset.rmrole.split("|"); C.ROLE_GROUPS[g].splice(+i, 1); refreshLists(); });
    root.querySelectorAll("[data-addlist]").forEach(f => f.addEventListener("submit", e => { e.preventDefault(); const v = f.querySelector("input").value.trim(); if (v && !C[f.dataset.addlist].includes(v)) C[f.dataset.addlist].push(v); refreshLists(); renderAdmin(); }));
    sub("#roleAdd", f => { const g = f.g.value, r = f.r.value.trim(); if (r && !allRoles().includes(r)) { C.ROLE_GROUPS[g].push(r); toast(`${r} added. Looking for translations on Wikidata`); suggestRoleWords(r).then(n => { if (n) toast(`${n} translation${n === 1 ? "" : "s"} for ${r} from Wikidata. Check them in Admin, Languages`); drawHeader(); }); } refreshLists(); renderAdmin(); });
    // languages
    const tf = id => S.transFixes.find(t => t.id === id);
    on("[data-tfok]", b => { const t = tf(b.dataset.tfok), en = (root.querySelector(`[data-tfen="${t.id}"]`) || {}).value || t.en, v = (root.querySelector(`[data-tfbetter="${t.id}"]`) || {}).value || t.better;
      if (!en.trim()) return toast("Add the English words first, so Crew Call knows what to replace");
      saveWords(en.trim(), { [t.lang]: v }, t.source === "Member" ? "Used a member's translation" : `Used a ${t.source} translation`); t.status = "done";
      const by = student(t.by); if (by && by.id !== m.id) notify(by.id, "update", `Thanks: your ${langLabel(t.lang)} translation is now live.`); toast("Translation saved"); });
    on("[data-tfno]", b => { tf(b.dataset.tfno).status = "dismissed"; toast("Dismissed"); });
    root.querySelectorAll("[data-wdrole]").forEach(b => b.addEventListener("click", () => openWikidata(b.dataset.wdrole)));
    if ($("#wdAnyBtn")) $("#wdAnyBtn").addEventListener("click", () => openWikidata($("#wdAny").value));
    if ($("#tfDownload")) $("#tfDownload").addEventListener("click", () => { const blob = new Blob([JSON.stringify(S.customWords, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "app-additions.json"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); });
    sub("#ltForm", f => { S.settings.ltUrl = cleanUrl(f.url.value); logAdmin(S.settings.ltUrl ? "Set a LibreTranslate server" : "Removed the LibreTranslate server"); toast("Saved"); renderAdmin(); });
    if ($("#ltDraft")) $("#ltDraft").addEventListener("click", async () => { toast("Drafting with LibreTranslate…"); let n = 0;
      try { for (const r of allRoles()) { const w = CCLang.lookup(r); for (const l of transLangs()) { if (w[l.code] && w[l.code] !== r) continue; const v = await libreDraft(r, l.code); if (v) { S.transFixes.unshift({ id: uid("tf"), en: r, lang: l.code, now: "", better: v, by: null, source: "LibreTranslate (machine draft)", at: TODAY, status: "open" }); n++; } } } }
      catch (e) { return toast("Couldn't reach the LibreTranslate server"); }
      toast(n ? `${n} drafts added to Suggestions. Check each one` : "Nothing missing"); renderAdmin(); });
    root.querySelectorAll("[data-td]").forEach(inp => inp.addEventListener("change", () => { const [id, k] = inp.dataset.td.split("|"), t = periodById(id); if (inp.value) t[k] = inp.value; if (t.end < t.start) { toast("End date is before the start"); } renderAdmin(); }));
    sub("#tdAdd", f => { if (f.end.value < f.start.value) return toast("End date is before the start"); C.TERM_DATES.push({ id: uid("t"), name: f.name.value.trim(), start: f.start.value, end: f.end.value }); logAdmin(`Added term dates for ${f.name.value.trim()}`); toast(`${f.name.value.trim()} added`); renderAdmin(); });
    if ($("#lockWeeks")) $("#lockWeeks").addEventListener("change", e => { C.LOCK_WEEKS = +e.target.value; renderAdmin(); });
    if ($("#adminPreview")) $("#adminPreview").addEventListener("click", () => { previewNextTerm(); renderAdmin(); });
    root.querySelectorAll("[data-tden]").forEach(inp => inp.addEventListener("change", () => { const [id, i] = inp.dataset.tden.split("|"), t = periodById(id); if (!t) return; t.enrol = t.enrol || []; t.enrol[+i] = inp.value; if (!t.enrol[1]) t.enrol[1] = t.enrol[0]; logAdmin(`Changed the ${t.name} enrolment dates`); toast("Saved"); renderAdmin(); }));
    root.querySelectorAll("[data-cend]").forEach(inp => inp.addEventListener("change", () => { const [id, intake] = inp.dataset.cend.split("|"), cr = courseById(id); if (!cr) return; cr.endByIntake = cr.endByIntake || {}; if (inp.value) cr.endByIntake[intake] = inp.value; else delete cr.endByIntake[intake]; const n = applyTerms(false); logAdmin(`Set when ${cohortCode(cr, +intake)} finishes: ${inp.value ? fmtFull(inp.value) : "back to the expected date"}`); toast(n ? `Saved. ${n} profile${n === 1 ? "" : "s"} updated` : "Saved"); drawHeader(); renderAdmin(); }));
    root.querySelectorAll("[data-canchor-c]").forEach(inp => inp.addEventListener("change", () => { const cr = courseById(inp.dataset.canchorC), t = +root.querySelector(`[data-canchor-t="${cr.id}"]`).value, code = parseInt(inp.value, 10), cur = startedTerm() || nextTerm(); if (!code || !cur) return; cr.anchor = { code, term: t, periodId: cur.id }; const n = applyTerms("admin"); logAdmin(`Set ${cr.prefix}${code} as the Term ${t} ${cr.name} cohort`); toast(`${cr.prefix}${code} is Term ${t}. ${n} profile${n === 1 ? "" : "s"} updated`); drawHeader(); renderAdmin(); }));
    root.querySelectorAll("details[data-course]").forEach(d => d.addEventListener("toggle", () => { if (d.open) openCourse = d.dataset.course; else if (openCourse === d.dataset.course) openCourse = null; }));
    root.querySelectorAll("[data-cedit]").forEach(el => el.addEventListener("change", () => {
      const [id, k] = el.dataset.cedit.split("|"), cr = courseById(id); if (!cr) return;
      let v = el.value.trim(); if (k === "terms") v = +v; if (k === "name" && !v) return renderAdmin();
      if (k === "every" && v === "term" && !cr.anchor) { const cur = startedTerm() || nextTerm(); cr.anchor = { code: 1, term: 1, periodId: cur ? cur.id : "" }; if (!cr.prefix) cr.prefix = cr.name.split(/\s+/).map(w => w[0]).join("").toUpperCase(); }
      const old = cr[k]; cr[k] = v; const n = applyTerms("admin");
      logAdmin(`Changed ${cr.name}: ${k} from ${old === undefined || old === "" ? "blank" : old} to ${v === "" ? "blank" : v}`);
      toast(n ? `${cr.name} saved. ${n} profile${n === 1 ? "" : "s"} updated` : `${cr.name} saved`); refreshCohortFilter(); renderAdmin(); }));
    on("[data-cclose]", b => { const cr = courseById(b.dataset.cclose); cr.closed = !cr.closed;
      const live = cohortOptions(cr).filter(o => o.n >= 1); cr.lastIntake = cr.closed ? (live.length ? Math.max(...live.map(o => o.intake)) : null) : null;
      logAdmin(`${cr.closed ? "Closed" : "Reopened"} ${cr.name} ${cr.closed ? "to" : "for"} new students`); toast(cr.closed ? `${cr.name} closed. Current cohorts carry on until they finish` : `${cr.name} reopened`); });
    sub("#courseAdd", f => { const name = f.name.value.trim(); if (!name) return; const every = f.every.value, terms = +f.terms.value;
      const id = "C" + uid("").toUpperCase(), cur = startedTerm() || nextTerm(), short = name.replace(/^MA\s+/i, "");
      const cr = { id, name, every, terms, prefix: every === "term" ? name.split(/\s+/).map(w => w[0]).join("").toUpperCase() : "", label: short, ends: every === "term" ? "gradterm" : "sept", endByIntake: {} };
      if (every === "term") cr.anchor = { code: 1, term: 1, periodId: cur ? cur.id : "" };
      C.COURSES.push(cr); openCourse = id; if (!C.TERMS.includes(short) && every === "year") C.TERMS.push(short);
      logAdmin(`Added the course ${name}`); toast(`${name} added. Check its details below`); renderAdmin(); });
    root.querySelectorAll("[data-canchor-t]").forEach(sel => sel.addEventListener("change", () => { const cr = courseById(sel.dataset.canchorT), o = cohortOptions(cr).find(x => x.n === +sel.value); const inp = root.querySelector(`[data-canchor-c="${cr.id}"]`); if (o) inp.value = o.intake; }));
    root.querySelectorAll("[data-cprefix]").forEach(inp => inp.addEventListener("change", () => { const cr = courseById(inp.dataset.cprefix); cr.prefix = inp.value.trim().toUpperCase(); S.students.forEach(s => { if (s.course === cr.id) s.cohort = cohortCode(cr, s.intake); }); refreshCohortFilter(); logAdmin(`Changed ${cr.name} cohort codes to ${cohortCode(cr, Math.floor(curPeriod() / 3))}`); renderAdmin(); }));
    sub("#fixTerm", f => { const s = student(f.sid.value); if (!f.cohort.value) return; setCohort(s, f.cohort.value); Object.assign(s, { termFor: termForToday(), termConfirmed: true }); refreshCohortFilter(); notify(s.id, "term", `${m.name} (admin) set your cohort to ${s.cohort}, so your profile now says ${s.term}.`); logAdmin(`Set ${s.name} to ${s.cohort} (${s.term})`); toast(`${s.name} is now ${tLabel(s)}`); renderAdmin(); });
  }
  function refreshLists() {
    fillSelect($("#calRole"), allRoles()); fillSelect($("#calTerm"), C.TERMS);
    fillSelect($("#crewTerm"), C.TERMS); fillSelect($("#crewCohort"), liveCohorts()); drawCrewChips();
  }
  function removeStudent(s) {
    S.projects.forEach(p => { p.roles.forEach(r => { if (r.filledBy === s.id) { r.filledBy = null; if (!isPast(p)) managersOf(p).forEach(x => x.id !== s.id && notify(x.id, "update", `${s.name} left Crew Call, so ${r.role} on ${p.title} is open again.`, p.id)); } }); p.shadows = p.shadows.filter(x => x.sid !== s.id); });
    S.requests = S.requests.filter(q => q.sid !== s.id);
    S.admins = S.admins.filter(x => x !== s.id); delete S.adminPerms[s.id];
    S.notifications = S.notifications.filter(n => n.to !== s.id);
    S.students.splice(S.students.indexOf(s), 1);
  }

  // ---------- MY PROFILE ----------
  const meForm = $("#meForm");
  // My profile is split into tabs like the project window, with Availability first
  let meTab = null;
  function showMeTab(k) {
    if (!$("#mtp-" + k)) return;
    meTab = k;
    $$("[data-mtab]").forEach(b => { const on = b.dataset.mtab === k; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; });
    $$(".me-panel").forEach(x => (x.hidden = x.id !== "mtp-" + k));
  }
  $$("[data-mtab]").forEach(b => b.addEventListener("click", () => showMeTab(b.dataset.mtab)));
  $(".me-tabs").addEventListener("keydown", e => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const bs = $$("[data-mtab]"), i = bs.indexOf(document.activeElement); if (i < 0) return;
    const rtl = document.dir === "rtl", fwd = (e.key === "ArrowRight") !== rtl;
    const n = bs[(i + (fwd ? 1 : bs.length - 1)) % bs.length]; n.focus(); n.click();
  });
  const meCount = (k, n) => { const c = $(`[data-mcount="${k}"]`); if (c) { c.hidden = !n; c.textContent = n || ""; } };
    fillSelect(meForm.pathway, C.PATHWAYS, false);
  $("#kitCat").innerHTML = C.KIT_CATS.map(c => `<option>${c}</option>`).join("");
  let meRoles = new Set(), mePrimary = "", meKit = [], meLearn = new Set(), meAutoT = 0, meAutoFor = null;
  function drawRolePicker() {
    meCount("roles", meRoles.size);
    $("#meRoles").innerHTML = Object.entries(C.ROLE_GROUPS).map(([g, rs]) => `
      <div class="rp-group"><p class="rp-g">${esc(g)}</p><div class="chips">${rs.map(r => {
        const on = meRoles.has(r), pri = mePrimary === r;
        return `<span class="rp-item ${on ? "on" : ""}"><button type="button" class="chip chip-toggle" aria-pressed="${on}" data-r="${esc(r)}">${esc(r)}</button>${on ? `<button type="button" class="star ${pri ? "on" : ""}" data-star="${esc(r)}" aria-label="Make ${esc(r)} my main role" aria-pressed="${pri}">★</button>` : ""}</span>`;
      }).join("")}</div></div>`).join("") + `<p class="small muted rp-sum">${meRoles.size ? `${meRoles.size} role${meRoles.size > 1 ? "s" : ""} selected${mePrimary ? `, main: ${esc(mePrimary)}` : ". Tap ★ to set your main role"}` : "No roles yet"}</p>`;
  }
  $("#meRoles").addEventListener("click", e => {
    const s = e.target.closest("[data-star]"), b = e.target.closest("[data-r]");
    if (s) mePrimary = mePrimary === s.dataset.star ? "" : s.dataset.star;
    else if (b) { const r = b.dataset.r; if (meRoles.has(r)) { meRoles.delete(r); if (mePrimary === r) mePrimary = ""; } else { meRoles.add(r); meLearn.delete(r); if (!mePrimary) mePrimary = r; } drawLearn(); }
    drawRolePicker();
  });
  function drawLearn() {
    $("#meLearn").innerHTML = `<div class="chips">${allRoles().filter(r => !meRoles.has(r)).map(r => `<button type="button" class="chip chip-toggle chip-learn-t" aria-pressed="${meLearn.has(r)}" data-l="${esc(r)}">${esc(r)}</button>`).join("")}</div><p class="small muted rp-sum">${meLearn.size ? `Learning: ${esc([...meLearn].join(", "))}` : "None picked"}</p>`;
  }
  $("#meLearn").addEventListener("click", e => { const b = e.target.closest("[data-l]"); if (!b) return; const r = b.dataset.l; meLearn.has(r) ? meLearn.delete(r) : meLearn.add(r); drawLearn(); });
  function drawKit() {
    meCount("kit", meKit.length);
    $("#meKit").innerHTML = meKit.length ? `<ul class="kit-list">${meKit.map((k, i) => `<li><span class="kit-cat">${esc(k.cat)}</span>${esc(k.item)}<button type="button" class="chip-x" data-k="${i}" aria-label="Remove ${esc(k.item)}">×</button></li>`).join("")}</ul>` : `<p class="muted small">No kit added. Owning kit makes you much easier to book.</p>`;
  }
  $("#meKit").addEventListener("click", e => { const b = e.target.closest("[data-k]"); if (b) { meKit.splice(+b.dataset.k, 1); drawKit(); } });
  const addKit = () => { const v = $("#kitItem").value.trim(); if (!v) return; meKit.push({ cat: $("#kitCat").value, item: v }); $("#kitItem").value = ""; drawKit(); };
  $("#kitAddBtn").addEventListener("click", addKit);
  $("#kitItem").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); addKit(); } });

  // availability picker
  let pickMonth = TODAY.slice(0, 7) + "-01", painting = null;
  const pickTarget = () => (me() ? me().days : []);
  const setDay = (d, on) => { if (me()) toggleDay(me(), d, on); };
  function drawPicker() {
    const m = D(pickMonth), cur = m.getUTCMonth();
    $("#pickLabel").textContent = `${MONTH_FULL[cur]} ${m.getUTCFullYear()}`;
    const off = (m.getUTCDay() + 6) % 7, start = addDays(pickMonth, -off);
    const last = new Date(Date.UTC(m.getUTCFullYear(), cur + 1, 0)).getUTCDate();
    const total = Math.ceil((off + last) / 7) * 7, mine = me(), days = pickTarget();
    let h = "";
    for (let i = 0; i < total; i++) {
      const d = addDays(start, i), dd = D(d), out = dd.getUTCMonth() !== cur, past = d < TODAY;
      const booked = mine ? bookedOn(mine.id, d) : [], on = days.includes(d);
      const cls = ["pk", out && "out", past && "past", on && "on", booked.length && "booked", d === TODAY && "today"].filter(Boolean).join(" ");
      h += `<button type="button" class="${cls}" data-pk="${d}" ${past || booked.length || out ? "disabled" : ""} aria-pressed="${on}" aria-label="${fmtDay(d)}${booked.length ? ", booked on " + esc(booked[0].title) : on ? ", free" : ", not free"}">
        <span class="pk-n">${dd.getUTCDate()}</span>${booked.length ? `<span class="pk-b" style="--c:${projColor(booked[0])}">${esc(booked[0].title)}</span>` : on ? `<span class="pk-f">Free</span>` : ""}</button>`;
    }
    $("#pickGrid").innerHTML = h;
    const inMonth = days.filter(d => d.slice(0, 7) === pickMonth.slice(0, 7)).length;
    $("#pickSum").textContent = `${inMonth} free day${inMonth === 1 ? "" : "s"} in ${MONTH_FULL[cur]} · ${days.filter(d => d >= TODAY).length} upcoming in total`;
    $("#pickSaved").textContent = mine ? `${updatedLabel(mine)}. Changes save automatically.` : "";
  }
  const pg = $("#pickGrid");
  pg.addEventListener("pointerdown", e => { const b = e.target.closest(".pk"); if (!b || b.disabled) return; e.preventDefault(); painting = !pickTarget().includes(b.dataset.pk); setDay(b.dataset.pk, painting); drawPicker(); });
  pg.addEventListener("pointerover", e => { if (painting === null) return; const b = e.target.closest(".pk"); if (!b || b.disabled) return; if (pickTarget().includes(b.dataset.pk) !== painting) { setDay(b.dataset.pk, painting); drawPicker(); } });
  pg.addEventListener("pointermove", e => { if (painting === null || e.pointerType === "mouse") return; const el = document.elementFromPoint(e.clientX, e.clientY), b = el && el.closest(".pk"); if (b && !b.disabled && pickTarget().includes(b.dataset.pk) !== painting) { setDay(b.dataset.pk, painting); drawPicker(); } });
  pg.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { const b = e.target.closest(".pk"); if (b && !b.disabled) { e.preventDefault(); setDay(b.dataset.pk, !pickTarget().includes(b.dataset.pk)); drawPicker(); pg.querySelector(`[data-pk="${b.dataset.pk}"]`).focus(); } } });
  pg.addEventListener("click", e => e.preventDefault());
  window.addEventListener("pointerup", () => { painting = null; });
  $("#pickPrev").onclick = () => { const d = D(pickMonth); d.setUTCMonth(d.getUTCMonth() - 1); pickMonth = iso(d); drawPicker(); };
  $("#pickNext").onclick = () => { const d = D(pickMonth); d.setUTCMonth(d.getUTCMonth() + 1); pickMonth = iso(d); drawPicker(); };
  const bulk = (fn, on) => { const m = D(pickMonth), last = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 0)).getUTCDate(); daysIn(pickMonth, addDays(pickMonth, last - 1)).filter(d => d >= TODAY && fn(D(d).getUTCDay()) && !(me() && bookedOn(me().id, d).length)).forEach(d => setDay(d, on)); drawPicker(); };
  $("#pickWeekdays").onclick = () => bulk(w => w >= 1 && w <= 5, true);
  $("#pickWeekends").onclick = () => bulk(w => w === 0 || w === 6, true);
  $("#pickClear").onclick = () => bulk(() => true, false);

  function loadMe() {
    if (meAutoT) { clearTimeout(meAutoT); autoSaveMe(); }
    const m = me(); if (!m) return;
    const g = $("#meGuest");
    g.hidden = !m.guest && !m.incomplete;
    g.innerHTML = m.incomplete ? "Welcome. Fill in About me, pick at least one role under Roles, and you'll appear in Crew search and on the calendar. Everything saves as you type." : `You're a guest${m.invitedBy && student(m.invitedBy) ? `, invited by ${esc(student(m.invitedBy).name)}` : ""}. You can do everything except invite other people.`;
    meForm.name.value = m.name; meForm.email.value = m.email; meForm.based.value = m.based || ""; meForm.pref.value = m.pref || ""; meForm.from.value = m.from || "";
    drawTermFields(m); meForm.pathway.value = m.pathway;
    meForm.reel.value = shortUrl(m.reel || ""); meForm.site.value = shortUrl(m.site || ""); meForm.imdb.value = shortUrl(m.imdb || ""); meForm.insta.value = m.insta && /instagram\.com\/([^/?#]+)/.test(m.insta) ? "@" + /instagram\.com\/([^/?#]+)/.exec(m.insta)[1] : shortUrl(m.insta || ""); meForm.bio.value = m.bio || "";
    meForm.openToOffers.checked = !!m.openToOffers; meForm.shareEmail.checked = !!m.shareEmail; meForm.hideMe.checked = !!m.hideMe;
    const n = notifyOf(m);
    meForm.nApply.checked = n.apply; meForm.nDigest.checked = n.digest; meForm.nMatch.checked = n.match; meForm.nUpdates.checked = n.updates; meForm.nNews.checked = n.news; meForm.nWhen.value = n.when;
    meForm.querySelector(`[name=nScope][value=${n.scope}]`).checked = true; syncDigestOpts();
    meRoles = new Set(m.roles); mePrimary = m.primary; meKit = [...m.kit]; meLearn = new Set(m.learn);
    const cr = creditsOf(m);
    $("#meCredits").innerHTML = cr.length ? `<ul class="credit-list">${cr.map(x => `<li><span class="cr-role">${x.shadow ? "Shadow " : ""}${esc(x.role)}</span><button type="button" class="link-btn" data-proj="${x.p.id}">${esc(x.p.title)}</button><span class="muted">${esc(x.p.type)} · ${monYear(x.p.shoots[0].from)}</span></li>`).join("")}</ul>` : `<p class="muted small">Once a shoot you're locked on wraps, it's added here automatically.</p>`;
    { const cand = S.projects.filter(p => !p.archived && isPast(p) && !onProject(p, m.id) && !addMeOf(p, m.id)).sort((x, y) => y.shoots[0].from.localeCompare(x.shoots[0].from)), waiting = S.requests.filter(q => q.type === "addme" && q.sid === m.id && q.status === "pending" && project(q.pid));
      $("#meCredits").insertAdjacentHTML("beforeend", `${waiting.length ? `<ul class="credit-list cr-wait">${waiting.map(q => `<li><span class="cr-role">${esc(q.role)}</span><button type="button" class="link-btn" data-proj="${q.pid}">${esc(project(q.pid).title)}</button><span class="st st-pending">Sent · waiting</span></li>`).join("")}</ul>` : ""}
        ${cand.length ? `<div class="cr-add"><label class="field"><span>Missing a credit?</span><select id="crAddSel"><option value="">Pick a wrapped project…</option>${cand.map(p => `<option value="${p.id}">${esc(p.title)} · ${monYear(p.shoots[0].from)}</option>`).join("")}</select></label><button type="button" class="btn btn-ghost btn-sm" id="crAddBtn">Add me to the crew</button></div>` : ""}`);
      const go = () => { const v = $("#crAddSel").value; if (v) openAddMe(project(v)); };
      if ($("#crAddBtn")) $("#crAddBtn").onclick = go; }
    bindOpeners($("#meCredits"));
    drawPicker(); drawRolePicker(); drawKit(); drawLearn();
    meCount("credits", cr.length);
    // first visit: someone new starts on About me (name, cohort and roles are what they need first); everyone else on Availability
    showMeTab(meTab || (m.incomplete ? "about" : "days"));
    $("#meSaved").textContent = "";
  }
  function drawTermFields(m) {
    const ed = termEditable(m), now = termNow(), nxt = nextTerm();
    meForm.cohort.innerHTML = m.guest ? `<option>Guest, not an LFS student</option>` : cohortSelectHtml(cohortVal(m), cohortVal(m) ? "" : "Pick your course and cohort");
    meForm.cohort.disabled = !ed;
    $("#termLock").textContent = m.guest ? "" : ed ? "" : "locked";
    const showTerm = () => {
      const v = meForm.cohort.value, tmp = { ...m };
      if (!m.guest && v && v.includes("|")) setCohort(tmp, v);
      meForm.termShow.value = m.guest ? "Guest" : v ? tmp.term : "";
      return tmp;
    };
    meForm.cohort.onchange = () => { showTerm(); drawNote(); };
    const drawNote = () => {
      const tmp = showTerm(), note = $("#termNote");
      const cr = courseById(tmp.course), nextT = nxt && cr && tmp.intake != null ? termName(cr, courseTermNo(cr, tmp.intake, periodNo(nxt)), tmp.intake, nxt.start) : "";
      const moveUp = nextT && nextT !== tmp.term ? ` When ${nxt.name} starts on ${fmtFull(nxt.start)} you'll become ${nextT} automatically, and we'll ask you to check it.` : "";
      if (m.guest) { note.innerHTML = "Guests don't have a course, term or cohort."; return; }
      const dates = cr && tmp.intake != null ? `<span class="cohort-dates">${esc(cohortDatesText(cr, tmp.intake))}</span>${cr.note ? `<span class="cohort-dates">${esc(cr.note)}</span>` : ""}` : "";
      if (!meForm.cohort.value) note.innerHTML = `Pick your course and cohort code, for example MAF217. You only do this once: Crew Call works out your term from it at the start of every term.`;
      else if (!m.termConfirmed) note.innerHTML = `<b>New term.</b> Check this is right, then save. If you're repeating a term or intermitting, pick your new cohort. You can change it until ${fmtFull(lockDate(startedTerm()))}.`;
      else if (ed) note.innerHTML = now ? `You can change this until ${fmtFull(lockDate(now))}, then it locks for the rest of ${now.name}.${moveUp}` : `It's the holidays, so you can still change this.${moveUp}`;
      else note.innerHTML = `Locked for ${now ? now.name : "this term"}. Changes closed on ${fmtFull(lockDate(now))}.${moveUp} Wrong? Ask an admin to fix it.${nxt && !LIVE ? ` <button type="button" class="link-btn" id="previewRoll">Prototype: preview ${fmtDay(nxt.start)} ${D(nxt.start).getUTCFullYear()}</button>` : ""}`;
      if (dates) note.insertAdjacentHTML("afterbegin", dates);
      const pr = $("#previewRoll"); if (pr) pr.onclick = previewNextTerm;
    };
    drawNote();
  }
  function previewNextTerm() {
    const nxt = nextTerm(); if (!nxt) return toast("No more term dates set");
    TODAY = nxt.start; calMonth = TODAY.slice(0, 7) + "-01"; selDay = TODAY; const n = rollTerms();
    drawHeader(); render();
    toast(`Previewing ${fmtFull(TODAY)}: ${n} profile${n === 1 ? "" : "s"} moved up a term and notified`);
  }
  // Autosave: what you type on your profile is kept as you go, so leaving the page or tab loses nothing.
  // Anything that doesn't pass a check yet (a link that isn't a web address, no roles) waits for Save.
  function autoSaveMe() {
    meAutoT = 0; const m = me(); if (!m || m.id !== meAutoFor) return;
    const pf = { reel: cleanUrl(meForm.reel.value), site: cleanUrl(meForm.site.value), imdb: cleanImdb(meForm.imdb.value), insta: cleanInsta(meForm.insta.value) };
    PORTFOLIO.forEach(([k]) => { if (meForm[k].value.trim() && !pf[k]) delete pf[k]; });
    const nm = meForm.name.value.trim();
    if (termEditable(m) && meForm.cohort.value && meForm.cohort.value !== cohortVal(m)) { setCohort(m, meForm.cohort.value); Object.assign(m, { termFor: termForToday(), termConfirmed: true }); refreshCohortFilter(); }
    Object.assign(m, pf, { pathway: meForm.pathway.value, bio: meForm.bio.value.trim(), pref: meForm.pref.value.trim().slice(0, 40), based: meForm.based.value.trim().slice(0, 60), from: meForm.from.value.trim().slice(0, 60), roles: [...meRoles], primary: meRoles.has(mePrimary) ? mePrimary : [...meRoles][0] || "", learn: [...meLearn], kit: meKit, openToOffers: meForm.openToOffers.checked, shareEmail: meForm.shareEmail.checked, hideMe: meForm.hideMe.checked, notify: readNotify(), updated: TODAY },
      nm ? { name: nm } : {});
    if (m.incomplete && meRoles.size && (!termEditable(m) || meForm.cohort.value)) m.incomplete = false;
    drawHeader();
    const msg = $("#meSaved"); msg.className = "save-msg auto-msg";
    msg.textContent = m.incomplete ? "Saved as you type. Add at least one role to appear in Crew search." : "Saved as you type.";
  }
  const meChanged = () => { const m = me(); if (!m) return; meAutoFor = m.id; clearTimeout(meAutoT); meAutoT = setTimeout(autoSaveMe, 900); };
  meForm.addEventListener("input", meChanged); meForm.addEventListener("change", meChanged);
  ["#meRoles", "#meLearn", "#meKit", "#kitAddBtn"].forEach(sel => $(sel).addEventListener("click", meChanged));
  window.addEventListener("pagehide", () => { if (meAutoT) { clearTimeout(meAutoT); autoSaveMe(); } });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && meAutoT) { clearTimeout(meAutoT); autoSaveMe(); } });

  meForm.addEventListener("submit", e => {
    e.preventDefault(); clearTimeout(meAutoT); meAutoT = 0;
    const m = me();
    if (!meForm.name.value.trim()) { showMeTab("about"); $("#meSaved").textContent = "Add your name."; $("#meSaved").className = "save-msg err"; meForm.name.focus(); return; }
    if (!meRoles.size) { showMeTab("roles"); $("#meSaved").textContent = "Pick at least one role."; $("#meSaved").className = "save-msg err"; return; }
    if (termEditable(m)) {
      if (!meForm.cohort.value) { showMeTab("about"); $("#meSaved").textContent = "Pick your course and cohort."; $("#meSaved").className = "save-msg err"; return; }
      setCohort(m, meForm.cohort.value); Object.assign(m, { termFor: termForToday(), termConfirmed: true }); refreshCohortFilter();
    }
    const pf = { reel: cleanUrl(meForm.reel.value), site: cleanUrl(meForm.site.value), imdb: cleanImdb(meForm.imdb.value), insta: cleanInsta(meForm.insta.value) };
    const badPf = PORTFOLIO.find(([k]) => meForm[k].value.trim() && !pf[k]);
    if (badPf) { showMeTab("about"); $("#meSaved").textContent = `${badPf[1]}: that isn't a web address.`; $("#meSaved").className = "save-msg err"; meForm[badPf[0]].focus(); return; }
    Object.assign(m, pf, { name: meForm.name.value.trim(), pathway: meForm.pathway.value, bio: meForm.bio.value.trim(), pref: meForm.pref.value.trim().slice(0, 40), based: meForm.based.value.trim().slice(0, 60), from: meForm.from.value.trim().slice(0, 60), roles: [...meRoles], primary: mePrimary || [...meRoles][0], learn: [...meLearn], kit: meKit, openToOffers: meForm.openToOffers.checked, shareEmail: meForm.shareEmail.checked, hideMe: meForm.hideMe.checked, notify: readNotify(), updated: TODAY, incomplete: false });
    drawHeader(); loadMe();
    $("#meSaved").textContent = m.hideMe ? "Saved. Your profile is hidden from Crew search." : "Saved. You appear in Crew search and the calendar.";
    $("#meSaved").className = "save-msg ok"; toast("Profile saved");
  });
  $("#downloadMe").addEventListener("click", () => downloadMyData());
  $("#footAbout").addEventListener("click", () => setView("about"));
  $("#footReport").addEventListener("click", () => { const m = me(); if (!m) return openSignIn("Sign in to report a problem."); openReport("general", ""); });
  $("#deleteMe").addEventListener("click", () => {
    const m = me();
    if (isOwner(m)) return toast("You own Crew Call. Transfer ownership in Admin before deleting your profile");
    confirmBox("Delete your profile?", "This removes your profile, availability, requests and notifications for good, and reopens any roles you're locked on. Producers on those shoots are told. You can sign in again later and start fresh.", "Delete my profile", () => { removeStudent(m); S.meId = null; closeModal(); drawHeader(); setView("calendar"); toast("Profile deleted"); });
  });

  // ---------- notifications + digest ----------
  function readNotify() { return { apply: meForm.nApply.checked, digest: meForm.nDigest.checked, match: meForm.nMatch.checked, updates: meForm.nUpdates.checked, news: meForm.nNews.checked, when: meForm.nWhen.value, scope: (meForm.querySelector("[name=nScope]:checked") || {}).value || "match" }; }
  function syncDigestOpts() { $("#digestOpts").classList.toggle("is-off", !meForm.nDigest.checked); }
  meForm.nDigest.addEventListener("change", syncDigestOpts);
  ["nApply", "nDigest", "nWhen", "nMatch", "nUpdates", "nNews"].forEach(k => meForm[k].addEventListener("change", () => { const m = me(); if (m) m.notify = readNotify(); }));
  $$("[name=nScope]").forEach(r => r.addEventListener("change", () => { const m = me(); if (m) m.notify = readNotify(); }));
  const WHEN = { mon: ["Monday", "8am"], sun: ["Sunday", "6pm"], fri: ["Friday", "4pm"] };
  function buildDigest() {
    const m = me(), n = readNotify(), roles = [...meRoles];
    const horizon = addDays(TODAY, 42);
    const upcoming = live().filter(p => isActive(p) && p.shoots.some(r => r.from <= horizon) && openRoles(p).length && !runs(p, m));
    const items = [];
    upcoming.forEach(p => {
      const days = projDays(p).filter(d => d >= TODAY), free = days.filter(d => isFree(m, d)).length;
      const mine = [...new Set(openRoles(p).map(r => r.role))].filter(r => n.scope === "all" || roles.includes(r));
      if (!mine.length || (n.scope === "match" && !free)) return;
      items.push({ p, roles: mine, free, total: days.length, match: mine.some(r => roles.includes(r)) });
    });
    items.sort((a, b) => b.match - a.match || b.free / b.total - a.free / a.total || a.p.shoots[0].from.localeCompare(b.p.shoots[0].from));
    const allOpen = upcoming.reduce((t, p) => t + openRoles(p).length, 0);
    const run = live().filter(p => isActive(p) && runs(p, m));
    const [wd, time] = WHEN[n.when];
    const row = it => { const d0 = projDays(it.p).find(d => d >= TODAY); return `<li class="dg-item" style="--c:${projColor(it.p)}">
        <div class="dg-top"><button class="dg-title" data-proj="${it.p.id}">${esc(it.p.title)}</button><span class="dg-type">${esc(it.p.type === it.p.term ? it.p.type : it.p.type + " · " + it.p.term)}</span></div>
        <p class="dg-meta">${it.p.shoots.map(fmtRange).join(" + ")} · call ${dayInfo(it.p, d0).call} · ${esc(locShort(it.p))}</p>
        <p class="dg-roles">${it.roles.map(r => `<span class="dg-role ${roles.includes(r) ? "is-mine" : ""}">${esc(r)}</span>`).join("")}</p>
        <p class="dg-free">${it.free ? (it.free === it.total ? "You're free every shoot day" : `You're free ${it.free} of ${it.total} shoot days`) : "You haven't marked these days free"}</p></li>`; };
    const subject = items.length ? `${items.length} shoot${items.length === 1 ? "" : "s"} looking for crew like you this week` : "Crew Call: your week";
    const tn = termNow(), wk = tn ? Math.floor((D(TODAY) - D(tn.start)) / 6048e5) + 1 : 0;
    const base = SITE;
    const lockedLearn = live().filter(p => isActive(p) && !runs(p, m) && !onProject(p, m.id)).flatMap(p => p.roles.filter(r => r.filledBy && !isExt(r) && m.learn.includes(r.role)).map(r => ({ title: p.title, role: r.role, dates: p.shoots.map(fmtRange).join(" + "), url: base + "#p/" + p.id }))).slice(0, 3);
    const data = {
      subject, first: first(m.name), weekLabel: (() => { const want = { mon: 1, sun: 0, fri: 5 }[n.when]; let d = TODAY; while (D(d).getUTCDay() !== want) d = addDays(d, 1); return fmtDay(d); })(),
      termLabel: tn ? `${tn.name}, week ${wk}` : (nextTerm() ? `Holiday. ${nextTerm().name} starts ${fmtDay(nextTerm().start)}` : "This week"),
      topRole: roles.length === 1 ? roles[0] : "",
      stats: { open: allOpen, thisWeek: live().filter(p => isActive(p) && projDays(p).some(d => d >= TODAY && d <= addDays(TODAY, 6))).length, newCount: live().filter(p => p.created && p.created >= addDays(TODAY, -7)).length },
      matches: items.map(it => { const d0 = projDays(it.p).find(d => d >= TODAY); return { title: it.p.title, type: it.p.type === it.p.term ? it.p.type : it.p.type + " · " + it.p.term, dates: it.p.shoots.map(fmtRange).join(" + "), call: dayInfo(it.p, d0).call, loc: locShort(it.p), roles: it.roles.map(r => ({ name: r, mine: roles.includes(r) })), free: it.free, total: it.total, color: projColor(it.p), url: base + "#p/" + it.p.id }; }),
      own: run.map(p => ({ title: p.title, waiting: S.requests.filter(q => q.pid === p.id && q.status === "pending").length, open: openRoles(p).length, url: base + "#p/" + p.id })),
      learn: lockedLearn,
      updatedAgo: updatedLabel(m).replace("Updated ", "").toLowerCase(),
      sendLabel: `${wd}s at ${time}`,
      links: { app: base, days: base + "#me/days", settings: base + "#me/notifications", unsubscribe: base + "#me/notifications" }
    };
    const html = window.CrewCallDigest(data);
    return `
      <h2 id="modalTitle" class="m-title">This week's digest</h2>
      <p class="dg-envelope"><span><b>From</b> Crew Call</span><span><b>To</b> ${esc(m.email)}</span><span><b>Subject</b> ${esc(subject)}</span><span><b>Sends</b> ${wd}s at ${time}</span></p>
      <iframe class="dg-frame" title="Email preview" sandbox="allow-popups" srcdoc="${esc(html).replace(/'/g, "&#39;")}"></iframe>
      <p class="muted small mt">${LIVE ? "This is a preview. The email comes at the time you picked, and each button opens the shoot in Crew Call." : "Demo preview. The live app sends this at the time you picked, and each button opens the shoot in Crew Call."}</p>`;
  }
  $("#digestPreview").addEventListener("click", () => openModal(buildDigest()));

  // ---------- BOARD FILTERS: search, matches me, tap chips, sort, show more ----------
  const FS = {}, BOARDS = {};
  const PAGE = 12;
  let fsWho = null;
  const fstate = (key, sort) => {
    const who = S.meId || ""; if (who !== fsWho) { fsWho = who; Object.keys(FS).forEach(k => delete FS[k]); } // fresh filters for each person
    return FS[key] || (FS[key] = { q: "", mine: false, sel: {}, sort, all: false, limit: PAGE, open: false, view: "cards", tsort: null });
  };
  function runBoard(key, items, cfg) {
    const st = fstate(key, cfg.sorts[0][0]), q = st.q.trim().toLowerCase(), m = me();
    const trq = t => (window.CCLang && CCLang.get() !== "en" ? t + " " + t.split(/,\s*|\s+·\s+/).map(CCLang.tr).join(" ") : t).toLowerCase();
    let list = items.filter(it => !q || trq(cfg.text(it)).includes(q));
    if (st.mine && m && cfg.match) list = list.filter(it => cfg.match(it, m));
    cfg.groups.forEach(g => { const v = st.sel[g.id]; if (Array.isArray(v) ? v.length : v) list = list.filter(it => Array.isArray(v) ? v.some(x => g.test(it, x)) : g.test(it, v)); });
    const doneN = cfg.done ? list.filter(cfg.done).length : 0;
    if (cfg.done && !st.all) list = list.filter(it => !cfg.done(it));
    const s = cfg.sorts.find(x => x[0] === st.sort) || cfg.sorts[0];
    list = [...list].sort(s[2]);
    if (cfg.sink) list = list.filter(it => !cfg.sink(it)).concat(list.filter(cfg.sink));
    const tc = st.tsort && st.view === "table" && cfg.table && cfg.table.cols[st.tsort.i];
    if (tc) { const k = colKey(tc); list = list.map(it => [k(it), it]).sort((a, b) => cmpKey(a[0], b[0]) * st.tsort.dir).map(x => x[1]); }
    const mk = !tc && s[3] ? it => { if (cfg.sink && cfg.sink(it)) return "~" + cfg.sinkLabel; const d = s[3](it); return d ? String(d).slice(0, 7) : ""; } : null;
    return { st, list, shown: st.view === "map" ? list : list.slice(0, st.limit), doneN, mk };
  }
  // ---------- month headings: when a board is sorted by a date, items are grouped under the month ----------
  const monthName = k => k && k[0] === "~" ? k.slice(1) : k ? `${MONTH_FULL[+k.slice(5, 7) - 1]} ${k.slice(0, 4)}` : "No date yet";
  // [{ key, label, n, items }] in list order; n counts the whole filtered list, not just what's shown
  function monthGroups(mk, shown, list) {
    if (!mk) return null;
    const all = {}; list.forEach(it => { const k = mk(it); all[k] = (all[k] || 0) + 1; });
    const out = []; shown.forEach(it => { const k = mk(it), g = out[out.length - 1]; if (g && g.key === k) g.items.push(it); else out.push({ key: k, label: monthName(k), n: all[k], items: [it] }); });
    return out.length > 1 ? out : null; // one month only: no heading needed
  }
  const monthHead = g => `<span class="mh-t">${esc(g.label)}</span> <span class="count">${g.n}</span>`;
  const VIEWS = [["cards", "Cards"], ["table", "Table"], ["timeline", "Timeline"], ["map", "Map"]];
  const activeN = st => Object.values(st.sel).filter(v => Array.isArray(v) ? v.length : v).length + (st.mine ? 1 : 0);
  const metaHtml = (cfg, res) => { const n = res.list.length, st = res.st; return `<p class="result-meta">${n} ${esc(cfg.noun)}${n === 1 ? "" : "s"}${res.doneN && !st.all ? ` · ${res.doneN} ${esc(cfg.doneHidden)} hidden` : ""}${activeN(st) || st.q ? ` · <button type="button" class="link-btn" data-fclear>Clear filters</button>` : ""}</p>`; };
  const moreHtml = res => res.list.length > res.shown.length ? `<button type="button" class="btn btn-ghost" data-fmore>Show more (${res.list.length - res.shown.length} more)</button>` : "";
  function filterBarHtml(key, cfg, res) {
    const st = res.st, m = me(), n = activeN(st);
    const chip = (attr, val, on, label) => `<button type="button" class="fchip ${on ? "on" : ""}" ${attr}="${esc(val)}" aria-pressed="${on}">${esc(label)}</button>`;
    return `<div class="fbar">
      <div class="fbar-top">
        <input type="search" class="fsearch" value="${esc(st.q)}" placeholder="${esc(cfg.placeholder)}" aria-label="Search ${esc(cfg.noun)}s">
        ${m && cfg.match ? `<button type="button" class="fchip fchip-me ${st.mine ? "on" : ""}" data-fmine aria-pressed="${st.mine}" title="${esc(cfg.matchHint)}">Matches me</button>` : ""}
        <button type="button" class="btn btn-ghost btn-sm ftoggle" data-fopen aria-expanded="${st.open}">Filters${n ? ` <span class="count">${n}</span>` : ""}</button>
        <label class="fsort"><span>Sort</span><select data-fsortsel aria-label="Sort by">${st.tsort && st.view === "table" ? `<option value="" selected>Column: ${esc(cfg.table.cols[st.tsort.i][0])}</option>` : ""}${cfg.sorts.map(([id, l]) => `<option value="${esc(id)}" ${!(st.tsort && st.view === "table") && st.sort === id ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
        ${cfg.table || cfg.timeline || cfg.map ? `<div class="seg-btn vtoggle" role="group" aria-label="View">${VIEWS.filter(([v]) => v === "cards" || cfg[v]).map(([v, l]) => `<button type="button" class="${st.view === v ? "on" : ""}" data-fview="${v}" aria-pressed="${st.view === v}">${l}</button>`).join("")}</div>` : ""}
      </div>
      <div class="fpanel" ${st.open ? "" : "hidden"}><div class="fpanel-in" role="group" aria-label="Filters">
        <div class="fsheet-h"><b>Filters</b><button type="button" class="icon-btn" data-fclose aria-label="Close filters">×</button></div>
        ${cfg.groups.filter(g => g.opts.length).map(g => g.multi ? `<div class="fgroup">${mselHtml(g.id, g.label, g.opts, st.sel[g.id] || [])}</div>` : `<div class="fgroup"><p class="fgroup-h">${esc(g.label)}</p><div class="fchips">${g.opts.map(o => chip("data-fsel", `${g.id}|${o}`, st.sel[g.id] === o, o)).join("")}</div></div>`).join("")}
        ${cfg.done ? `<div class="fgroup"><label class="toggle"><input type="checkbox" data-fall ${st.all ? "checked" : ""}> <span>${esc(cfg.doneLabel)}</span></label></div>` : ""}
        <div class="fsheet-foot"><button type="button" class="btn btn-quiet btn-sm" data-fclear>Clear all</button><button type="button" class="btn btn-accent btn-sm" data-fclose data-fshow>Show ${res.list.length} result${res.list.length === 1 ? "" : "s"}</button></div>
      </div></div>
      <div class="fmeta">${metaHtml(cfg, res)}</div>
    </div>`;
  }
  // o: { key, host, cfg, items, card, empty, after, partial }
  // Table and timeline views for the boards. cfg.table = { cols: [[label, item => html, class]], color }
  // cfg.timeline = { segs: item => [{ from, to, label, dash }], label: item => html, sub: item => text, color }
  function tableHtml(t, items, ts, groups) {
    return `<div class="tbl-wrap"><table class="btable"><thead><tr>${t.cols.map((c, i) => { const on = ts && ts.i === i; return `<th scope="col" class="${c[2] || ""}${i === 0 ? " bt-first" : ""}" aria-sort="${on ? (ts.dir > 0 ? "ascending" : "descending") : "none"}"><button type="button" class="th-sort" data-tsort="${i}">${esc(c[0])}<span class="th-ar" aria-hidden="true">${on ? (ts.dir > 0 ? "▲" : "▼") : "↕"}</span></button></th>`; }).join("")}</tr></thead>
      <tbody>${(groups || [{ items }]).map(g => (g.label ? `<tr class="bt-month"><th scope="colgroup" colspan="${t.cols.length}"><span class="bt-month-l">${monthHead(g)}</span></th></tr>` : "") + g.items.map(it => `<tr${t.dim && t.dim(it) ? ` class="is-dim"` : ""} style="--c:${t.color ? t.color(it) : "var(--accent)"}">${t.cols.map((c, i) => `<td class="${c[2] || ""}${i === 0 ? " bt-first" : ""}">${c[1](it)}</td>`).join("")}</tr>`).join("")).join("")}</tbody></table></div>`;
  }
  const dayDiff = (a, b) => Math.round((D(b) - D(a)) / 864e5);
  function timelineHtml(t, items, groups) {
    const rows = items.map(it => ({ it, segs: t.segs(it).filter(x => x && x.from) }));
    const headAt = new Map((groups || []).map(g => [g.items[0], g]));
    const all = rows.flatMap(r => r.segs);
    if (!all.length) return `<p class="empty-sm">No dates to show yet.</p>`;
    let a = [TODAY, ...all.map(x => x.from)].sort()[0], b = all.map(x => x.to || x.from).sort().pop();
    if (b < addDays(TODAY, 14)) b = addDays(TODAY, 14);
    const span = dayDiff(a, b), monthly = span > 120;
    a = monthly ? a.slice(0, 8) + "01" : addDays(a, -((D(a).getUTCDay() + 6) % 7)); // start of month or Monday
    const end = addDays(b, monthly ? 31 - +b.slice(8) + 1 : 7 - ((D(b).getUTCDay() + 6) % 7));
    const N = Math.max(1, dayDiff(a, end)), pct = d => Math.max(0, Math.min(100, dayDiff(a, d) / N * 100));
    const ticks = [];
    for (let d = a; d < end; d = monthly ? iso(new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7), 1))) : addDays(d, 7)) ticks.push(d);
    const tickLbl = d => monthly ? `${MON[D(d).getUTCMonth()]}${d.slice(5, 7) === "01" || d === ticks[0] ? " " + d.slice(0, 4) : ""}` : `${D(d).getUTCDate()} ${MON[D(d).getUTCMonth()]}`;
    const today = pct(TODAY), tlw = Math.max(640, ticks.length * (monthly ? 90 : 72));
    return `<div class="tl-wrap"><div class="tl" style="--tl-w:${tlw}px">
      <div class="tl-head"><div class="tl-label"></div><div class="tl-track">${ticks.map(d => `<span class="tl-tick" style="left:${pct(d)}%">${tickLbl(d)}</span>`).join("")}<span class="tl-today-lbl${today < 4 ? " tl-start" : ""}" style="left:${today}%">Today</span></div></div>
      ${rows.map(r => (headAt.has(r.it) ? (g => { const k = g.key && g.key[0] !== "~" ? g.key : "", l = k ? pct(k + "-01") : 0, nx = k ? iso(new Date(Date.UTC(+k.slice(0, 4), +k.slice(5, 7), 1))) : null, w = k ? pct(nx) - l : 0;
          return `<div class="tl-month"><div class="tl-label">${monthHead(g)}</div><div class="tl-track">${w > 0 ? `<span class="tl-mband" style="left:${l}%;width:${w}%"></span>` : ""}</div></div>`; })(headAt.get(r.it)) : "") + `<div class="tl-row${t.dim && t.dim(r.it) ? " is-dim" : ""}" style="--c:${t.color ? t.color(r.it) : "var(--accent)"}"><div class="tl-label">${t.label(r.it)}${t.sub ? `<span class="tl-sub">${esc(t.sub(r.it))}</span>` : ""}</div>
        <div class="tl-track">${ticks.map(d => `<span class="tl-grid" style="left:${pct(d)}%"></span>`).join("")}<span class="tl-today" style="left:${today}%"></span>
          ${r.segs.map(x => { const l = pct(x.from), w = Math.max(pct(addDays(x.to || x.from, 1)) - l, 0.6); const out = w / 100 * tlw < (x.label || "").length * 7 + 12;
            return `<span class="tl-bar${x.dash ? " tl-dash" : ""}" style="left:${l}%;width:${w}%" title="${esc(x.label || "")}">${out ? "" : `<span class="tl-bar-t">${esc(x.label || "")}</span>`}</span>${out ? `<span class="tl-out" style="left:calc(${l + w}% + 6px)">${esc(x.label || "")}</span>` : ""}`; }).join("")}</div></div>`).join("")}
    </div></div>`;
  }
  // a soft edge on the locked title column once the table is scrolled sideways
  document.addEventListener("scroll", e => { const t = e.target; if (t && t.classList && t.classList.contains("tbl-wrap")) t.classList.toggle("scrolled", Math.abs(t.scrollLeft) > 2); }, true);
  // ---------- MAP VIEW: Leaflet (open source) with OpenStreetMap tiles, both free ----------
  // OpenStreetMap asks for visible credit and light use: tiles load only for what's on screen.
  // https://operations.osmfoundation.org/policies/tiles/
  let leafletP = null, liveMap = null;
  const loadLeaflet = () => leafletP || (leafletP = new Promise((ok, no) => {
    if (window.L && window.L.map) return ok();
    const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "vendor/leaflet/leaflet.css"; document.head.appendChild(css);
    const js = document.createElement("script"); js.src = "vendor/leaflet/leaflet.js"; js.onload = () => ok(); js.onerror = () => { leafletP = null; no(); }; document.head.appendChild(js);
  }));
  const killMap = () => { if (liveMap) { liveMap.remove(); liveMap = null; } };
  const LONDON = [[51.43, -0.25], [51.6, 0.06]];
  const mapPts = (m, items) => items.flatMap(it => m.points(it).map((pt, j) => ({ it, j, ...pt })));
  function mapHtml(m, items) {
    const pts = mapPts(m, items), pinned = pts.filter(x => x.lat != null), loose = pts.filter(x => x.lat == null);
    const far = pinned.some(x => x.lat < LONDON[0][0] || x.lat > LONDON[1][0] || x.lng < LONDON[0][1] || x.lng > LONDON[1][1]);
    return `<div class="map-wrap">
      <div class="map-main">
        <div class="map-tools"><span class="small muted">${pinned.length} location${pinned.length === 1 ? "" : "s"} on the map</span>${far ? `<span class="seg-btn map-zoom" role="group" aria-label="Map area"><button type="button" data-mapzoom="london" class="on" aria-pressed="true">London</button><button type="button" data-mapzoom="all" aria-pressed="false">Show all</button></span>` : ""}</div>
        <div class="map-box" role="region" aria-label="Map of shoot locations"><p class="map-msg">Loading map…</p></div>
      </div>
      <ol class="map-list">${pinned.map((x, i) => `<li style="--c:${m.color(x.it)}"><button type="button" class="map-li" data-mapi="${i}"><span class="map-dot" aria-hidden="true">${m.badge(x.it)}</span><span><b>${esc(m.title(x.it))}</b><span class="bt-sub">${esc(x.name)}</span><span class="bt-sub mono">${esc(m.when(x.it))}</span></span></button></li>`).join("")}
        ${loose.length ? `<li class="map-loose"><p class="small muted">Not pinned yet: ${loose.map(x => `${esc(m.title(x.it))} (${esc(x.name)})`).join(", ")}. The shoot's owner can pin it from Edit.</p></li>` : ""}</ol>
    </div>`;
  }
  function drawMap(host, m, items) {
    killMap();
    const box = host && host.querySelector(".map-box"); if (!box) return;
    const pinned = mapPts(m, items).filter(x => x.lat != null);
    loadLeaflet().then(() => {
      if (!box.isConnected) return;
      box.innerHTML = "";
      const L = window.L, map = L.map(box, { scrollWheelZoom: false, worldCopyJump: false });
      liveMap = map;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors' }).addTo(map);
      const marks = pinned.map(x => L.marker([x.lat, x.lng], {
        title: `${m.title(x.it)}: ${x.name}`, alt: `${m.title(x.it)}: ${x.name}`, riseOnHover: true,
        icon: L.divIcon({ className: "map-pin", html: `<span style="--c:${m.color(x.it)}"><i>${m.badge(x.it)}</i></span>`, iconSize: [30, 38], iconAnchor: [15, 36], popupAnchor: [0, -32] })
      }).addTo(map).bindPopup(m.popup(x.it, x), { maxWidth: 260 }));
      const fitAll = () => pinned.length ? map.fitBounds(L.latLngBounds(pinned.map(x => [x.lat, x.lng])).pad(0.12), { maxZoom: 14 }) : map.fitBounds(LONDON);
      const inLdn = pinned.filter(x => x.lat >= LONDON[0][0] && x.lat <= LONDON[1][0] && x.lng >= LONDON[0][1] && x.lng <= LONDON[1][1]).length;
      inLdn < pinned.length && inLdn * 2 >= pinned.length ? map.fitBounds(LONDON) : fitAll();
      if (!(inLdn < pinned.length && inLdn * 2 >= pinned.length)) host.querySelectorAll("[data-mapzoom]").forEach(x => { const on = x.dataset.mapzoom === "all"; x.classList.toggle("on", on); x.setAttribute("aria-pressed", String(on)); });
      box.addEventListener("click", e => { const b = e.target.closest("[data-proj]"); if (b) openProject(b.dataset.proj); });
      host.querySelectorAll("[data-mapi]").forEach(b => b.onclick = () => { const i = +b.dataset.mapi, x = pinned[i]; map.setView([x.lat, x.lng], Math.max(map.getZoom(), 14)); marks[i].openPopup(); if (window.matchMedia("(max-width: 700px)").matches) box.scrollIntoView({ behavior: "smooth", block: "center" }); });
      host.querySelectorAll("[data-mapzoom]").forEach(b => b.onclick = () => {
        host.querySelectorAll("[data-mapzoom]").forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", String(x === b)); });
        b.dataset.mapzoom === "london" ? map.fitBounds(LONDON) : fitAll();
      });
      setTimeout(() => map.invalidateSize(), 60);
    }).catch(() => { box.innerHTML = `<p class="map-msg">The map couldn't load. Check your connection and try again.</p>`; });
  }

  function board(o) {
    const res = runBoard(o.key, o.items, o.cfg), host = o.host;
    const view = (o.cfg[res.st.view] || res.st.view === "cards") ? res.st.view : "cards";
    const groups = view === "map" ? null : monthGroups(res.mk, res.shown, res.list);
    const listHtml = !res.shown.length ? o.empty : view === "table" ? tableHtml(o.cfg.table, res.shown, res.st.tsort, groups) : view === "timeline" ? timelineHtml(o.cfg.timeline, res.shown, groups) : view === "map" ? mapHtml(o.cfg.map, res.list)
      : groups ? groups.map(g => `<h3 class="month-h">${monthHead(g)}</h3>` + g.items.map(o.card).join("")).join("") : res.shown.map(o.card).join("");
    const listCls = view === "cards" ? "card-grid blist" : `blist blist-${view}`;
    if (o.partial && host.querySelector(".fbar")) {
      host.querySelector(".blist").className = listCls;
      host.querySelector(".blist").innerHTML = listHtml;
      host.querySelector(".bmore").innerHTML = moreHtml(res);
      host.querySelector(".fmeta").innerHTML = metaHtml(o.cfg, res);
      const sh = host.querySelector("[data-fshow]"); if (sh) sh.textContent = `Show ${res.list.length} result${res.list.length === 1 ? "" : "s"}`;
    } else {
      host.innerHTML = `${filterBarHtml(o.key, o.cfg, res)}<div class="${listCls}">${listHtml}</div><div class="more-row bmore">${moreHtml(res)}</div>`;
    }
    document.body.classList.toggle("sheet-open", res.st.open && window.matchMedia("(max-width: 700px)").matches);
    bindOpeners(host);
    if (view === "map") drawMap(host.querySelector(".blist"), o.cfg.map, res.list); else killMap();
    if (o.after) o.after(host);
    BOARDS[o.key] = partial => o.redraw(partial);
    if (!host.dataset.fbound) {
      host.dataset.fbound = "1";
      const st = () => FS[o.key], re = partial => BOARDS[o.key](partial);
      host.addEventListener("msel", e => { const s = st(); s.sel[e.detail.id] = e.detail.values; s.limit = PAGE; re(true); const n = activeN(s), t = host.querySelector("[data-fopen]"); if (t) t.innerHTML = `Filters${n ? ` <span class="count">${n}</span>` : ""}`; });
      host.addEventListener("input", e => { if (e.target.classList.contains("fsearch")) { st().q = e.target.value; st().limit = PAGE; re(true); } });
      host.addEventListener("change", e => {
        if (e.target.matches("[data-fall]")) { st().all = e.target.checked; st().limit = PAGE; re(true); }
        if (e.target.matches("[data-fsortsel]") && e.target.value) { st().sort = e.target.value; st().tsort = null; re(); }
      });
      host.addEventListener("click", e => {
        const b = e.target.closest("button"); if (!b || !host.contains(b)) return;
        const s = st();
        if (b.hasAttribute("data-fmine")) { s.mine = !s.mine; s.limit = PAGE; re(); }
        else if (b.hasAttribute("data-fopen")) { s.open = !s.open; re(); }
        else if (b.hasAttribute("data-fclose")) { s.open = false; re(); }
        else if (b.dataset.fsel) { const [g, v] = b.dataset.fsel.split("|"); s.sel[g] = s.sel[g] === v ? "" : v; s.limit = PAGE; re(); }
        else if (b.dataset.tsort) { const i = +b.dataset.tsort; s.tsort = s.tsort && s.tsort.i === i ? (s.tsort.dir > 0 ? { i, dir: -1 } : null) : { i, dir: 1 }; re(); }
        else if (b.dataset.fview) { s.view = b.dataset.fview; re(); }
        else if (b.hasAttribute("data-fclear")) { Object.assign(s, { q: "", mine: false, sel: {}, all: false, limit: PAGE }); re(); }
        else if (b.hasAttribute("data-fmore")) { s.limit += PAGE; re(true); }
      });
      // tapping the dark area around the phone filter sheet closes it
      host.addEventListener("click", e => { if (e.target.classList.contains("fpanel")) { st().open = false; re(); } });
    }
  }
  const firstDay = p => projDays(p).find(d => d >= TODAY) || p.shoots[0].from;
  const daysUntil = d => Math.round((D(d) - D(TODAY)) / 864e5);
  const termOrder = name => { const i = TD().findIndex(t => t.name === name); return i < 0 ? 999 : i; };
  const uniqSorted = arr => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b));

  // ---------- DEVELOP: scripts from writers, pitches from producers ----------
  const DEV_ROLES = ["Screenwriter", "Director", "Producer", "1st AD", "DoP", "Script Editor"];
  const isPitch = x => x.kind === "pitch";
  const scriptOpen = x => x.lookingFor.filter(r => !x.attached.some(a => a.role === r));
  const devCfg = () => ({
    placeholder: "Search title, logline, writer or producer", noun: "post", matchHint: "Posts looking for a role on your profile",
    text: x => [x.title, x.logline, x.source, (student(x.by) || {}).name, x.type].join(" "),
    match: (x, m) => scriptOpen(x).some(r => m.roles.includes(r)),
    groups: [
      { id: "kind", label: "Show", opts: ["Scripts", "Producer pitches"], test: (x, v) => (v === "Scripts") !== isPitch(x) },
      { id: "role", multi: true, label: "Looking for", opts: DEV_ROLES, test: (x, v) => scriptOpen(x).includes(v) },
      { id: "type", label: "Type", opts: uniqSorted(S.scripts.map(x => x.type)), test: (x, v) => x.type === v },
      { id: "aim", label: "Hoping to shoot", opts: [...new Set(S.scripts.map(x => x.aim).filter(Boolean))].sort((a, b) => termOrder(a) - termOrder(b)), test: (x, v) => x.aim === v }
    ],
    sorts: [["new", "Newest", (a, b) => b.posted.localeCompare(a.posted), x => x.posted], ["aim", "Shooting soonest", (a, b) => termOrder(a.aim) - termOrder(b.aim)], ["short", "Shortest script", (a, b) => (a.pages || 999) - (b.pages || 999)]],
    done: x => !scriptOpen(x).length || x.status === "project", doneLabel: "Show posts that are fully attached", doneHidden: "fully attached",
    table: { cols: [
      ["Title", x => `<button class="link-btn bt-t" data-scr="${x.id}">${esc(x.title)}</button><span class="bt-sub">${isPitch(x) ? "Producer pitch" : x.pages + " page" + (x.pages === 1 ? "" : "s")}</span>`],
      ["Type", x => esc(x.type), "small"],
      ["By", x => esc((student(x.by) || { name: "Former member" }).name), "small"],
      ["Looking for", x => scriptOpen(x).length ? `<div class="chips">${scriptOpen(x).map(r => `<span class="chip chip-hit">${esc(r)}</span>`).join("")}</div>` : `<span class="small muted">Fully attached</span>`],
      ["Hoping to shoot", x => esc(x.aim || "Not set"), "small", x => termOrder(x.aim)],
      ["Posted", x => fmtFull(x.posted), "mono small", x => x.posted]
    ] },
    timeline: { label: x => `<button class="link-btn bt-t" data-scr="${x.id}">${esc(x.title)}</button>`, sub: x => `${isPitch(x) ? "Pitch" : "Script"} · ${scriptOpen(x).length ? "needs " + scriptOpen(x).join(", ") : "fully attached"}`,
      segs: x => { const t = TD().find(y => y.name === x.aim); return t ? [{ from: x.posted, to: addDays(t.start, -1), label: "Developing", dash: true }, { from: t.start, to: t.end, label: "Hoping to shoot: " + x.aim }] : [{ from: x.posted, to: addDays(x.posted, 30), label: "Developing", dash: true }]; } }
  });
  function renderScripts(partial) {
    const root = $("#view-scripts"), m = me();
    if (!partial || !root.querySelector(".board-host")) {
      const mine = S.scripts.filter(x => x.by === m.id), waiting = S.scriptInterest.filter(i => mine.some(x => x.id === i.scr) && i.status === "pending").length;
      root.innerHTML = `
        <div class="view-head"><div><h1 class="page-title">Develop</h1><p class="muted">Writers post scripts and producers post pitches, then directors, writers and producers put their hand up. Only signed-in members see this page. Full scripts and pitch decks are only shared with people the poster brings on.</p></div>
          <div class="head-acts"><button class="btn btn-accent" id="scrPost">Post a script</button><button class="btn btn-ghost" id="pitchPost">Post a pitch</button></div></div>
        ${mine.length ? `<p class="mine-note">You've posted ${mine.length}. ${waiting ? `<b>${waiting} ${waiting === 1 ? "person is" : "people are"} waiting for your reply.</b>` : "Nobody waiting for a reply."}</p>` : ""}
        <div class="board-host" data-fkey="dev"></div>`;
      $("#scrPost").onclick = () => openScriptForm(null, "script");
      $("#pitchPost").onclick = () => openScriptForm(null, "pitch");
    }
    board({ key: "dev", host: root.querySelector(".board-host"), cfg: devCfg(), items: S.scripts.filter(x => !x.hidden), card: scriptCard, partial, redraw: renderScripts,
      empty: `<div class="empty"><p class="empty-t">Nothing matches</p><p class="muted">Try clearing a filter, or post a script or pitch of your own.</p></div>`,
      after: host => host.querySelectorAll("[data-scr]").forEach(b => b.onclick = () => openScript(b.dataset.scr)) });
  }
  function scriptCard(x) {
    const w = student(x.by) || { name: "Former member" }, m = me(), open = scriptOpen(x);
    const myInt = S.scriptInterest.find(i => i.scr === x.id && i.sid === m.id && i.status === "pending");
    const waiting = x.by === m.id ? S.scriptInterest.filter(i => i.scr === x.id && i.status === "pending").length : 0;
    return `<article class="card ${isPitch(x) ? "pitch-card" : ""}">
      <div class="proj-top"><span class="type-tag">${isPitch(x) ? "Producer pitch" : esc(x.type)}</span>${isPitch(x) ? `<span class="term-tag">${esc(x.type)}</span>` : `<span class="term-tag">${x.pages} page${x.pages === 1 ? "" : "s"}</span>`}${x.aim ? `<span class="term-tag">${esc(x.aim)}</span>` : ""}${x.status === "project" ? `<span class="tag-arch">Now a shoot</span>` : ""}</div>
      <h3 class="card-t"><button class="link-btn" data-scr="${x.id}">${esc(x.title)}</button></h3>
      <p class="card-sub">${isPitch(x) ? "Pitched" : "Written"} by <button class="link-btn" data-student="${x.by}">${esc(w.name)}</button>${student(x.by) ? ` · <span class="term-tag">${esc(tLabel(w))}</span>` : ""}</p>
      <p class="logline">${esc(x.logline)}</p>
      ${isPitch(x) && x.source ? `<p class="small muted">Has: ${esc(x.source)}</p>` : ""}
      <div class="chips">${open.map(r => `<span class="chip chip-hit">Needs ${esc(r)}</span>`).join("")}${x.attached.map(a => `<span class="chip">${esc(a.role)}: ${esc((student(a.sid) || { name: "?" }).name)}</span>`).join("")}</div>
      <div class="card-actions">${x.by === m.id ? `<button class="btn btn-accent btn-sm" data-scr="${x.id}">${waiting ? `${waiting} interested` : "Manage"}</button>`
        : myInt ? `<span class="muted small">You've put your hand up as ${esc(myInt.role)}</span>`
        : open.length ? `<button class="btn btn-accent btn-sm" data-scr="${x.id}">I'm interested</button>` : `<span class="muted small">Fully attached</span>`}
        <button class="btn btn-ghost btn-sm" data-scr="${x.id}">Details</button></div>
    </article>`;
  }
  function openScript(id) {
    const x = S.scripts.find(y => y.id === id), m = me(), w = student(x.by) || { name: "Former member" }, mineS = x.by === m.id, pitch = isPitch(x);
    const ints = S.scriptInterest.filter(i => i.scr === x.id), open = scriptOpen(x);
    const attachedMe = x.attached.some(a => a.sid === m.id);
    const myInt = ints.find(i => i.sid === m.id && i.status === "pending");
    openModal(`
      <p class="eyebrow">${pitch ? "Producer pitch" : "Script"}</p>
      <h2 id="modalTitle" class="m-title">${esc(x.title)}</h2>
      <p class="card-sub">${esc(x.type)}${pitch ? "" : ` · ${x.pages} pages`} · ${pitch ? "pitched" : "written"} by <button class="link-btn" data-student="${x.by}">${esc(w.name)}</button>${x.aim ? ` · hoping to shoot ${esc(x.aim)}` : ""}</p>
      <p class="logline">${esc(x.logline)}</p>
      <dl class="meta-list">
        ${pitch && x.source ? `<div><dt>What they have</dt><dd>${esc(x.source)}</dd></div>` : ""}
        <div><dt>Looking for</dt><dd><div class="chips">${open.length ? open.map(r => `<span class="chip chip-hit">${esc(r)}</span>`).join("") : `<span class="muted">Nobody, fully attached</span>`}</div></dd></div>
        <div><dt>Attached</dt><dd>${x.attached.length ? x.attached.map(a => `${esc(a.role)}: <button class="link-btn" data-student="${a.sid}">${esc((student(a.sid) || { name: "?" }).name)}</button>`).join("<br>") : `<span class="muted">Nobody yet</span>`}</dd></div>
        <div><dt>${pitch ? "Pitch deck" : "Script"}</dt><dd>${(mineS || attachedMe) && x.link ? `<a href="${esc(x.link)}" target="_blank" rel="noopener">Open it</a>` : mineS ? `<span class="muted">No link added</span>` : `<span class="muted">Shared with people ${esc(first(w.name))} brings on</span>`}</dd></div>
      </dl>
      ${mineS ? `<h3 class="dp-sub">People interested</h3>${ints.length ? `<ul class="inv-list">${ints.map(i => { const s = student(i.sid) || { name: "Former member" }; return `<li><span><button class="link-btn" data-student="${i.sid}">${esc(s.name)}</button> as <b>${esc(i.role)}</b>${s.term ? ` <span class="muted small">${esc(tLabel(s))}</span>` : ""}${i.msg ? `<br><span class="muted small">${esc(i.msg)}</span>` : ""}</span><span>${i.status === "pending" ? `<button class="btn btn-accent btn-xs" data-sattach="${i.id}">Bring on</button> <button class="btn btn-quiet btn-xs" data-sdecline="${i.id}">Decline</button>` : `<span class="st ${i.status === "attached" ? "st-ok" : ""}">${i.status === "attached" ? "Attached" : "Declined"}</span>`}</span></li>`; }).join("")}</ul>` : `<p class="empty-sm">Nobody yet. Share the Develop page in your cohort chat.</p>`}
        <div class="form-actions"><button class="btn btn-accent" id="scrToProj">Turn into a shoot</button><button class="btn btn-ghost" id="scrEdit">Edit</button><button class="btn btn-quiet" id="scrDel">Remove</button></div>`
      : myInt ? `<p class="muted">You've put your hand up as ${esc(myInt.role)}. ${esc(first(w.name))} will reply and you'll get a notification. <button class="link-btn" id="scrWithdraw">Withdraw</button></p>`
      : open.length && !attachedMe ? `<h3 class="dp-sub">Put your hand up</h3><form id="scrInt" class="stack"><div class="field"><span>As</span><div class="fchips" role="radiogroup">${open.map((r, i) => `<label class="fchip-radio"><input type="radio" name="role" value="${esc(r)}" ${i === 0 ? "checked" : ""}><span>${esc(r)}</span></label>`).join("")}</div></div><label class="field"><span>Message to ${esc(first(w.name))}</span><textarea name="msg" rows="3" maxlength="400" placeholder="What you like about it, and how you'd approach it"></textarea></label><div class="form-actions"><button class="btn btn-accent">Send</button></div></form>` : ""}`);
    bindOpeners(modalBody);
    if (!mineS) addReportLink(pitch ? "pitch" : "script", x.id);
    const f = $("#scrInt");
    if (f) f.addEventListener("submit", e => { e.preventDefault(); const role = f.querySelector("[name=role]:checked").value; S.scriptInterest.push({ id: uid("si"), scr: x.id, sid: m.id, role, msg: f.msg.value.trim(), status: "pending", at: TODAY }); notify(x.by, "request", `${m.name} (${tLabel(m)}) would like to come on board ${x.title} as ${role}. Open Develop to reply.`); toast(`Sent to ${first(w.name)}`); openScript(x.id); renderScripts(); drawHeader(); });
    const wd = $("#scrWithdraw"); if (wd) wd.onclick = () => { S.scriptInterest.splice(S.scriptInterest.indexOf(myInt), 1); toast("Withdrawn"); openScript(x.id); renderScripts(); };
    modalBody.querySelectorAll("[data-sattach]").forEach(b => b.onclick = () => { const i = S.scriptInterest.find(y => y.id === b.dataset.sattach); i.status = "attached"; x.attached.push({ sid: i.sid, role: i.role }); S.scriptInterest.filter(y => y.scr === x.id && y.role === i.role && y.status === "pending").forEach(y => { y.status = "declined"; notify(y.sid, "update", `${x.title} has brought someone else on as ${y.role}. Thanks for offering.`); }); notify(i.sid, "update", `${m.name} brought you on to ${x.title} as ${i.role}. You can now open the ${pitch ? "pitch deck" : "script"} from Develop.`); toast(`${first(student(i.sid).name)} brought on`); openScript(x.id); renderScripts(); });
    modalBody.querySelectorAll("[data-sdecline]").forEach(b => b.onclick = () => { const i = S.scriptInterest.find(y => y.id === b.dataset.sdecline); i.status = "declined"; notify(i.sid, "update", `${x.title} isn't going ahead with you as ${i.role} this time. Thanks for offering.`); openScript(x.id); renderScripts(); });
    if ($("#scrEdit")) $("#scrEdit").onclick = () => openScriptForm(x, x.kind || "script");
    if ($("#scrDel")) $("#scrDel").onclick = () => confirmBox(`Remove ${x.title}?`, "It disappears from Develop. People who put their hand up are told.", "Remove", () => { S.scriptInterest.filter(i => i.scr === x.id && i.status === "pending").forEach(i => notify(i.sid, "update", `${x.title} has been taken off Develop.`)); S.scripts.splice(S.scripts.indexOf(x), 1); closeModal(); renderScripts(); toast("Removed"); });
    if ($("#scrToProj")) $("#scrToProj").onclick = () => {
      openPostForm(); const pf = modalBody.querySelector("form"); if (!pf) return;
      const set = (n, v) => { const el = pf.querySelector(`[name="${n}"]`); if (el) el.value = v; };
      set("title", x.title); set("logline", x.logline); if (C.TYPES.includes(x.type)) set("type", x.type);
      x.status = "project"; toast("Shoot form filled in from your post. Add the dates and roles.");
    };
  }
  function openScriptForm(x, kind) {
    const m = me(), pitch = kind === "pitch", upcoming = TD().filter(t => t.end >= TODAY).slice(0, 4).map(t => t.name);
    const defaults = pitch ? ["Screenwriter", "Director"] : ["Director"];
    openModal(`<h2 id="modalTitle" class="m-title">${x ? "Edit" : "Post a"} ${pitch ? "pitch" : "script"}</h2>
      <p class="muted small">${pitch ? "Pitch an idea, a true story you have access to, or a story you hold the rights to. Find a writer and director to make it with." : "Post the logline here, not the script. You choose who gets the full script by bringing them on."}</p>
      <form id="scrForm" class="stack">
        <label class="field"><span>${pitch ? "Working title" : "Title"}</span><input name="title" required maxlength="80" value="${esc(x ? x.title : "")}"></label>
        <div class="form-grid"><label class="field"><span>Type</span><select name="type">${C.TYPES.map(t => `<option ${x && x.type === t ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></label>
        ${pitch ? `<label class="field"><span>Hoping to shoot</span><select name="aim"><option value="">Not sure yet</option>${upcoming.map(t => `<option ${x && x.aim === t ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></label>` : `<label class="field"><span>Pages</span><input name="pages" type="number" inputmode="numeric" min="1" max="200" required value="${x ? x.pages : ""}"></label>`}</div>
        <label class="field"><span>Logline</span><textarea name="logline" rows="2" maxlength="240" required>${esc(x ? x.logline : "")}</textarea></label>
        ${pitch ? `<label class="field"><span>What you have</span><input name="source" maxlength="120" placeholder="e.g. Option on a short story, access to a real story, a location" value="${esc(x ? x.source || "" : "")}"></label>` : ""}
        <div class="field"><span>Looking for</span><div class="fchips">${DEV_ROLES.map(r => `<label class="fchip-radio"><input type="checkbox" name="lf" value="${esc(r)}" ${(x ? x.lookingFor : defaults).includes(r) ? "checked" : ""}><span>${esc(r)}</span></label>`).join("")}</div></div>
        ${pitch ? "" : `<label class="field"><span>Hoping to shoot</span><select name="aim"><option value="">Not sure yet</option>${upcoming.map(t => `<option ${x && x.aim === t ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></label>`}
        <label class="field"><span>${pitch ? "Pitch deck or treatment link" : "Script link"} <small>only shown to you and people you bring on</small></span><input name="link" inputmode="url" autocapitalize="off" spellcheck="false" placeholder="drive.google.com/…" value="${esc(x ? x.link : "")}"></label>
        <p class="form-err" id="scrErr" role="alert"></p>
        <div class="form-actions"><button class="btn btn-accent">${x ? "Save" : "Publish"}</button><button class="btn btn-ghost" type="button" data-close>Cancel</button></div>
      </form>`);
    $("#scrForm").addEventListener("submit", e => {
      e.preventDefault(); const f = e.target, lf = [...f.querySelectorAll("[name=lf]:checked")].map(i => i.value);
      if (!lf.length) return ($("#scrErr").textContent = "Pick at least one role you're looking for.");
      const link = cleanUrl(f.link.value); if (f.link.value.trim() && !link) return ($("#scrErr").textContent = "That link isn't a web address.");
      const data = { kind, title: f.title.value.trim(), type: f.type.value, pages: pitch ? null : +f.pages.value, logline: f.logline.value.trim(), source: pitch ? f.source.value.trim() : "", lookingFor: lf, aim: f.aim.value, link };
      if (x) Object.assign(x, data); else S.scripts.push({ id: uid("sc"), by: m.id, attached: [], posted: TODAY, status: "open", ...data });
      closeModal(); renderScripts(); toast(x ? "Saved" : pitch ? "Pitch posted" : "Script posted");
    });
  }

  // ---------- POST: wrapped shoots looking for editors, colourists, sound, music and VFX ----------
  const POST_NEEDS = ["Editing", "Assistant edit", "Colour grade", "Sound design & mix", "Music", "VFX", "Titles & graphics"];
  const POST_ROLE = { "Editing": ["Editor"], "Assistant edit": ["Editor", "DIT"], "Colour grade": ["Colourist"], "Sound design & mix": ["Sound Designer", "Boom Operator", "Sound Recordist"], "Music": ["Composer"], "VFX": ["VFX"], "Titles & graphics": ["VFX", "Key Art & Poster"] };
  const POST_CREDIT = { "Editing": "Editor", "Assistant edit": "Assistant Editor", "Colour grade": "Colourist", "Sound design & mix": "Sound Designer", "Music": "Composer", "VFX": "VFX", "Titles & graphics": "Titles & Graphics" };
  // post-department roles on a shoot, and the Post need each one covers
  const POST_DEPT = { "Editor": "Editing", "Colourist": "Colour grade", "VFX": "VFX", "Sound Designer": "Sound design & mix", "Composer": "Music" };
  const POST_WHERE = ["Remote", "On campus", "Either"];
  const uniq = a => [...new Set(a)];
  // a listing's team and needs, including post roles picked on the linked shoot
  function postTeam(x) {
    const p = !x.virtual && x.pid && project(x.pid);
    if (!p) return { needs: x.needs, attached: x.attached };
    const pr = p.roles.filter(r => POST_DEPT[r.role]);
    const fromShoot = pr.filter(r => r.filledBy).map(r => isExt(r) ? { sid: null, name: extName(r), need: POST_DEPT[r.role] } : { sid: r.filledBy, need: POST_DEPT[r.role] });
    return { needs: uniq(x.needs.concat(pr.map(r => POST_DEPT[r.role]))), attached: x.attached.concat(fromShoot.filter(a => !x.attached.some(b => b.sid && b.sid === a.sid && b.need === a.need))) };
  }
  const postOpen = x => { const t = postTeam(x); return t.needs.filter(n => !t.attached.some(a => a.need === n)); };
  const teamName = a => a.name || (student(a.sid) || { name: "Former member" }).name;
  const postWho = (x, wrap) => wrap ? `<button class="link-btn" data-student="${x.by || ""}">${esc(x.byName || (student(x.by) || { name: "Former member" }).name)}</button>` : esc(x.byName || (student(x.by) || { name: "Former member" }).name);
  // shoots with post roles (Editor, Colourist, VFX, Sound Designer, Composer) appear in Post on their own, until someone lists them properly
  const shootPostItems = () => live().filter(p => p.roles.some(r => POST_DEPT[r.role]) && !S.posts.some(x => x.pid === p.id && !x.hidden)).map(p => {
    const pr = p.roles.filter(r => POST_DEPT[r.role]);
    return { virtual: true, id: "sp_" + p.id, pid: p.id, by: p.dsid || null, byName: p.director, title: p.title, type: p.type, runtime: null, logline: p.logline, deadline: p.delivery || "", where: "", software: "", footage: "", link: "", posted: firstDay(p), status: "open",
      needs: uniq(pr.map(r => POST_DEPT[r.role])), attached: pr.filter(r => r.filledBy).map(r => isExt(r) ? { sid: null, name: extName(r), need: POST_DEPT[r.role] } : { sid: r.filledBy, need: POST_DEPT[r.role] }) };
  });
  // greyed out once the delivery date has passed; gone 30 days later. Shoot-only items without a delivery date go 60 days after the shoot.
  const postDim = x => !!x.deadline && x.deadline < TODAY;
  const postGone = x => x.deadline ? daysUntil(x.deadline) < -30 : x.virtual && isPast(project(x.pid)) && daysUntil(project(x.pid).wrapped || lastDay(project(x.pid))) < -60;
  const postItems = () => S.posts.filter(x => !x.hidden).concat(shootPostItems()).filter(x => !postGone(x));
  const postCfg = () => ({
    placeholder: "Search title, director or software", noun: "film", matchHint: "Films needing post work your profile roles cover",
    text: x => [x.title, x.logline, x.software, x.footage, x.byName || (student(x.by) || {}).name, x.type].join(" "),
    match: (x, m) => !postDim(x) && postOpen(x).some(n => (POST_ROLE[n] || []).some(r => m.roles.includes(r) || (m.learn || []).includes(r))),
    sink: postDim, sinkLabel: "Delivered",
    groups: [
      { id: "need", label: "Help needed", opts: POST_NEEDS, test: (x, v) => postOpen(x).includes(v) },
      { id: "stage", label: "Stage", opts: ["Shooting soon", "Wrapped"], test: (x, v) => { const p = x.pid && project(x.pid); const wrapped = !p || isPast(p); return v === "Wrapped" ? wrapped : !wrapped; } },
      { id: "where", label: "Where", opts: POST_WHERE, test: (x, v) => x.where === v || (v !== "Either" && x.where === "Either") },
      { id: "type", label: "Type", opts: uniqSorted(postItems().map(x => x.type)), test: (x, v) => x.type === v },
      { id: "due", label: "Delivery", opts: ["Next 30 days", "Next 3 months", "No delivery date"], test: (x, v) => v === "No delivery date" ? !x.deadline : !!x.deadline && daysUntil(x.deadline) >= 0 && daysUntil(x.deadline) <= (v === "Next 30 days" ? 30 : 92) }
    ],
    sorts: [["due", "Delivery soonest", (a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"), x => x.deadline], ["new", "Newest", (a, b) => b.posted.localeCompare(a.posted), x => x.posted]],
    done: x => !postDim(x) && !postOpen(x).length, doneLabel: "Show films with a full post team", doneHidden: "with a full post team",
    table: { dim: postDim, cols: [
      ["Film", x => `<button class="link-btn bt-t" ${x.virtual ? `data-proj="${x.pid}"` : `data-post="${x.id}"`}>${esc(x.title)}</button><span class="bt-sub">${esc(x.type)}${x.runtime ? ` · ${x.runtime} min` : ""}</span>`],
      ["Listed by", x => x.virtual ? `<span class="small">${esc(x.byName || "")}</span><span class="bt-sub">From the shoot</span>` : postWho(x), "small"],
      ["Help needed", x => postOpen(x).length ? `<div class="chips">${postOpen(x).map(n => `<span class="chip chip-hit">${esc(n)}</span>`).join("")}</div>` : `<span class="small muted">Full team</span>`],
      ["Delivery", x => x.deadline ? fmtFull(x.deadline) : "None", "mono small", x => x.deadline || "9999"],
      ["Where", x => esc(x.where || ""), "small"],
      ["Software", x => esc(x.software || ""), "small"]
    ] },
    timeline: { dim: postDim, label: x => `<button class="link-btn bt-t" ${x.virtual ? `data-proj="${x.pid}"` : `data-post="${x.id}"`}>${esc(x.title)}</button>`, sub: x => postOpen(x).length ? "Needs " + postOpen(x).join(", ") : "Full team",
      segs: x => { const p = x.pid && project(x.pid), from = p && !isPast(p) ? firstDay(p) : x.posted; return x.deadline ? [{ from, to: x.deadline, label: "Delivery " + fmtFull(x.deadline) }] : [{ from, to: addDays(from, 30), label: "No delivery date", dash: true }]; } }
  });
  const myWrappedForPost = m => S.projects.filter(p => !p.archived && isPast(p) && runs(p, m) && !S.posts.some(r => r.pid === p.id && !r.hidden) && !S.releases.some(r => r.pid === p.id));
  function renderPost(partial) {
    const root = $("#view-post"), m = me();
    if (!partial || !root.querySelector(".board-host")) {
      const wrapped = myWrappedForPost(m);
      root.innerHTML = `
        <div class="view-head"><div><h1 class="page-title">Post</h1><p class="muted">Wrapped shoots looking for an editor, colourist, sound designer, composer or VFX artist. Post work fits around other shoots, often from home, and every job becomes a credit on your profile.</p></div>
          <div class="head-acts"><button class="btn btn-accent" id="pfNew">List a film for post</button></div></div>
        ${wrapped.length ? `<div class="wrap-note"><p><b>${esc(wrapped.map(p => p.title).join(", "))}</b> ${wrapped.length === 1 ? "has wrapped. Find your post team." : "have wrapped. Find your post team."}</p>${wrapped.map(p => `<button class="btn btn-ghost btn-sm" data-postfrom="${p.id}">List ${esc(p.title)}</button>`).join("")}</div>` : ""}
        <div class="board-host" data-fkey="post"></div>`;
      $("#pfNew").onclick = () => openPostFilmForm();
      root.querySelectorAll("[data-postfrom]").forEach(b => b.onclick = () => openPostFilmForm(null, project(b.dataset.postfrom)));
    }
    board({ key: "post", host: root.querySelector(".board-host"), cfg: postCfg(), items: postItems(), card: postCard, partial, redraw: renderPost,
      empty: `<div class="empty"><p class="empty-t">Nothing matches</p><p class="muted">Try clearing a filter. Directors and producers, list a wrapped shoot to find an editor, colourist or sound designer.</p></div>`,
      after: host => { host.querySelectorAll("[data-post]").forEach(b => b.onclick = () => openPostItem(b.dataset.post)); host.querySelectorAll("[data-postlist]").forEach(b => b.onclick = () => openPostFilmForm(null, project(b.dataset.postlist))); bindOpeners(host); } });
  }
  function postCard(x) {
    const m = me(), open = postOpen(x), team = postTeam(x).attached, p = x.pid && project(x.pid), dim = postDim(x);
    const tags = `<span class="type-tag">${esc(x.type)}</span>${dim ? `<span class="tag-arch">Delivered</span>` : p && !isPast(p) ? `<span class="term-tag">Shooting ${fmtDay(firstDay(p))}</span>` : ""}${x.where ? `<span class="term-tag">${esc(x.where)}</span>` : ""}${x.deadline ? `<span class="term-tag ${!dim && daysUntil(x.deadline) <= 30 ? "tag-soon" : ""}">Delivery ${fmtDay(x.deadline)}</span>` : ""}`;
    const chips = `<div class="chips">${open.map(n => `<span class="chip chip-hit">Needs ${esc(n)}</span>`).join("")}${team.map(a => `<span class="chip">${esc(a.need)}: ${esc(teamName(a))}</span>`).join("")}</div>`;
    if (x.virtual) {
      const mine = p && runs(p, m);
      return `<article class="card rel-card${dim ? " is-dim" : ""}">
      ${coverImg(coverOf(x), "card-cover")}
        <div class="proj-top">${tags}</div>
        <h3 class="card-t"><button class="link-btn" data-proj="${x.pid}">${esc(x.title)}</button></h3>
        <p class="card-sub">From the shoot · directed by ${esc(x.byName || "")}</p>
        <p class="logline">${esc(x.logline)}</p>
        ${chips}
        <div class="card-actions">${mine ? `<button class="btn btn-accent btn-sm" data-postlist="${x.pid}">Add post details</button>` : open.length && !dim ? `<button class="btn btn-accent btn-sm" data-proj="${x.pid}">Request on the shoot</button>` : ""}
          <button class="btn btn-ghost btn-sm" data-proj="${x.pid}">Details</button></div>
      </article>`;
    }
    const myInt = S.postInterest.find(i => i.post === x.id && i.sid === m.id && i.status === "pending");
    const waiting = x.by === m.id ? S.postInterest.filter(i => i.post === x.id && i.status === "pending").length : 0;
    return `<article class="card rel-card${dim ? " is-dim" : ""}">
      ${coverImg(coverOf(x), "card-cover")}
      <div class="proj-top">${tags}</div>
      <h3 class="card-t"><button class="link-btn" data-post="${x.id}">${esc(x.title)}</button></h3>
      <p class="card-sub">Listed by <button class="link-btn" data-student="${x.by}">${esc((student(x.by) || { name: "Former member" }).name)}</button>${p ? ` · shot ${monYear(firstDay(p))}` : ""}${x.runtime ? ` · ${x.runtime} min` : ""}</p>
      <p class="logline">${esc(x.logline)}</p>
      ${x.software ? `<p class="small muted">${esc(x.software)}</p>` : ""}
      ${chips}
      <div class="card-actions">${x.by === m.id ? `<button class="btn btn-accent btn-sm" data-post="${x.id}">${waiting ? `${waiting} offer${waiting === 1 ? "" : "s"}` : "Manage"}</button>`
        : myInt ? `<span class="muted small">You've offered ${esc(myInt.need)}</span>`
        : open.length && !dim ? `<button class="btn btn-accent btn-sm" data-post="${x.id}">Offer to help</button>` : `<span class="muted small">${dim ? "Delivered" : "Full team"}</span>`}
        <button class="btn btn-ghost btn-sm" data-post="${x.id}">Details</button></div>
    </article>`;
  }
  function openPostItem(id) {
    const x = S.posts.find(y => y.id === id); if (!x) return toast("That film isn't on Crew Call any more");
    const m = me(), w = student(x.by) || { name: "Former member" }, mine = x.by === m.id, team = postTeam(x).attached;
    const ints = S.postInterest.filter(i => i.post === x.id), open = postOpen(x), onTeam = team.some(a => a.sid === m.id);
    const myInt = ints.find(i => i.sid === m.id && i.status === "pending"), p = x.pid && project(x.pid), dim = postDim(x);
    openModal(`
      <p class="eyebrow">Post</p>
      <h2 id="modalTitle" class="m-title">${esc(x.title)}</h2>
      <p class="card-sub">${esc(x.type)}${x.runtime ? ` · ${x.runtime} min` : ""} · listed by <button class="link-btn" data-student="${x.by}">${esc(w.name)}</button>${p ? ` · <button class="link-btn" data-proj="${p.id}">See the shoot</button>` : ""}</p>
      <p class="logline">${esc(x.logline)}</p>
      <dl class="meta-list">
        <div><dt>Help needed</dt><dd><div class="chips">${open.length ? open.map(n => `<span class="chip chip-hit">${esc(n)}</span>`).join("") : `<span class="muted">Full team</span>`}</div></dd></div>
        <div><dt>On the team</dt><dd>${team.length ? team.map(a => `${esc(a.need)}: ${a.sid ? `<button class="link-btn" data-student="${a.sid}">${esc(teamName(a))}</button>` : esc(teamName(a))}`).join("<br>") : `<span class="muted">Nobody yet</span>`}</dd></div>
        <div><dt>Delivery date</dt><dd>${x.deadline ? fmtFull(x.deadline) + (dim ? ` <span class="tag-arch">Delivered</span>` : "") : `<span class="muted">None set</span>`}</dd></div>
        <div><dt>Where</dt><dd>${x.where ? esc(x.where) : `<span class="muted">Not set</span>`}</dd></div>
        ${x.software ? `<div><dt>Software</dt><dd>${esc(x.software)}</dd></div>` : ""}
        ${x.footage ? `<div><dt>Footage</dt><dd>${esc(x.footage)}</dd></div>` : ""}
        <div><dt>Latest cut</dt><dd>${(mine || onTeam) && x.link ? linkTo(x.link, "Watch the latest cut") : mine ? `<span class="muted">No link added</span>` : `<span class="muted">Shared with the team</span>`}</dd></div>
      </dl>
      ${p && p.roles.some(r => POST_DEPT[r.role]) ? `<p class="small muted">Post roles picked on the shoot show here too.</p>` : ""}
      ${mine ? `<h3 class="dp-sub">Offers</h3>${ints.length ? `<ul class="inv-list">${ints.map(i => { const s = student(i.sid) || { name: "Former member" }; return `<li><span><button class="link-btn" data-student="${i.sid}">${esc(s.name)}</button> for <b>${esc(i.need)}</b>${s.term ? ` <span class="muted small">${esc(tLabel(s))}</span>` : ""}${i.msg ? `<br><span class="muted small">${esc(i.msg)}</span>` : ""}</span><span>${i.status === "pending" ? `<button class="btn btn-accent btn-xs" data-pattach="${i.id}">Bring on</button> <button class="btn btn-quiet btn-xs" data-pdecline="${i.id}">Decline</button>` : `<span class="st ${i.status === "attached" ? "st-ok" : ""}">${i.status === "attached" ? "On the team" : "Declined"}</span>`}</span></li>`; }).join("")}</ul>` : `<p class="empty-sm">No offers yet.</p>`}
        <div class="form-actions"><button class="btn btn-ghost" id="postEdit">Edit</button>${!x.pid || !S.releases.some(r => r.pid === x.pid) ? `<button class="btn btn-ghost" id="postToRel">Picture locked? List it in Release</button>` : ""}<button class="btn btn-quiet" id="postDel">Remove</button></div>`
      : myInt ? `<p class="muted">You've offered to help with ${esc(myInt.need)}. ${esc(first(w.name))} will reply and you'll get a notification. <button class="link-btn" id="postWithdraw">Withdraw</button></p>`
      : open.length && !dim ? `<h3 class="dp-sub">Offer to help</h3><form id="postInt" class="stack"><div class="field"><span>With</span><div class="fchips">${open.map((n, i) => `<label class="fchip-radio"><input type="radio" name="need" value="${esc(n)}" ${i === 0 ? "checked" : ""}><span>${esc(n)}</span></label>`).join("")}</div></div><label class="field"><span>Message to ${esc(first(w.name))}</span><textarea name="msg" rows="3" maxlength="400" placeholder="What you'd do, when you're free, and links to work you've cut, graded or mixed"></textarea></label><div class="form-actions"><button class="btn btn-accent">Send offer</button></div></form>` : ""}`);
    bindOpeners(modalBody);
    if (!mine) addReportLink("post", x.id);
    const f = $("#postInt");
    if (f) f.addEventListener("submit", e => { e.preventDefault(); const need = f.querySelector("[name=need]:checked").value; S.postInterest.push({ id: uid("pi"), post: x.id, sid: m.id, need, msg: f.msg.value.trim(), status: "pending", at: TODAY }); notify(x.by, "request", `${m.name} (${tLabel(m)}) offered to help with ${need} on ${x.title}. Open Post to reply.`); toast(`Offer sent to ${first(w.name)}`); openPostItem(x.id); renderPost(); drawHeader(); });
    const wd = $("#postWithdraw"); if (wd) wd.onclick = () => { S.postInterest.splice(S.postInterest.indexOf(myInt), 1); toast("Withdrawn"); openPostItem(x.id); renderPost(); };
    modalBody.querySelectorAll("[data-pattach]").forEach(b => b.onclick = () => {
      const i = S.postInterest.find(y => y.id === b.dataset.pattach); i.status = "attached";
      // if the shoot has an open role for this, fill it there too, so Shoot and Post agree
      const r = p && p.roles.find(r => !r.filledBy && POST_DEPT[r.role] === i.need);
      if (r) r.filledBy = i.sid; else x.attached.push({ sid: i.sid, need: i.need });
      S.postInterest.filter(y => y.post === x.id && y.need === i.need && y.status === "pending").forEach(y => { y.status = "declined"; notify(y.sid, "update", `${x.title} has found someone for ${y.need}. Thanks for offering.`); });
      notify(i.sid, "update", `${m.name} brought you on to ${x.title} for ${i.need}. The link to the cut is on the film's page in Post, and it's now a credit on your profile.`); toast(`${first(student(i.sid).name)} is on the team`); openPostItem(x.id); renderPost(); });
    modalBody.querySelectorAll("[data-pdecline]").forEach(b => b.onclick = () => { const i = S.postInterest.find(y => y.id === b.dataset.pdecline); i.status = "declined"; notify(i.sid, "update", `${x.title} isn't going ahead with your offer for ${i.need} this time. Thanks.`); openPostItem(x.id); renderPost(); });
    if ($("#postEdit")) $("#postEdit").onclick = () => openPostFilmForm(x);
    if ($("#postToRel")) $("#postToRel").onclick = () => { closeModal(); setView("release"); openReleaseForm(null, { id: x.pid, title: x.title, type: x.type, logline: x.logline, runtime: x.runtime, shoots: [] }); };
    if ($("#postDel")) $("#postDel").onclick = () => confirmBox(`Remove ${x.title}?`, "It disappears from Post. People who offered to help are told. Credits stay with the people on the team.", "Remove", () => { S.postInterest.filter(i => i.post === x.id && i.status === "pending").forEach(i => notify(i.sid, "update", `${x.title} has been taken off Post.`)); x.hidden = true; x.status = "closed"; closeModal(); renderPost(); toast("Removed"); });
  }
  function openPostFilmForm(x, fromP) {
    const m = me(), wrapped = myWrappedForPost(m);
    const fromNeeds = p => { const n = uniq(p.roles.filter(r => POST_DEPT[r.role]).map(r => POST_DEPT[r.role])); return n.length ? n : null; };
    const src = x || (fromP ? { pid: fromP.id, title: fromP.title, type: fromP.type, logline: fromP.logline, deadline: fromP.delivery || "", needs: fromNeeds(fromP) } : {});
    const choices = fromP && !wrapped.includes(fromP) ? [fromP].concat(wrapped) : wrapped;
    openModal(`<h2 id="modalTitle" class="m-title">${x ? "Edit film" : "List a film for post"}</h2>
      <form id="pfForm" class="stack">
        ${!x && choices.length ? `<label class="field"><span>Which film</span><select name="pid"><option value="">A film not on Crew Call</option>${choices.map(p => `<option value="${p.id}" ${src.pid === p.id ? "selected" : ""}>${esc(p.title)}</option>`).join("")}</select></label>` : ""}
        <label class="field"><span>Title</span><input name="title" required maxlength="80" value="${esc(src.title || "")}"></label>
        <div class="form-grid"><label class="field"><span>Type</span><select name="type">${C.TYPES.map(t => `<option ${src.type === t ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></label>
        <label class="field"><span>Expected length (minutes)</span><input name="runtime" type="number" inputmode="numeric" min="1" max="240" value="${src.runtime || ""}"></label></div>
        <label class="field"><span>Logline</span><textarea name="logline" rows="2" maxlength="240" required>${esc(src.logline || "")}</textarea></label>
        <div class="field"><span>Help needed <small>post roles on the shoot are added for you</small></span><div class="fchips">${POST_NEEDS.map(n => `<label class="fchip-radio"><input type="checkbox" name="need" value="${esc(n)}" ${(src.needs || ["Editing", "Colour grade", "Sound design & mix"]).includes(n) ? "checked" : ""}><span>${esc(n)}</span></label>`).join("")}</div></div>
        <div class="form-grid"><label class="field"><span>Delivery date <small>optional: picture lock, a festival or the school hand-in</small></span><input name="deadline" type="date" value="${src.deadline || ""}"></label>
        <label class="field"><span>Where</span><select name="where">${POST_WHERE.map(w => `<option ${(src.where || "Either") === w ? "selected" : ""}>${esc(w)}</option>`).join("")}</select></label></div>
        <div class="form-grid"><label class="field"><span>Software <small>optional</small></span><input name="software" maxlength="80" placeholder="e.g. Premiere, Resolve, Avid, Pro Tools" value="${esc(src.software || "")}"></label>
        <label class="field"><span>Footage <small>optional</small></span><input name="footage" maxlength="80" placeholder="e.g. ARRI ProRes 4K, about 2 TB" value="${esc(src.footage || "")}"></label></div>
        <label class="field"><span>Link to the cut or rushes <small>only shown to you and your team</small></span><input name="link" inputmode="url" autocapitalize="off" spellcheck="false" placeholder="vimeo.com/… or drive.google.com/…" value="${esc(src.link ? shortUrl(src.link) : "")}"></label>
        <p class="form-err" id="pfErr" role="alert"></p>
        <div class="form-actions"><button class="btn btn-accent">${x ? "Save" : "List film"}</button><button class="btn btn-ghost" type="button" data-close>Cancel</button></div>
      </form>`);
    const f = $("#pfForm");
    if (f.pid) f.pid.addEventListener("change", () => { const p = project(f.pid.value); if (p) { f.title.value = p.title; f.type.value = p.type; f.logline.value = p.logline; if (p.delivery) f.deadline.value = p.delivery; const n = fromNeeds(p); if (n) f.querySelectorAll("[name=need]").forEach(c => c.checked = n.includes(c.value)); } });
    f.addEventListener("submit", e => {
      e.preventDefault(); const needs = [...f.querySelectorAll("[name=need]:checked")].map(i => i.value);
      if (!needs.length) return ($("#pfErr").textContent = "Pick at least one thing you need help with.");
      const link = cleanUrl(f.link.value); if (f.link.value.trim() && !link) return ($("#pfErr").textContent = "That link isn't a web address.");
      const data = { title: f.title.value.trim(), type: f.type.value, runtime: +f.runtime.value || null, logline: f.logline.value.trim(), needs, deadline: f.deadline.value, where: f.where.value, software: f.software.value.trim(), footage: f.footage.value.trim(), link };
      const pid = x ? x.pid : f.pid ? f.pid.value || null : (fromP ? fromP.id : null);
      if (x) Object.assign(x, data); else S.posts.push({ id: uid("po"), by: m.id, pid, attached: [], posted: TODAY, status: "open", ...data });
      // keep the shoot's delivery date in step with the listing
      const lp = pid && project(pid); if (lp && canManage(lp)) lp.delivery = data.deadline;
      closeModal(); renderPost(); toast(x ? "Saved" : "Film listed");
    });
  }

  // ---------- RELEASE: finished films looking for marketing and festival help ----------
  const RELEASE_NEEDS = ["Festival strategy", "Poster & key art", "Trailer", "Socials & BTS", "Press kit", "Stills"];
  const NEED_ROLE = { "Festival strategy": ["Festival Strategy"], "Poster & key art": ["Key Art & Poster", "Production Designer"], "Trailer": ["Editor"], "Socials & BTS": ["Social Media & BTS", "Stills / BTS"], "Press kit": ["Unit Publicist"], "Stills": ["Stills / BTS"] };
  const relOpen = x => x.needs.filter(n => !x.attached.some(a => a.need === n));
  const relCfg = () => ({
    placeholder: "Search title, director or festival", noun: "film", matchHint: "Films needing help your profile roles cover",
    text: x => [x.title, x.logline, x.festivals, (student(x.by) || {}).name, x.type].join(" "),
    match: (x, m) => relOpen(x).some(n => (NEED_ROLE[n] || []).some(r => m.roles.includes(r))),
    groups: [
      { id: "need", label: "Help needed", opts: RELEASE_NEEDS, test: (x, v) => relOpen(x).includes(v) },
      { id: "type", label: "Type", opts: uniqSorted(S.releases.map(x => x.type)), test: (x, v) => x.type === v },
      { id: "due", label: "Deadline", opts: ["Next 30 days", "Next 3 months", "No deadline"], test: (x, v) => v === "No deadline" ? !x.deadline : !!x.deadline && daysUntil(x.deadline) >= 0 && daysUntil(x.deadline) <= (v === "Next 30 days" ? 30 : 92) }
    ],
    sorts: [["due", "Deadline soonest", (a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"), x => x.deadline], ["new", "Newest", (a, b) => b.posted.localeCompare(a.posted), x => x.posted]],
    done: x => !relOpen(x).length, doneLabel: "Show films with a full team", doneHidden: "with a full team",
    table: { cols: [
      ["Film", x => `<button class="link-btn bt-t" data-rel="${x.id}">${esc(x.title)}</button><span class="bt-sub">${esc(x.type)}${x.runtime ? ` · ${x.runtime} min` : ""}</span>`],
      ["Listed by", x => esc((student(x.by) || { name: "Former member" }).name), "small"],
      ["Help needed", x => relOpen(x).length ? `<div class="chips">${relOpen(x).map(n => `<span class="chip chip-hit">${esc(n)}</span>`).join("")}</div>` : `<span class="small muted">Full team</span>`],
      ["Deadline", x => x.deadline ? fmtFull(x.deadline) : "None", "mono small", x => x.deadline || "9999"],
      ["Aiming for", x => esc(x.festivals || ""), "small"]
    ] },
    timeline: { label: x => `<button class="link-btn bt-t" data-rel="${x.id}">${esc(x.title)}</button>`, sub: x => relOpen(x).length ? "Needs " + relOpen(x).join(", ") : "Full team",
      segs: x => x.deadline ? [{ from: x.posted, to: x.deadline, label: "Deadline " + fmtFull(x.deadline) }] : [{ from: x.posted, to: addDays(x.posted, 30), label: "No deadline", dash: true }] }
  });
  const myWrapped = m => S.projects.filter(p => !p.archived && isPast(p) && runs(p, m) && !S.releases.some(r => r.pid === p.id));
  function renderRelease(partial) {
    const root = $("#view-release"), m = me();
    if (!partial || !root.querySelector(".board-host")) {
      const wrapped = myWrapped(m);
      root.innerHTML = `
        <div class="view-head"><div><h1 class="page-title">Release</h1><p class="muted">Wrapped films looking for help to reach an audience: festival plans, posters, trailers, press kits and socials. A good fit for MA Film Marketing, and every job becomes a credit on your profile.</p></div>
          <div class="head-acts"><button class="btn btn-accent" id="relPost">List a film</button></div></div>
        ${wrapped.length ? `<div class="wrap-note"><p><b>${esc(wrapped.map(p => p.title).join(", "))}</b> ${wrapped.length === 1 ? "has" : "have"} wrapped. Get help taking ${wrapped.length === 1 ? "it" : "them"} to festivals.</p>${wrapped.map(p => `<button class="btn btn-ghost btn-sm" data-relfrom="${p.id}">List ${esc(p.title)}</button>`).join("")}</div>` : ""}
        <div class="board-host" data-fkey="rel"></div>`;
      $("#relPost").onclick = () => openReleaseForm();
      root.querySelectorAll("[data-relfrom]").forEach(b => b.onclick = () => openReleaseForm(null, project(b.dataset.relfrom)));
    }
    board({ key: "rel", host: root.querySelector(".board-host"), cfg: relCfg(), items: S.releases.filter(x => !x.hidden), card: releaseCard, partial, redraw: renderRelease,
      empty: `<div class="empty"><p class="empty-t">Nothing matches</p><p class="muted">Try clearing a filter. Directors and producers, list a wrapped film to find marketing help.</p></div>`,
      after: host => host.querySelectorAll("[data-rel]").forEach(b => b.onclick = () => openRelease(b.dataset.rel)) });
  }
  function releaseCard(x) {
    const w = student(x.by) || { name: "Former member" }, m = me(), open = relOpen(x);
    const myInt = S.releaseInterest.find(i => i.rel === x.id && i.sid === m.id && i.status === "pending");
    const waiting = x.by === m.id ? S.releaseInterest.filter(i => i.rel === x.id && i.status === "pending").length : 0;
    const dl = x.deadline ? daysUntil(x.deadline) : null;
    return `<article class="card rel-card">
      ${coverImg(coverOf(x), "card-cover")}
      <div class="proj-top"><span class="type-tag">${esc(x.type)}</span>${x.runtime ? `<span class="term-tag">${x.runtime} min</span>` : ""}${x.deadline ? `<span class="term-tag ${dl >= 0 && dl <= 30 ? "tag-soon" : ""}">Deadline ${fmtDay(x.deadline)}</span>` : ""}</div>
      <h3 class="card-t"><button class="link-btn" data-rel="${x.id}">${esc(x.title)}</button></h3>
      <p class="card-sub">Listed by <button class="link-btn" data-student="${x.by}">${esc(w.name)}</button>${x.pid && project(x.pid) ? ` · shot ${monYear(project(x.pid).shoots[0].from)}` : ""}</p>
      <p class="logline">${esc(x.logline)}</p>
      ${x.festivals ? `<p class="small muted">Aiming for: ${esc(x.festivals)}</p>` : ""}
      <div class="chips">${open.map(n => `<span class="chip chip-hit">Needs ${esc(n)}</span>`).join("")}${x.attached.map(a => `<span class="chip">${esc(a.need)}: ${esc((student(a.sid) || { name: "?" }).name)}</span>`).join("")}</div>
      <div class="card-actions">${x.by === m.id ? `<button class="btn btn-accent btn-sm" data-rel="${x.id}">${waiting ? `${waiting} offer${waiting === 1 ? "" : "s"}` : "Manage"}</button>`
        : myInt ? `<span class="muted small">You've offered ${esc(myInt.need)}</span>`
        : open.length ? `<button class="btn btn-accent btn-sm" data-rel="${x.id}">Offer to help</button>` : `<span class="muted small">Full team</span>`}
        <button class="btn btn-ghost btn-sm" data-rel="${x.id}">Details</button></div>
    </article>`;
  }
  function openRelease(id) {
    const x = S.releases.find(y => y.id === id), m = me(), w = student(x.by) || { name: "Former member" }, mine = x.by === m.id;
    const ints = S.releaseInterest.filter(i => i.rel === x.id), open = relOpen(x), onTeam = x.attached.some(a => a.sid === m.id);
    const myInt = ints.find(i => i.sid === m.id && i.status === "pending"), p = x.pid && project(x.pid);
    openModal(`
      <p class="eyebrow">Release</p>
      <h2 id="modalTitle" class="m-title">${esc(x.title)}</h2>
      <p class="card-sub">${esc(x.type)}${x.runtime ? ` · ${x.runtime} min` : ""} · listed by <button class="link-btn" data-student="${x.by}">${esc(w.name)}</button>${p ? ` · <button class="link-btn" data-proj="${p.id}">See the shoot</button>` : ""}</p>
      <p class="logline">${esc(x.logline)}</p>
      <dl class="meta-list">
        <div><dt>Help needed</dt><dd><div class="chips">${open.length ? open.map(n => `<span class="chip chip-hit">${esc(n)}</span>`).join("") : `<span class="muted">Full team</span>`}</div></dd></div>
        <div><dt>On the team</dt><dd>${x.attached.length ? x.attached.map(a => `${esc(a.need)}: <button class="link-btn" data-student="${a.sid}">${esc((student(a.sid) || { name: "?" }).name)}</button>`).join("<br>") : `<span class="muted">Nobody yet</span>`}</dd></div>
        <div><dt>Deadline</dt><dd>${x.deadline ? `${fmtFull(x.deadline)}${x.festivals ? ` · ${esc(x.festivals)}` : ""}` : x.festivals ? esc(x.festivals) : `<span class="muted">None set</span>`}</dd></div>
        <div><dt>Screener</dt><dd>${(mine || onTeam) && x.link ? `<a href="${esc(x.link)}" target="_blank" rel="noopener">Watch the film</a>` : mine ? `<span class="muted">No link added</span>` : `<span class="muted">Shared with the team</span>`}</dd></div>
      </dl>
      ${mine ? `<h3 class="dp-sub">Offers</h3>${ints.length ? `<ul class="inv-list">${ints.map(i => { const s = student(i.sid) || { name: "Former member" }; return `<li><span><button class="link-btn" data-student="${i.sid}">${esc(s.name)}</button> for <b>${esc(i.need)}</b>${s.term ? ` <span class="muted small">${esc(tLabel(s))}</span>` : ""}${i.msg ? `<br><span class="muted small">${esc(i.msg)}</span>` : ""}</span><span>${i.status === "pending" ? `<button class="btn btn-accent btn-xs" data-rattach="${i.id}">Bring on</button> <button class="btn btn-quiet btn-xs" data-rdecline="${i.id}">Decline</button>` : `<span class="st ${i.status === "attached" ? "st-ok" : ""}">${i.status === "attached" ? "On the team" : "Declined"}</span>`}</span></li>`; }).join("")}</ul>` : `<p class="empty-sm">No offers yet.</p>`}
        <div class="form-actions"><button class="btn btn-ghost" id="relEdit">Edit</button><button class="btn btn-quiet" id="relDel">Remove</button></div>`
      : myInt ? `<p class="muted">You've offered to help with ${esc(myInt.need)}. ${esc(first(w.name))} will reply and you'll get a notification. <button class="link-btn" id="relWithdraw">Withdraw</button></p>`
      : open.length ? `<h3 class="dp-sub">Offer to help</h3><form id="relInt" class="stack"><div class="field"><span>With</span><div class="fchips">${open.map((n, i) => `<label class="fchip-radio"><input type="radio" name="need" value="${esc(n)}" ${i === 0 ? "checked" : ""}><span>${esc(n)}</span></label>`).join("")}</div></div><label class="field"><span>Message to ${esc(first(w.name))}</span><textarea name="msg" rows="3" maxlength="400" placeholder="What you'd do, and links to anything similar you've made"></textarea></label><div class="form-actions"><button class="btn btn-accent">Send offer</button></div></form>` : ""}`);
    bindOpeners(modalBody);
    if (!mine) addReportLink("film", x.id);
    const f = $("#relInt");
    if (f) f.addEventListener("submit", e => { e.preventDefault(); const need = f.querySelector("[name=need]:checked").value; S.releaseInterest.push({ id: uid("ri"), rel: x.id, sid: m.id, need, msg: f.msg.value.trim(), status: "pending", at: TODAY }); notify(x.by, "request", `${m.name} (${tLabel(m)}) offered to help with ${need} for ${x.title}. Open Release to reply.`); toast(`Offer sent to ${first(w.name)}`); openRelease(x.id); renderRelease(); drawHeader(); });
    const wd = $("#relWithdraw"); if (wd) wd.onclick = () => { S.releaseInterest.splice(S.releaseInterest.indexOf(myInt), 1); toast("Withdrawn"); openRelease(x.id); renderRelease(); };
    modalBody.querySelectorAll("[data-rattach]").forEach(b => b.onclick = () => { const i = S.releaseInterest.find(y => y.id === b.dataset.rattach); i.status = "attached"; x.attached.push({ sid: i.sid, need: i.need }); S.releaseInterest.filter(y => y.rel === x.id && y.need === i.need && y.status === "pending").forEach(y => { y.status = "declined"; notify(y.sid, "update", `${x.title} has found someone for ${y.need}. Thanks for offering.`); }); notify(i.sid, "update", `${m.name} brought you on to ${x.title} for ${i.need}. The screener link is on the film's page in Release, and it's now a credit on your profile.`); toast(`${first(student(i.sid).name)} is on the team`); openRelease(x.id); renderRelease(); });
    modalBody.querySelectorAll("[data-rdecline]").forEach(b => b.onclick = () => { const i = S.releaseInterest.find(y => y.id === b.dataset.rdecline); i.status = "declined"; notify(i.sid, "update", `${x.title} isn't going ahead with your offer for ${i.need} this time. Thanks.`); openRelease(x.id); renderRelease(); });
    if ($("#relEdit")) $("#relEdit").onclick = () => openReleaseForm(x);
    if ($("#relDel")) $("#relDel").onclick = () => confirmBox(`Remove ${x.title}?`, "It disappears from Release. People who offered to help are told.", "Remove", () => { S.releaseInterest.filter(i => i.rel === x.id && i.status === "pending").forEach(i => notify(i.sid, "update", `${x.title} has been taken off Release.`)); S.releases.splice(S.releases.indexOf(x), 1); closeModal(); renderRelease(); toast("Removed"); });
  }
  function openReleaseForm(x, fromP) {
    const m = me(), wrapped = myWrapped(m), src = x || (fromP ? { pid: fromP.id, title: fromP.title, type: fromP.type, logline: fromP.logline } : {});
    openModal(`<h2 id="modalTitle" class="m-title">${x ? "Edit film" : "List a film for release help"}</h2>
      <form id="relForm" class="stack">
        ${!x && wrapped.length ? `<label class="field"><span>Which film</span><select name="pid"><option value="">A film not on Crew Call</option>${wrapped.map(p => `<option value="${p.id}" ${src.pid === p.id ? "selected" : ""}>${esc(p.title)}</option>`).join("")}</select></label>` : ""}
        <label class="field"><span>Title</span><input name="title" required maxlength="80" value="${esc(src.title || "")}"></label>
        <div class="form-grid"><label class="field"><span>Type</span><select name="type">${C.TYPES.map(t => `<option ${src.type === t ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></label>
        <label class="field"><span>Running time (minutes)</span><input name="runtime" type="number" inputmode="numeric" min="1" max="240" value="${src.runtime || ""}"></label></div>
        <label class="field"><span>Logline</span><textarea name="logline" rows="2" maxlength="240" required>${esc(src.logline || "")}</textarea></label>
        <div class="field"><span>Help needed</span><div class="fchips">${RELEASE_NEEDS.map(n => `<label class="fchip-radio"><input type="checkbox" name="need" value="${esc(n)}" ${(src.needs || ["Festival strategy", "Poster & key art"]).includes(n) ? "checked" : ""}><span>${esc(n)}</span></label>`).join("")}</div></div>
        <div class="form-grid"><label class="field"><span>Next deadline <small>optional</small></span><input name="deadline" type="date" value="${src.deadline || ""}"></label>
        <label class="field"><span>Festivals or goals</span><input name="festivals" maxlength="120" placeholder="e.g. Encounters, BFI Future Film" value="${esc(src.festivals || "")}"></label></div>
        <label class="field"><span>Screener link <small>only shown to you and your team</small></span><input name="link" inputmode="url" autocapitalize="off" spellcheck="false" placeholder="vimeo.com/…" value="${esc(src.link || "")}"></label>
        <p class="form-err" id="relErr" role="alert"></p>
        <div class="form-actions"><button class="btn btn-accent">${x ? "Save" : "List film"}</button><button class="btn btn-ghost" type="button" data-close>Cancel</button></div>
      </form>`);
    const f = $("#relForm");
    if (f.pid) f.pid.addEventListener("change", () => { const p = project(f.pid.value); if (p) { f.title.value = p.title; f.type.value = p.type; f.logline.value = p.logline; } });
    f.addEventListener("submit", e => {
      e.preventDefault(); const needs = [...f.querySelectorAll("[name=need]:checked")].map(i => i.value);
      if (!needs.length) return ($("#relErr").textContent = "Pick at least one thing you need help with.");
      const link = cleanUrl(f.link.value); if (f.link.value.trim() && !link) return ($("#relErr").textContent = "That link isn't a web address.");
      const data = { title: f.title.value.trim(), type: f.type.value, runtime: +f.runtime.value || null, logline: f.logline.value.trim(), needs, deadline: f.deadline.value, festivals: f.festivals.value.trim(), link };
      if (x) Object.assign(x, data); else S.releases.push({ id: uid("rl"), by: m.id, pid: f.pid ? f.pid.value || null : (fromP ? fromP.id : null), attached: [], posted: TODAY, status: "open", ...data });
      closeModal(); renderRelease(); toast(x ? "Saved" : "Film listed");
    });
  }


  // ---------- PHOTOS: one small 16:9 picture per project or campaign ----------
  // Shrunk in the browser to about 100 KB before upload, so the free 1 GB of Supabase storage holds thousands.
  const coverImg = (url, cls) => url && /^(https:|data:image\/)/.test(url) ? `<img class="${cls}" src="${esc(url)}" alt="" loading="lazy" decoding="async">` : "";
  const coverOf = x => (x && x.cover) || (x && x.pid && project(x.pid) && project(x.pid).cover) || "";
  function shrinkImage(file, W = 1000, H = 563, q = .78) {
    return new Promise((ok, no) => {
      const img = new Image(), u = URL.createObjectURL(file);
      img.onload = () => {
        const c = document.createElement("canvas"); c.width = W; c.height = H;
        const s = Math.max(W / img.naturalWidth, H / img.naturalHeight), w = img.naturalWidth * s, h = img.naturalHeight * s;
        const g = c.getContext("2d"); g.fillStyle = "#111"; g.fillRect(0, 0, W, H); g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
        URL.revokeObjectURL(u);
        if (LIVE) c.toBlob(b => b ? ok(b) : no(new Error("Couldn't read that picture")), "image/jpeg", q); else ok(c.toDataURL("image/jpeg", q));
      };
      img.onerror = () => { URL.revokeObjectURL(u); no(new Error("That file isn't a picture we can read. Try a JPG or PNG.")); };
      img.src = u;
    });
  }
  const photoField = (url, hint) => `<div class="field photo-field"><span>Photo <small>${esc(hint || "optional: a still or poster for the card. It's cropped to 16:9 and shrunk to a small file")}</small></span>
    <div class="ph-row"><div class="ph-prev" data-phprev>${url ? coverImg(url, "ph-img") : `<span class="muted small">No photo</span>`}</div>
    <div class="ph-acts"><label class="btn btn-ghost btn-sm ph-pick">Choose photo<input type="file" accept="image/jpeg,image/png,image/webp,image/heic" data-phfile></label><button type="button" class="btn btn-quiet btn-sm" data-phx ${url ? "" : "hidden"}>Remove photo</button><span class="small muted" data-phst role="status"></span></div></div>
    <input type="hidden" name="cover" value="${esc(url || "")}"></div>`;
  function bindPhoto(form) {
    const inp = form.querySelector("[data-phfile]"); if (!inp) return;
    const hid = form.querySelector("[name=cover]"), prev = form.querySelector("[data-phprev]"), x = form.querySelector("[data-phx]"), st = form.querySelector("[data-phst]");
    const sub = form.querySelector("button.btn-accent:not([type=button])");
    const show = url => { hid.value = url; prev.innerHTML = url ? coverImg(url, "ph-img") : `<span class="muted small">No photo</span>`; x.hidden = !url; };
    inp.addEventListener("change", async () => {
      const file = inp.files[0]; inp.value = ""; if (!file) return;
      if (file.size > 25e6) return (st.textContent = "That file is over 25 MB. Pick a smaller one.");
      st.textContent = "Uploading…"; if (sub) sub.disabled = true;
      try { const out = await shrinkImage(file); show(LIVE ? await window.CC_CLOUDAPI.uploadCover(out) : out); st.textContent = ""; }
      catch (e) { st.textContent = /bucket|not found|policy|security/i.test(e.message || "") ? "Photos aren't switched on yet: an admin needs to run supabase/storage.sql once." : (e.message || "Couldn't upload that picture"); }
      if (sub) sub.disabled = false;
    });
    x.addEventListener("click", () => show(""));
  }
  // after saving: tidy up a photo that was replaced, if this person uploaded it
  const dropOldCover = (was, now) => { if (LIVE && was && was !== now) window.CC_CLOUDAPI.removeCover(was).catch(() => {}); };

  // ---------- FUNDING: crowdfunding campaigns for LFS films ----------
  const FUND_SITES = ["Kickstarter", "Indiegogo", "Seed&Spark", "GoFundMe", "Crowdfunder", "Other"];
  const CURRENCIES = ["£", "€", "$"];
  const money = (n, cur) => (cur || "£") + Math.round(+n || 0).toLocaleString("en-GB");
  const fundPct = x => x.goal > 0 ? Math.round((+x.raised || 0) / x.goal * 100) : 0;
  const fundEnded = x => !!x.deadline && x.deadline < TODAY;
  const fundGone = x => !!x.deadline && daysUntil(x.deadline) < -30;
  const fundLeft = x => { const d = daysUntil(x.deadline); return d < 0 ? "Ended" : d === 0 ? "Ends today" : d === 1 ? "1 day left" : `${d} days left`; };
  const canEditFund = x => { const m = me(); return !!m && (x.by === m.id || isAdmin(m)); };
  const fundOf = p => S.funds.find(x => x.pid === p.id && !x.hidden && !fundGone(x));
  const fundItems = () => S.funds.filter(x => !x.hidden && !fundGone(x));
  const fundBar = x => `<div class="fund-bar" role="img" aria-label="${fundPct(x)}% of the goal raised"><span style="width:${Math.min(100, fundPct(x))}%"></span></div>`;
  const fundNums = x => `<p class="fund-nums"><b>${money(x.raised, x.cur)}</b> <span class="muted">of ${money(x.goal, x.cur)}</span> <span class="fund-pct">${fundPct(x)}%</span></p>`;
  const fundCfg = () => ({
    placeholder: "Search title, director or platform", noun: "campaign", matchHint: "Campaigns for shoots you're on",
    text: x => [x.title, x.pitch, x.uses, x.platform, (student(x.by) || {}).name, x.type].join(" "),
    match: (x, m) => !!x.pid && !!project(x.pid) && (onProject(project(x.pid), m.id) || runs(project(x.pid), m)),
    sink: fundEnded, sinkLabel: "Ended",
    groups: [
      { id: "site", label: "Platform", opts: FUND_SITES.filter(t => fundItems().some(x => x.platform === t)), test: (x, v) => x.platform === v },
      { id: "type", label: "Type", opts: uniqSorted(fundItems().map(x => x.type)), test: (x, v) => x.type === v },
      { id: "ends", label: "Ends", opts: ["This week", "This month", "Later"], test: (x, v) => { const d = daysUntil(x.deadline); return d >= 0 && (v === "This week" ? d <= 7 : v === "This month" ? d <= 31 : d > 31); } }
    ],
    sorts: [["end", "Ending soonest", (a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"), x => x.deadline], ["pct", "Closest to goal", (a, b) => fundPct(b) - fundPct(a)], ["new", "Newest", (a, b) => (b.posted || "").localeCompare(a.posted || ""), x => x.posted]],
    table: { dim: fundEnded, cols: [
      ["Film", x => `<button class="link-btn bt-t" data-fund="${x.id}">${esc(x.title)}</button><span class="bt-sub">${esc(x.type)}</span>`],
      ["By", x => esc((student(x.by) || { name: "Former member" }).name), "small"],
      ["Platform", x => esc(x.platform), "small"],
      ["Raised", x => `${money(x.raised, x.cur)} <span class="muted">of ${money(x.goal, x.cur)}</span>`, "mono small", x => -fundPct(x)],
      ["Ends", x => `${fmtFull(x.deadline)}<span class="bt-sub">${fundLeft(x)}</span>`, "mono small", x => x.deadline]
    ] },
    timeline: { dim: fundEnded, label: x => `<button class="link-btn bt-t" data-fund="${x.id}">${esc(x.title)}</button>`, sub: x => `${money(x.raised, x.cur)} of ${money(x.goal, x.cur)}`,
      segs: x => [{ from: x.starts || x.posted || TODAY, to: x.deadline, label: "Ends " + fmtFull(x.deadline) }] }
  });
  function renderFund(partial) {
    const root = $("#view-fund"), m = me();
    if (!partial || !root.querySelector(".board-host")) {
      root.innerHTML = `
        <div class="view-head"><div><h1 class="page-title">Funding</h1><p class="muted">Crowdfunding campaigns for LFS films. Back a classmate's shoot, share it, or post your own with its goal and deadline. The money goes through the platform, never through Crew Call.</p></div>
          <div class="head-acts"><button class="btn btn-accent" id="fundPost">Post a campaign</button></div></div>
        <div class="board-host" data-fkey="fund"></div>`;
      $("#fundPost").onclick = () => openFundForm();
    }
    board({ key: "fund", host: root.querySelector(".board-host"), cfg: fundCfg(), items: fundItems(), card: fundCard, partial, redraw: renderFund,
      empty: `<div class="empty"><p class="empty-t">No campaigns right now</p><p class="muted">Raising money for a shoot? Post your campaign so the school can back it.</p></div>`,
      after: host => host.querySelectorAll("[data-fund]").forEach(b => b.onclick = () => openFund(b.dataset.fund)) });
  }
  function fundCard(x) {
    const w = student(x.by) || { name: "Former member" }, p = x.pid && project(x.pid), ended = fundEnded(x), d = daysUntil(x.deadline);
    return `<article class="card fund-card${ended ? " is-dim" : ""}">
      ${coverImg(coverOf(x), "card-cover")}
      <div class="proj-top"><span class="type-tag">${esc(x.type)}</span><span class="term-tag">${esc(x.platform)}</span>${ended ? `<span class="tag-arch">Ended</span>` : `<span class="term-tag ${d <= 7 ? "tag-soon" : ""}">${fundLeft(x)}</span>`}</div>
      <h3 class="card-t"><button class="link-btn" data-fund="${x.id}">${esc(x.title)}</button></h3>
      <p class="card-sub"><span>By</span> <button class="link-btn" data-student="${x.by}">${esc(w.name)}</button>${p ? ` · <button class="link-btn" data-proj="${p.id}">See the shoot</button>` : ""}</p>
      <p class="logline">${esc(x.pitch)}</p>
      ${fundBar(x)}${fundNums(x)}
      <p class="small muted">Ends ${fmtFull(x.deadline)}</p>
      <div class="card-actions">${!ended && x.url ? `<a class="btn btn-accent btn-sm" href="${esc(x.url)}" target="_blank" rel="noopener">Back it</a>` : ""}<button class="btn btn-ghost btn-sm" data-fund="${x.id}">${canEditFund(x) ? "Update" : "Details"}</button></div>
    </article>`;
  }
  function openFund(id) {
    const x = S.funds.find(y => y.id === id); if (!x) return;
    const w = student(x.by) || { name: "Former member" }, p = x.pid && project(x.pid), ed = canEditFund(x), ended = fundEnded(x);
    openModal(`
      ${coverImg(coverOf(x), "m-cover")}
      <p class="eyebrow">Funding · ${esc(x.platform)}</p>
      <h2 id="modalTitle" class="m-title">${esc(x.title)}</h2>
      <p class="card-sub"><span>${esc(x.type)}</span> · <span>by</span> <button class="link-btn" data-student="${x.by}">${esc(w.name)}</button>${p ? ` · <button class="link-btn" data-proj="${p.id}">See the shoot</button>` : ""}</p>
      <p class="logline">${esc(x.pitch)}</p>
      ${fundBar(x)}${fundNums(x)}
      <dl class="meta-list">
        <div><dt>Deadline</dt><dd>${fmtFull(x.deadline)} · ${fundLeft(x)}</dd></div>
        ${x.uses ? `<div><dt>What it pays for</dt><dd>${esc(x.uses).replace(/\n/g, "<br>")}</dd></div>` : ""}
        <div><dt>Campaign</dt><dd>${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(hostOf(x.url))}</a> <button class="btn btn-quiet btn-xs" data-copy="${esc(x.url)}">Copy link</button>` : `<span class="muted">No link</span>`}</dd></div>
      </dl>
      ${!ended && x.url ? `<div class="form-actions"><a class="btn btn-accent" href="${esc(x.url)}" target="_blank" rel="noopener">Back it on ${esc(x.platform)}</a></div>` : ""}
      ${ed ? `<h3 class="dp-sub">Update the total</h3><form id="fundUpd" class="fund-upd"><label class="field"><span>Raised so far (${esc(x.cur || "£")})</span><input name="raised" type="number" inputmode="numeric" min="0" step="1" value="${+x.raised || 0}"></label><button class="btn btn-accent btn-sm">Save total</button></form>
        <div class="form-actions"><button class="btn btn-ghost" id="fundEdit">Edit campaign</button><button class="btn btn-quiet" id="fundDel">Remove</button></div>` : ""}`);
    bindOpeners(modalBody);
    if (!ed) addReportLink("campaign", x.id);
    const u = $("#fundUpd");
    if (u) u.addEventListener("submit", e => { e.preventDefault(); x.raised = Math.max(0, Math.round(+u.raised.value || 0)); x.updated = TODAY; toast(`Total saved: ${money(x.raised, x.cur)}`); openFund(x.id); renderAfterFund(); });
    if ($("#fundEdit")) $("#fundEdit").onclick = () => openFundForm(x);
    if ($("#fundDel")) $("#fundDel").onclick = () => confirmBox(`Remove ${x.title}?`, "The campaign comes off Funding. Nothing changes on the crowdfunding site itself.", "Remove", () => { dropOldCover(x.cover, ""); S.funds.splice(S.funds.indexOf(x), 1); closeModal(); renderAfterFund(); toast("Removed"); });
  }
  const renderAfterFund = () => { if (view === "fund") renderFund(); else render(); };
  function openFundForm(x, fromP) {
    const m = me(); if (!m) return openSignIn("Sign in to post a campaign.");
    const mine = S.projects.filter(p => !p.archived && runs(p, m) && !S.funds.some(f => f.pid === p.id && f !== x && !fundGone(f)));
    const src = x || (fromP ? { pid: fromP.id, title: fromP.title, type: fromP.type, pitch: fromP.logline } : { cur: "£" });
    openModal(`<h2 id="modalTitle" class="m-title">${x ? "Edit campaign" : "Post a crowdfunding campaign"}</h2>
      <p class="muted small">Post it once your campaign page is live. People back it on the platform; Crew Call only shows the goal, the total and the deadline.</p>
      <form id="fundForm" class="stack">
        ${!x ? `<label class="field"><span>Which film</span><select name="pid"><option value="">A film that isn't on Crew Call yet</option>${mine.map(p => `<option value="${p.id}" ${src.pid === p.id ? "selected" : ""}>${esc(p.title)}</option>`).join("")}</select></label>` : ""}
        <label class="field"><span>Title</span><input name="title" required maxlength="80" value="${esc(src.title || "")}"></label>
        <div class="form-grid"><label class="field"><span>Type</span><select name="type">${C.TYPES.map(t => `<option ${src.type === t ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></label>
        <label class="field"><span>Platform</span><select name="platform">${FUND_SITES.map(t => `<option ${src.platform === t ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></label></div>
        <label class="field"><span>Campaign link</span><input name="url" required inputmode="url" autocapitalize="off" spellcheck="false" placeholder="kickstarter.com/projects/…" value="${esc(src.url || "")}"></label>
        <div class="form-grid fund-grid"><label class="field"><span>Currency</span><select name="cur">${CURRENCIES.map(c => `<option ${(src.cur || "£") === c ? "selected" : ""}>${c}</option>`).join("")}</select></label>
        <label class="field"><span>Goal</span><input name="goal" type="number" inputmode="numeric" min="1" step="1" required value="${src.goal || ""}"></label>
        <label class="field"><span>Raised so far</span><input name="raised" type="number" inputmode="numeric" min="0" step="1" value="${src.raised || 0}"></label>
        <label class="field"><span>Deadline</span><input name="deadline" type="date" required min="${x ? "" : TODAY}" value="${src.deadline || ""}"></label></div>
        <label class="field"><span>Pitch <small>one or two lines</small></span><textarea name="pitch" rows="2" maxlength="220" required>${esc(src.pitch || "")}</textarea></label>
        <label class="field"><span>What the money pays for <small>optional</small></span><textarea name="uses" rows="3" maxlength="500" placeholder="e.g. location hire, kit, food for 20 crew, festival fees">${esc(src.uses || "")}</textarea></label>
        ${photoField(src.cover || "", "optional: leave empty to use the shoot's photo")}
        <p class="form-err" id="fundErr" role="alert"></p>
        <div class="form-actions"><button class="btn btn-accent">${x ? "Save" : "Post campaign"}</button><button class="btn btn-ghost" type="button" data-close>Cancel</button></div>
      </form>`);
    const f = $("#fundForm"); bindPhoto(f);
    if (f.pid) f.pid.addEventListener("change", () => { const p = project(f.pid.value); if (p) { f.title.value = p.title; f.type.value = p.type; if (!f.pitch.value.trim()) f.pitch.value = p.logline; } });
    f.addEventListener("submit", e => {
      e.preventDefault(); const err = $("#fundErr");
      const url = cleanUrl(f.url.value); if (!url) return (err.textContent = "The campaign link isn't a web address.");
      const goal = Math.round(+f.goal.value || 0); if (goal < 1) return (err.textContent = "Add the goal.");
      if (!f.deadline.value) return (err.textContent = "Add the deadline.");
      const data = { title: f.title.value.trim(), type: f.type.value, platform: f.platform.value, url, cur: f.cur.value, goal, raised: Math.max(0, Math.round(+f.raised.value || 0)), deadline: f.deadline.value, pitch: f.pitch.value.trim(), uses: f.uses.value.trim(), cover: f.cover.value, updated: TODAY };
      if (x) { dropOldCover(x.cover, data.cover); Object.assign(x, data); }
      else {
        const pid = f.pid ? f.pid.value || null : (fromP ? fromP.id : null), it = { id: uid("fu"), by: m.id, pid, posted: TODAY, starts: TODAY, ...data };
        S.funds.push(it);
        const p = pid && project(pid);
        if (p) [...new Set(p.roles.filter(r => r.filledBy && !isExt(r)).map(r => r.filledBy).concat(p.shadows.map(s => s.sid)))].filter(id => id !== m.id).forEach(id => notify(id, "update", `${p.title} is crowdfunding on ${data.platform}: ${money(goal, data.cur)} by ${fmtFull(data.deadline)}. Back it or share it from Funding.`, p.id));
      }
      closeModal(); setView("fund"); toast(x ? "Saved" : "Campaign posted");
    });
  }

  // ---------- PAID: paid work, separate from school shoots (which are in kind) ----------
  const GIG_TYPES = ["Commercial", "Music video", "Corporate or event", "Feature or series", "Short film", "Post-production", "Other"];
  const PAY_TYPES = ["Day rate", "Flat fee", "Hourly"];
  const gigFirst = g => (g.dates[0] || {}).from || g.deadline || g.posted;
  const gigWhen = g => { const n = daysUntil(gigFirst(g)); return n <= 7 ? "This week" : n <= 14 ? "Next 2 weeks" : n <= 31 ? "This month" : "Later"; };
  const gigOpen = g => g.status === "open" && (!g.deadline || g.deadline >= TODAY);
  // a shoot with paid roles, shaped like a paid job so it can sit on the same board
  const shootGigs = () => live().filter(p => !isPast(p) && paidOpen(p).length).map(p => { const rs = paidOpen(p), pays = [...new Set(rs.map(r => r.pay).filter(Boolean))];
    return { id: "pj-" + p.id, pid: p.id, proj: true, title: p.title, org: `Directed by ${p.dsid && student(p.dsid) ? student(p.dsid).name : p.director}`, type: "LFS shoot", roles: [...new Set(rs.map(r => r.role))], rate: pays.length ? pays.join(" / ") : "Paid", payType: "", dates: p.shoots, loc: locShort(p), details: p.logline, deadline: "", posted: p.posted || TODAY, status: "open", by: p.by || p.dsid, p }; });
  const paidItems = () => [...S.gigs.filter(g => !g.hidden), ...shootGigs()];
  const gigLink = (g, html, cls = "link-btn") => `<button class="${cls}" ${g.proj ? `data-proj="${g.pid}"` : `data-gig="${g.id}"`}>${html}</button>`;
  const gigCfg = () => ({
    placeholder: "Search job, company, role or place", noun: "job", matchHint: "Paid jobs for a role on your profile",
    text: g => [g.title, g.org, g.roles.join(" "), g.loc, g.details, g.type].join(" "),
    match: (g, m) => g.roles.some(r => m.roles.includes(r)),
    groups: [
      { id: "role", multi: true, label: "Role", opts: uniqSorted(paidItems().flatMap(g => g.roles)), test: (g, v) => g.roles.includes(v) },
      { id: "when", label: "Working", opts: ["This week", "Next 2 weeks", "This month", "Later"], test: (g, v) => gigWhen(g) === v },
      { id: "type", label: "Type", opts: ["LFS shoot", ...GIG_TYPES].filter(t => paidItems().some(g => g.type === t)), test: (g, v) => g.type === v },
      { id: "pay", label: "Pay", opts: PAY_TYPES, test: (g, v) => g.payType === v }
    ],
    sorts: [["soon", "Working soonest", (a, b) => gigFirst(a).localeCompare(gigFirst(b)), gigFirst], ["due", "Apply by soonest", (a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"), g => g.deadline], ["new", "Newest", (a, b) => b.posted.localeCompare(a.posted), g => g.posted]],
    done: g => !gigOpen(g), doneLabel: "Show filled and closed jobs", doneHidden: "filled or closed",
    table: { cols: [
      ["Job", g => `${gigLink(g, esc(g.title), "link-btn bt-t")}<span class="bt-sub">${esc(g.org)} · ${esc(g.type)}</span>`],
      ["Roles", g => `<div class="chips">${g.roles.map(r => `<span class="chip chip-open">${esc(r)}</span>`).join("")}</div>`],
      ["Pay", g => `<b>${esc(g.rate)}</b><span class="bt-sub">${esc(g.payType)}</span>`, "small", g => -(parseFloat(String(g.rate).replace(/[^0-9.]/g, "")) || 0)],
      ["Dates", g => `<span class="nowrap">${g.dates.map(fmtRange).join("<br>") || "Flexible"}</span>`, "mono small", g => gigFirst(g)],
      ["Where", g => esc(g.loc), "small"],
      ["Apply by", g => g.deadline ? fmtFull(g.deadline) : "Open", "mono small", g => g.deadline || "9999"]
    ] },
    timeline: { label: g => gigLink(g, esc(g.title), "link-btn bt-t"), sub: g => `${g.rate} · ${g.roles.join(", ")}`,
      segs: g => [...(g.deadline && g.deadline >= TODAY ? [{ from: g.posted > TODAY ? g.posted : TODAY, to: g.deadline, label: "Apply by " + fmtFull(g.deadline), dash: true }] : []), ...g.dates.map(r => ({ from: r.from, to: r.to, label: fmtRange(r) }))] }
  });
  function renderPaid(partial) {
    const root = $("#view-paid"), m = me();
    if (!partial || !root.querySelector(".board-host")) {
      const mine = S.gigs.filter(g => g.by === m.id), waiting = S.gigApps.filter(a => mine.some(g => g.id === a.gig) && a.status === "pending").length;
      root.innerHTML = `
        <div class="view-head"><div><p class="eyebrow">Paid work</p><h1 class="page-title">Paid opportunities</h1><p class="muted">Work that pays: jobs posted by students, alumni and industry contacts, plus paid roles on LFS shoots. Most school shoots are in kind, so you work for the credit, the experience and usually meals and travel. Every job shows its rate.</p></div>
          <div class="head-acts"><button class="btn btn-accent" id="gigPost">Post a paid job</button></div></div>
        <p class="note-box">Check who you're working for before you agree. Crew Call admins don't vet jobs or handle money. If a job doesn't pay what it says, report it.</p>
        ${mine.length ? `<p class="mine-note">You've posted ${mine.length}. ${waiting ? `<b>${waiting} ${waiting === 1 ? "person is" : "people are"} waiting for your reply.</b>` : "Nobody waiting for a reply."}</p>` : ""}
        <div class="board-host" data-fkey="paid"></div>`;
      $("#gigPost").onclick = () => openGigForm();
    }
    board({ key: "paid", host: root.querySelector(".board-host"), cfg: gigCfg(), items: paidItems(), card: gigCard, partial, redraw: renderPaid,
      empty: `<div class="empty"><p class="empty-t">No paid jobs match</p><p class="muted">Try clearing a filter. If you hear of paid work, post it here.</p></div>`,
      after: host => host.querySelectorAll("[data-gig]").forEach(b => b.onclick = () => openGig(b.dataset.gig)) });
  }
  function gigCard(g) {
    if (g.proj) { const p = g.p, k = perksOf(p), on = PERKS.filter(x => k[x[0]]).map(x => x[1]);
      return `<article class="card gig-card" style="--c:${projColor(p)}">
      <div class="proj-top"><span class="type-tag">LFS shoot</span><span class="pay-tag">${esc(g.rate)}</span><span class="term-tag">${esc(p.term)}</span></div>
      <h3 class="card-t">${gigLink(g, esc(g.title))}</h3>
      <p class="card-sub">${esc(g.org)} · ${esc(p.type)}</p>
      <p class="dates mono">${g.dates.map(fmtRange).join(" + ")} · ${esc(g.loc)}</p>
      <p class="logline">${esc(g.details)}</p>
      <div class="chips">${paidOpen(p).map(r => `<span class="chip chip-open">${esc(r.role)}${r.pay ? ` · ${esc(r.pay)}` : ""}</span>`).join("")}</div>
      ${on.length ? `<p class="small muted"><span>Also:</span> ${on.map(x => `<span>${esc(x)}</span>`).join(", ")}</p>` : ""}
      <div class="card-actions"><button class="btn btn-accent btn-sm" data-proj="${p.id}">View roles</button></div>
    </article>`; }
    const w = student(g.by) || { name: "Former member" }, m = me();
    const myApp = S.gigApps.find(a => a.gig === g.id && a.sid === m.id && a.status !== "withdrawn");
    const waiting = g.by === m.id ? S.gigApps.filter(a => a.gig === g.id && a.status === "pending").length : 0;
    const dl = g.deadline ? daysUntil(g.deadline) : null;
    return `<article class="card gig-card">
      <div class="proj-top"><span class="type-tag">${esc(g.type)}</span><span class="pay-tag">${esc(g.rate)}</span>${g.status === "filled" ? `<span class="tag-arch">Filled</span>` : g.deadline && dl < 0 ? `<span class="tag-arch">Closed</span>` : g.deadline ? `<span class="term-tag ${dl <= 7 ? "tag-soon" : ""}">Apply by ${fmtDay(g.deadline)}</span>` : ""}</div>
      <h3 class="card-t"><button class="link-btn" data-gig="${g.id}">${esc(g.title)}</button></h3>
      <p class="card-sub">${esc(g.org)} · posted by <button class="link-btn" data-student="${g.by}">${esc(w.name)}</button></p>
      <p class="dates mono">${g.dates.map(fmtRange).join(" + ") || "Dates flexible"} · ${esc(g.loc)}</p>
      <p class="logline">${esc(g.details)}</p>
      <div class="chips">${g.roles.map(r => `<span class="chip chip-open">${esc(r)}</span>`).join("")}</div>
      <div class="card-actions">${g.by === m.id ? `<button class="btn btn-accent btn-sm" data-gig="${g.id}">${waiting ? `${waiting} interested` : "Manage"}</button>`
        : myApp ? `<span class="muted small">${myApp.status === "hired" ? "You got this job" : myApp.status === "declined" ? "Not this time" : "You've put your name forward"}</span>`
        : gigOpen(g) ? `<button class="btn btn-accent btn-sm" data-gig="${g.id}">I'm interested</button>` : ""}
        <button class="btn btn-ghost btn-sm" data-gig="${g.id}">Details</button></div>
    </article>`;
  }
  function openGig(id) {
    const g = S.gigs.find(y => y.id === id), m = me(), w = student(g.by) || { name: "Former member" }, mine = g.by === m.id;
    const apps = S.gigApps.filter(a => a.gig === g.id), myApp = apps.find(a => a.sid === m.id && a.status !== "withdrawn"), mod = can("projects");
    openModal(`
      <p class="eyebrow">Paid work</p>
      <h2 id="modalTitle" class="m-title">${esc(g.title)}</h2>
      <p class="card-sub">${esc(g.org)} · ${esc(g.type)} · posted by <button class="link-btn" data-student="${g.by}">${esc(w.name)}</button></p>
      <p class="logline">${esc(g.details)}</p>
      <dl class="meta-list">
        <div><dt>Pay</dt><dd><b>${esc(g.rate)}</b> <span class="muted">(${esc(g.payType)})</span></dd></div>
        <div><dt>Roles</dt><dd><div class="chips">${g.roles.map(r => `<span class="chip chip-open">${esc(r)}</span>`).join("")}</div></dd></div>
        <div><dt>Dates</dt><dd>${g.dates.map(fmtRange).join("<br>") || `<span class="muted">Flexible</span>`}</dd></div>
        <div><dt>Where</dt><dd>${esc(g.loc)}</dd></div>
        <div><dt>Apply by</dt><dd>${g.deadline ? fmtFull(g.deadline) : `<span class="muted">Open until filled</span>`}</dd></div>
        ${/^https?:\/\//.test(g.apply || "") ? `<div><dt>How to apply</dt><dd><a href="${esc(g.apply)}" target="_blank" rel="noopener">Apply on their site</a></dd></div>` : ""}
      </dl>
      ${mine ? `<h3 class="dp-sub">Interested</h3>${apps.length ? `<ul class="inv-list">${apps.map(a => { const s = student(a.sid) || { name: "Former member" }; return `<li><span><button class="link-btn" data-student="${a.sid}">${esc(s.name)}</button> for <b>${esc(a.role)}</b>${s.term ? ` <span class="muted small">${esc(tLabel(s))}</span>` : ""}${a.msg ? `<br><span class="muted small">${esc(a.msg)}</span>` : ""}</span><span>${a.status === "pending" ? `<button class="btn btn-accent btn-xs" data-ghire="${a.id}">Hire</button> <button class="btn btn-quiet btn-xs" data-gdecline="${a.id}">Decline</button>` : `<span class="st ${a.status === "hired" ? "st-ok" : ""}">${a.status === "hired" ? "Hired" : a.status === "withdrawn" ? "Withdrew" : "Declined"}</span>`}</span></li>`; }).join("")}</ul>` : `<p class="empty-sm">Nobody yet.</p>`}
        <div class="form-actions"><button class="btn btn-ghost" id="gigEdit">Edit</button>${g.status === "open" ? `<button class="btn btn-ghost" id="gigFilled">Mark as filled</button>` : `<button class="btn btn-ghost" id="gigReopen">Reopen</button>`}<button class="btn btn-quiet" id="gigDel">Remove</button></div>`
      : myApp ? `<p class="muted">${myApp.status === "hired" ? `${esc(first(w.name))} hired you for ${esc(myApp.role)}. Sort out the paperwork and payment with them directly.` : myApp.status === "declined" ? "They went with someone else this time." : `You've put your name forward for ${esc(myApp.role)}. ${esc(first(w.name))} will reply and you'll get a notification. <button class="link-btn" id="gigWithdraw">Withdraw</button>`}</p>`
      : gigOpen(g) ? `<h3 class="dp-sub">Put your name forward</h3><form id="gigApp" class="stack"><div class="field"><span>For</span><div class="fchips">${g.roles.map((r, i) => `<label class="fchip-radio"><input type="radio" name="role" value="${esc(r)}" ${i === 0 || m.roles.includes(r) ? "checked" : ""}><span>${esc(r)}</span></label>`).join("")}</div></div><label class="field"><span>Message to ${esc(first(w.name))}</span><textarea name="msg" rows="3" maxlength="400" placeholder="Your experience, kit and a link to your reel"></textarea></label><p class="small muted">${esc(first(w.name))} sees your profile, including your reel and credits. Your email is only shared if you've chosen to share it.</p><div class="form-actions"><button class="btn btn-accent">Send</button></div></form>`
      : `<p class="muted">This job is ${g.status === "filled" ? "filled" : "closed"}.</p>`}
      ${mod && !mine ? `<p class="small muted mt"><button class="link-btn" id="gigHide">Take this job down</button> (admin)</p>` : ""}`);
    bindOpeners(modalBody);
    if (!mine) addReportLink("job", g.id);
    const redraw = () => { openGig(g.id); renderPaid(); drawHeader(); };
    const f = $("#gigApp");
    if (f) f.addEventListener("submit", e => { e.preventDefault(); const role = f.querySelector("[name=role]:checked").value; S.gigApps.push({ id: uid("ga"), gig: g.id, sid: m.id, role, msg: f.msg.value.trim(), status: "pending", at: TODAY }); notify(g.by, "request", `${m.name} (${tLabel(m)}) is interested in your paid job ${g.title} as ${role}. Open Paid to reply.`); toast(`Sent to ${first(w.name)}`); redraw(); });
    const wd = $("#gigWithdraw"); if (wd) wd.onclick = () => { myApp.status = "withdrawn"; toast("Withdrawn"); redraw(); };
    modalBody.querySelectorAll("[data-ghire]").forEach(b => b.onclick = () => { const a = S.gigApps.find(y => y.id === b.dataset.ghire); a.status = "hired"; notify(a.sid, "update", `${m.name} hired you for ${g.title} as ${a.role} (${g.rate}). Agree the details and payment with them directly.`); toast(`${first(student(a.sid).name)} hired`); redraw(); });
    modalBody.querySelectorAll("[data-gdecline]").forEach(b => b.onclick = () => { const a = S.gigApps.find(y => y.id === b.dataset.gdecline); a.status = "declined"; notify(a.sid, "update", `${g.title} has gone with someone else this time. Thanks for putting your name forward.`); redraw(); });
    if ($("#gigEdit")) $("#gigEdit").onclick = () => openGigForm(g);
    if ($("#gigFilled")) $("#gigFilled").onclick = () => { g.status = "filled"; apps.filter(a => a.status === "pending").forEach(a => { a.status = "declined"; notify(a.sid, "update", `${g.title} has been filled. Thanks for putting your name forward.`); }); toast("Marked as filled"); redraw(); };
    if ($("#gigReopen")) $("#gigReopen").onclick = () => { g.status = "open"; toast("Reopened"); redraw(); };
    if ($("#gigDel")) $("#gigDel").onclick = () => confirmBox(`Remove ${g.title}?`, "It disappears from Paid. Anyone waiting for a reply is told.", "Remove", () => { apps.filter(a => a.status === "pending").forEach(a => notify(a.sid, "update", `${g.title} has been taken off Paid.`)); S.gigs.splice(S.gigs.indexOf(g), 1); closeModal(); renderPaid(); toast("Removed"); });
    if ($("#gigHide")) $("#gigHide").onclick = () => confirmBox(`Take ${g.title} down?`, `It's hidden from everyone. ${esc(first(w.name))} gets a notification.`, "Take down", () => { g.hidden = true; notify(g.by, "update", `An admin took your paid job ${g.title} off Crew Call. Reply to the admins if you think this is a mistake.`); logAdmin(`Took down the paid job “${g.title}”`); closeModal(); renderPaid(); toast("Taken down"); }, true);
  }
  function openGigForm(g) {
    const m = me(), src = g || { dates: [], roles: [], payType: "Day rate" };
    openModal(`<h2 id="modalTitle" class="m-title">${g ? "Edit paid job" : "Post a paid job"}</h2>
      <p class="muted">Only for work that pays. Unpaid or in-kind shoots go on Shoot.</p>
      <form id="gigForm" class="stack">
        <label class="field"><span>Job title</span><input name="title" required maxlength="80" placeholder="e.g. Gaffer for a coffee brand film" value="${esc(src.title || "")}"></label>
        <div class="form-grid"><label class="field"><span>Company or client</span><input name="org" required maxlength="60" value="${esc(src.org || "")}"></label>
        <label class="field"><span>Type</span><select name="type">${GIG_TYPES.map(t => `<option ${src.type === t ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></label></div>
        <details class="field gig-roles" ${src.roles.length ? "" : "open"}><summary><span>Roles</span> <span class="muted small" id="gigRoleN">${src.roles.length ? src.roles.join(", ") : "Pick one or more"}</span></summary>${Object.entries(C.ROLE_GROUPS).map(([grp, rs]) => `<p class="fgroup-h">${esc(grp)}</p><div class="fchips">${rs.map(r => `<label class="fchip-radio"><input type="checkbox" name="role" value="${esc(r)}" ${src.roles.includes(r) ? "checked" : ""}><span>${esc(r)}</span></label>`).join("")}</div>`).join("")}</details>
        <div class="form-grid"><label class="field"><span>Pay <small>required</small></span><input name="rate" required maxlength="60" placeholder="e.g. £250 a day" value="${esc(src.rate || "")}"></label>
        <label class="field"><span>Paid as</span><select name="payType">${PAY_TYPES.map(t => `<option ${src.payType === t ? "selected" : ""}>${t}</option>`).join("")}</select></label></div>
        <div class="field"><span>Dates</span><div id="gigDates" class="range-list">${(src.dates.length ? src.dates : [{ from: "", to: "" }]).map(r => rangeRow(r)).join("")}</div><button type="button" class="btn btn-quiet btn-xs" id="gigDateAdd">Add more dates</button></div>
        <div class="form-grid"><label class="field"><span>Where</span><input name="loc" required maxlength="80" placeholder="e.g. Hackney Wick, or Remote" value="${esc(src.loc || "")}"></label>
        <label class="field"><span>Apply by <small>optional</small></span><input name="deadline" type="date" value="${src.deadline || ""}"></label></div>
        <label class="field"><span>Details</span><textarea name="details" rows="3" maxlength="500" required placeholder="What the job is, hours, kit, and anything people should know">${esc(src.details || "")}</textarea></label>
        <label class="field"><span>Application link <small>optional, otherwise people reply through Crew Call</small></span><input name="apply" inputmode="url" autocapitalize="off" spellcheck="false" placeholder="theirsite.com/apply" value="${esc(src.apply || "")}"></label>
        <p class="form-err" id="gigErr" role="alert"></p>
        <div class="form-actions"><button class="btn btn-accent">${g ? "Save" : "Post job"}</button><button class="btn btn-ghost" type="button" data-close>Cancel</button></div>
      </form>`);
    const f = $("#gigForm");
    $("#gigDateAdd").onclick = () => $("#gigDates").insertAdjacentHTML("beforeend", rangeRow());
    $("#gigDates").addEventListener("click", e => { if (e.target.closest(".r-del") && $("#gigDates").children.length > 1) e.target.closest(".range-row").remove(); });
    f.addEventListener("change", e => { if (e.target.name === "role") { const n = [...f.querySelectorAll("[name=role]:checked")].map(i => i.value); $("#gigRoleN").textContent = n.length ? n.join(", ") : "Pick one or more"; } });
    f.addEventListener("submit", e => {
      e.preventDefault();
      const roles = [...f.querySelectorAll("[name=role]:checked")].map(i => i.value), rate = f.rate.value.trim(), apply = cleanUrl(f.apply.value);
      if (!roles.length) return ($("#gigErr").textContent = "Pick at least one role.");
      if (!/\d/.test(rate)) return ($("#gigErr").textContent = "Say what it pays, for example £250 a day.");
      if (f.apply.value.trim() && !apply) return ($("#gigErr").textContent = "That link isn't a web address.");
      const data = { title: f.title.value.trim(), org: f.org.value.trim(), type: f.type.value, roles, rate, payType: f.payType.value, dates: readRanges(f), loc: f.loc.value.trim(), deadline: f.deadline.value, details: f.details.value.trim(), apply };
      if (g) Object.assign(g, data); else S.gigs.unshift({ id: uid("g"), by: m.id, posted: TODAY, status: "open", ...data });
      closeModal(); renderPaid(); toast(g ? "Saved" : "Job posted");
    });
  }

  // ---------- PHONE PICKER: replaces native dropdowns on touch screens ----------
  const usePicker = () => window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 700;
  const pickSheet = document.createElement("div");
  pickSheet.className = "pick-sheet"; pickSheet.hidden = true;
  pickSheet.innerHTML = `<div class="pick-in" role="dialog" aria-modal="true" aria-labelledby="pickTitle"><div class="fsheet-h"><b id="pickTitle"></b><button type="button" class="icon-btn" data-pclose aria-label="Close">×</button></div><div class="pick-list" role="listbox"></div></div>`;
  document.body.appendChild(pickSheet);
  let pickFor = null;
  const selLabel = sel => { if (sel.getAttribute("aria-label")) return sel.getAttribute("aria-label"); const l = sel.closest("label"); const s = l && l.querySelector("span"); return s ? s.childNodes[0].textContent.trim() : "Choose"; };
  function openPicker(sel) {
    pickFor = sel;
    pickSheet.querySelector("#pickTitle").textContent = selLabel(sel);
    const opt = o => `<button type="button" role="option" class="pick-opt ${o.selected ? "on" : ""}" aria-selected="${o.selected}" data-pv="${esc(o.value)}" ${o.disabled ? "disabled" : ""}>${esc(o.textContent)}</button>`;
    pickSheet.querySelector(".pick-list").innerHTML = [...sel.children].map(c => c.tagName === "OPTGROUP" ? `<p class="pick-g">${esc(c.label)}</p>${[...c.children].map(opt).join("")}` : opt(c)).join("");
    pickSheet.hidden = false; document.body.classList.add("no-scroll");
    const on = pickSheet.querySelector(".pick-opt.on"); (on || pickSheet.querySelector(".pick-opt") || pickSheet.querySelector("[data-pclose]")).focus();
    if (on) on.scrollIntoView({ block: "center" });
  }
  function closePicker() { pickSheet.hidden = true; if (modal.hidden) document.body.classList.remove("no-scroll"); const b = pickFor && pickFor._pbtn; pickFor = null; if (b) b.focus(); }
  pickSheet.addEventListener("click", e => {
    if (e.target === pickSheet || e.target.closest("[data-pclose]")) return closePicker();
    const b = e.target.closest("[data-pv]"); if (!b || !pickFor) return;
    pickFor.value = b.dataset.pv; pickFor.dispatchEvent(new Event("input", { bubbles: true })); pickFor.dispatchEvent(new Event("change", { bubbles: true }));
    syncPickers(); closePicker();
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !pickSheet.hidden) { e.stopPropagation(); closePicker(); } }, true);
  function syncPickers() {
    if (!usePicker()) return;
    document.querySelectorAll("select:not([multiple]):not([data-native])").forEach(sel => {
      if (!sel._pbtn) {
        const b = document.createElement("button"); b.type = "button"; b.className = "pick-btn";
        b.addEventListener("click", () => !sel.disabled && openPicker(sel));
        sel.after(b); sel.classList.add("pick-hidden"); sel.tabIndex = -1; sel.setAttribute("aria-hidden", "true"); sel._pbtn = b;
      }
      const o = sel.options[sel.selectedIndex], b = sel._pbtn;
      b.textContent = o ? o.textContent : selLabel(sel); b.disabled = sel.disabled; b.setAttribute("aria-label", `${selLabel(sel)}: ${b.textContent}`);
      if (sel.id) b.dataset.for = sel.id;
    });
  }
  let pickRaf = 0;
  new MutationObserver(() => { if (!pickRaf) pickRaf = requestAnimationFrame(() => { pickRaf = 0; syncPickers(); }); }).observe(document.body, { childList: true, subtree: true });
  document.addEventListener("change", e => { if (e.target.tagName === "SELECT" && e.target._pbtn) syncPickers(); });
  document.addEventListener("cc:lang", () => syncPickers());

  // ---------- REPORTS ----------
  const REPORT_REASONS = ["Safety on set", "Harassment or bullying", "Discrimination", "Inappropriate content", "Spam or fake profile", "Something else"];
  const reportTarget = r => r.kind === "project" ? project(r.target) : r.kind === "script" || r.kind === "pitch" ? S.scripts.find(x => x.id === r.target) : r.kind === "film" ? S.releases.find(x => x.id === r.target) : r.kind === "post" ? S.posts.find(x => x.id === r.target) : r.kind === "job" ? S.gigs.find(x => x.id === r.target) : r.kind === "campaign" ? S.funds.find(x => x.id === r.target) : student(r.target);
  const reportName = r => { if (r.kind === "general") return "Crew Call in general"; const t = reportTarget(r); return t ? (t.title || t.name) : "Removed"; };
  const safetyAdmins = () => S.admins.map(student).filter(a => a && can("safety", a));
  function addReportLink(kind, id) {
    if (!me()) return;
    modalBody.insertAdjacentHTML("beforeend", `<p class="report-row"><button type="button" class="link-btn" data-report="${kind}|${id}">Report a problem with this ${kind === "person" ? "profile" : kind}</button></p>`);
    modalBody.querySelector("[data-report]").onclick = () => openReport(kind, id);
  }
  function openReport(kind, id) {
    const m = me(); if (!m) return openSignIn("Sign in to report a problem.");
    const t = reportTarget({ kind, target: id }), name = t ? (t.title || t.name) : "";
    openModal(`<h2 id="modalTitle" class="m-title">Report a problem</h2>
      <p class="muted">${kind === "general" ? "About anything: a shoot that isn't listed, something that happened on set, or a problem with Crew Call." : `About <b>${esc(name)}</b>.`} This goes to Crew Call's admins only. The person or crew you report aren't told who reported them.</p>
      <p class="safety-note"><b>If someone is in danger right now, call 999.</b> For anything serious, also tell LFS Student Services. Crew Call admins are students, not the school.</p>
      <form id="repForm" class="stack">
        <fieldset class="field"><span>What's wrong</span>${REPORT_REASONS.map((r, i) => `<label class="toggle"><input type="radio" name="reason" value="${esc(r)}" ${i === 0 ? "checked" : ""}> <span>${esc(r)}</span></label>`).join("")}</fieldset>
        <label class="field"><span>What happened</span><textarea name="details" rows="4" maxlength="1000" required placeholder="Dates, what was said or done, anything the admins need to know"></textarea></label>
        <div class="form-actions"><button class="btn btn-accent">Send report</button><button class="btn btn-ghost" type="button" data-close>Cancel</button></div>
      </form>`);
    $("#repForm").addEventListener("submit", e => {
      e.preventDefault(); const f = e.target;
      const r = { id: uid("r"), kind, target: id, by: m.id, reason: f.reason.value, details: f.details.value.trim(), at: TODAY, status: "open" };
      S.reports.unshift(r);
      safetyAdmins().forEach(a => a.id !== m.id && notify(a.id, "update", `New report: ${r.reason} about ${reportName(r)}. Open Admin, then Reports.`));
      closeModal(); drawHeader(); toast("Report sent to the admins. Thank you.");
    });
  }

  // ---------- PRIVACY NOTICE + DOWNLOAD MY DATA ----------
  function openPrivacy() {
    const owner = student(S.owner), mo = S.settings.retainMonths;
    openModal(`<h2 id="modalTitle" class="m-title">Privacy notice</h2>
      <div class="prose">
      <p class="muted small">Draft for LFS to check before launch. Last updated ${fmtFull(TODAY)}.</p>
      <h3>Who runs Crew Call</h3><p>Crew Call is run by LFS students for LFS students. The current owner is ${esc(owner ? owner.name : "the owner")}. It isn't run by the London Film School. Questions go to <a href="mailto:${esc(replyAddr())}">${esc(replyAddr())}</a>.</p>
      <h3>What we keep</h3><ul><li>Your name, LFS email, course and cohort code</li><li>The roles, kit, credits and skills you add, your bio and portfolio links</li><li>The days you mark as free, the shoots you post, and your crew requests and messages</li><li>Reports you send, and admin actions taken on them</li></ul>
      <h3>Who can see it</h3><ul><li>Nothing about people is visible to anyone who isn't signed in. The calendar shows only shoot titles and dates.</li><li>Signed-in members see your profile, unless you hide it.</li><li>Your email is only shown if you choose to share it, or to the producer and director of a shoot you're locked onto.</li><li>Script links are only shown to people the writer attaches.</li><li>Reports are only seen by admins with the Reports and privacy permission.</li></ul>
      <h3>On your device</h3><p>Only your sign-in, and a draft of any form you've started but not sent, so a stray click doesn't lose your typing. Signing out clears both.</p><h3>What we don't do</h3><p>No adverts, no tracking cookies, and we never sell or share your data. Data is stored with Supabase in their London region.</p>
      <h3>How long we keep it</h3><p>Once you're an alumnus or a guest, your profile is deleted if you haven't signed in for ${mo} months. We email you 30 days before. Delete your profile any time from My profile.</p>
      <h3>Your rights</h3><p>You can download everything Crew Call holds about you from My profile, correct it, or delete it. If you're unhappy with how your data is handled, email us first. You can also complain to the <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noopener">Information Commissioner's Office</a>.</p>
      </div>`);
  }
  function downloadMyData() {
    const m = me(); if (!m) return;
    const mineP = S.projects.filter(p => onProject(p, m.id) || runs(p, m));
    download(`crew-call-my-data-${m.id}.json`, JSON.stringify({ exported: TODAY, profile: m, projects: mineP.map(p => ({ id: p.id, title: p.title, shoots: p.shoots, myRoles: p.roles.filter(r => r.filledBy === m.id).map(r => r.role) })), requests: S.requests.filter(q => q.sid === m.id), notifications: S.notifications.filter(n => n.to === m.id), scripts: S.scripts.filter(x => x.by === m.id), scriptInterest: S.scriptInterest.filter(i => i.sid === m.id), releases: S.releases.filter(x => x.by === m.id), releaseInterest: S.releaseInterest.filter(i => i.sid === m.id), posts: S.posts.filter(x => x.by === m.id), postInterest: S.postInterest.filter(i => i.sid === m.id), reportsSent: S.reports.filter(r => r.by === m.id).map(r => ({ at: r.at, reason: r.reason, about: reportName(r), status: r.status })) }, null, 2), "application/json");
    toast("Downloaded your data");
  }
  // retention: alumni and guests who haven't been active for N months
  const monthsAgo = n => { const d = D(TODAY); d.setUTCMonth(d.getUTCMonth() - n); return iso(d); };
  const lastSeen = s => [s.seen, s.updated].filter(Boolean).sort().pop() || "2000-01-01";
  const retentionList = () => {
    const cut = monthsAgo(S.settings.retainMonths), warn = addDays(cut, 30);
    return S.students.filter(s => (s.guest || s.term === "Alumni") && s.id !== S.owner && !S.admins.includes(s.id) && lastSeen(s) < warn)
      .map(s => ({ s, due: lastSeen(s) < cut, on: (() => { const d = D(lastSeen(s)); d.setUTCMonth(d.getUTCMonth() + S.settings.retainMonths); return iso(d); })() }))
      .sort((a, b) => a.on.localeCompare(b.on));
  };

  // ---------- ADD TO HOME SCREEN ----------
  let installPrompt = null;
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installPrompt = e; });
  try { if ("serviceWorker" in navigator && location.protocol === "https:" && window.top === window) navigator.serviceWorker.register("sw.js").catch(() => {}); } catch (_) { /* not allowed here, e.g. inside a preview frame */ }
  function openInstall() {
    openModal(`<h2 id="modalTitle" class="m-title">Add Crew Call to your home screen</h2>
      <p class="muted">It opens full screen like an app, with no app store needed.</p>
      ${installPrompt ? `<button class="btn btn-accent" id="installNow">Install Crew Call</button>` : ""}
      <h3 class="dp-sub">iPhone</h3><ol class="steps"><li>Open Crew Call in Safari.</li><li>Tap Share, the square with an arrow.</li><li>Tap Add to Home Screen, then Add.</li></ol>
      <h3 class="dp-sub">Android</h3><ol class="steps"><li>Open Crew Call in Chrome.</li><li>Tap the three-dot menu.</li><li>Tap Add to Home screen or Install app.</li></ol>`);
    const b = $("#installNow"); if (b) b.onclick = async () => { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; closeModal(); };
  }
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-privacy],[data-install]"); if (!b) return;
    e.preventDefault(); if (b.hasAttribute("data-privacy")) openPrivacy(); else openInstall();
  });

  // ---------- render ----------
  // ---------- ABOUT ----------
  const OPEN_SOURCE = [
    ["Leaflet", "Draws the Shoot map", "BSD-2-Clause", "https://leafletjs.com/"],
    ["OpenStreetMap", "Map tiles and place data, made by volunteers", "ODbL", "https://www.openstreetmap.org/copyright"],
    ["Nominatim", "Finds locations when you type an address", "GPL-2.0", "https://nominatim.org/"],
    ["Unicode CLDR", "Dates, months and plurals in every language, built into your browser", "Unicode License", "https://cldr.unicode.org/"],
    ["OpenCC", "Turns Traditional Chinese into Simplified Chinese", "Apache-2.0", "https://github.com/BYVoid/OpenCC"],
    ["Wikidata", "Used to cross-check crew role names in other languages", "CC0", "https://www.wikidata.org/"],
    ["Archivo", "Typeface", "OFL-1.1", "https://github.com/Omnibus-Type/Archivo"],
    ["JetBrains Mono", "Typeface for times and dates", "OFL-1.1", "https://github.com/JetBrains/JetBrainsMono"],
    ["Supabase", "Database and sign-in for the live version", "Apache-2.0", "https://github.com/supabase/supabase"],
    ["iCalendar (.ics)", "The open standard behind calendar sync", "RFC 5545", "https://datatracker.ietf.org/doc/html/rfc5545"]
  ];
  function renderAbout() {
    const owner = student(S.owner), nt = nextTerm(), now = termNow();
    const boards = [["Calendar", "Every shoot on one calendar, and who's free on each day."], ["Develop", "Scripts looking for a director, producer or writer."], ["Shoot", "Projects crewing up, as cards, a table, a timeline or a map."], ["Post", "Wrapped shoots looking for an editor, colourist, sound designer, composer or VFX."], ["Release", "Finished films looking for help with festivals, posters and screenings."], ["Paid", "Paid jobs and opportunities, checked by admins."], ["Crew", "Find people by role, kit and the days they're free."], ["My shoots", "What you're running, what you've asked to join, and your call times."]];
    $("#view-about").innerHTML = `
      <div class="view-head"><h1 class="page-title">About Crew Call</h1><p class="muted">A shared calendar and crew board for London Film School students, run by students.</p></div>
      <div class="about-grid">
        <section class="panel"><h2 class="panel-h">What Crew Call is</h2>
          <p>LFS students make films all the time and need crew for them. Crew Call puts every shoot in one place, so you can see what's happening, mark the days you're free, and find the right person for each role.</p>
          <p>It's free, has no adverts and doesn't track you. It isn't run by the London Film School.</p>
          ${LIVE ? `<p class="demo-link"><a class="btn btn-ghost btn-sm" href="${DEMO_URL}">Try the demo</a> <span class="muted small">Sample people, and nothing is saved.</span></p>` : ""}
          <dl class="about-boards">${boards.map(([b, d]) => `<div><dt>${esc(b)}</dt><dd>${esc(d)}</dd></div>`).join("")}</dl></section>
        <section class="panel"><h2 class="panel-h">Who runs it</h2>
          <p><span>Students run Crew Call for each other.</span> <span>The owner is ${esc(owner ? owner.name : "a student")}, with ${S.admins.length} admins and a rep for each cohort.</span> <span>Before the owner graduates, they hand it to a rep from a younger cohort, so it carries on.</span></p>
          <p>Everything is run from the Admin page, so nobody needs to know code.</p>
          <p class="foot-links"><button type="button" class="link-btn" data-privacy>Privacy notice</button><button type="button" class="link-btn" id="aboutReport">Report a problem</button></p></section>
        <section class="panel"><h2 class="panel-h">School calendar</h2>
          <p>Terms, enrolment days and when each cohort finishes follow the LFS key dates, and show on the calendar.</p>
          <ul class="about-list">${now ? `<li>${esc(now.name)} · ends ${fmtFull(now.end)}</li>` : ""}${nt ? `<li>${esc(nt.name)} · starts ${fmtFull(nt.start)}</li>` : ""}</ul>
          <p><a href="https://lfs.org.uk/key-dates/" target="_blank" rel="noopener">LFS key dates</a></p>
          <h3 class="panel-sub">Courses</h3><ul class="about-list">${C.COURSES.map(cr => `<li><b>${esc(cr.name)}</b> <span class="muted small">${cr.every === "term" ? "New cohort every term" : "One year, starts in September"}${cr.note ? ` · ${esc(cr.note)}` : ""}</span></li>`).join("")}</ul></section>
        <section class="panel"><h2 class="panel-h">Languages</h2>
          <p>Crew Call works in English, Traditional and Simplified Chinese, French, Spanish, Russian, Arabic, Hindi and Portuguese. Film words follow what crews say on set. If something reads oddly, report it and a native speaker can fix it.</p></section>
        <section class="panel span-2"><h2 class="panel-h">Built with open source</h2>
          <p>Wherever we can, Crew Call uses open source software and open data, so it stays free and nobody is locked in.</p>
          <div class="table-wrap"><table class="td-table about-os"><thead><tr><th>Project</th><th>What it does here</th><th>Licence</th></tr></thead><tbody>
          ${OPEN_SOURCE.map(([n, d, l, u]) => `<tr><td><a href="${u}" target="_blank" rel="noopener" data-noi18n>${esc(n)}</a></td><td>${esc(d)}</td><td class="mono small" data-noi18n>${esc(l)}</td></tr>`).join("")}
          </tbody></table></div>
          <h3 class="panel-sub">Not open source</h3>
          <p class="muted small">The code is kept on GitHub and the site is hosted on GitHub Pages. The database and sign-in run on Supabase's hosted service, although Supabase's own software is open source. Emails go through whichever sender the admins set up. We only use free plans, and Crew Call can move away from any of them.</p></section>
      </div>`;
    bindOpeners($("#view-about"));
    const rb = $("#aboutReport"); if (rb) rb.onclick = () => $("#footReport").click();
  }


  // ---------- CASTING: parts in LFS films, and the people who act in them ----------
  let castMode = "parts";
  const CAST_IC = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16v7a8 8 0 0 1-16 0z"/><path d="M8.5 9h.01M15.5 9h.01M9 13.5c1.7 1.4 4.3 1.4 6 0"/></svg>`;
  // one item per part; a crowd of supporting artists for the same scene shows as one card with a count
  function castItems() {
    const out = [], seen = {};
    live().filter(p => isActive(p)).forEach(p => p.roles.filter(r => !r.filledBy && isCast(r)).forEach(r => {
      const k = p.id + "|" + r.role + "|" + (r.character || "").toLowerCase();
      if (seen[k]) { seen[k].n++; return; }
      out.push(seen[k] = { id: k, p, r, n: 1 });
    }));
    return out;
  }
  const castDay = x => x.p.shoots[0].from;
  const castCfg = () => ({
    placeholder: "Search part, film, director or playing age", noun: "part", matchHint: "Parts that fit your roles",
    text: x => [x.r.character, x.r.role, x.r.age, x.p.title, x.p.type, x.p.logline, x.p.director, castOf(x.p).pay].join(" "),
    match: (x, m) => m.roles.includes(x.r.role),
    sink: x => castClosed(x.p), sinkLabel: "Casting closed",
    groups: [
      { id: "part", label: "Part", opts: [...castSet()].filter(t => castItems().some(x => x.r.role === t)), test: (x, v) => x.r.role === v },
      { id: "type", label: "Type", opts: uniqSorted(castItems().map(x => x.p.type)), test: (x, v) => x.p.type === v },
      { id: "how", label: "Apply", opts: ["On Crew Call", "Through a casting call"], test: (x, v) => v === "On Crew Call" || !!castOf(x.p).link },
      { id: "when", label: "Shoots", opts: ["This month", "Next month", "Later"], test: (x, v) => { const d = daysUntil(castDay(x)); return v === "This month" ? d <= 31 : v === "Next month" ? d > 31 && d <= 62 : d > 62; } }
    ],
    sorts: [["shoot", "Shooting soonest", (a, b) => castDay(a).localeCompare(castDay(b)), castDay], ["closes", "Closing soonest", (a, b) => (castOf(a.p).closes || "9999").localeCompare(castOf(b.p).closes || "9999")], ["new", "Newest", (a, b) => (b.p.created || "").localeCompare(a.p.created || "")]],
    table: { dim: x => castClosed(x.p), cols: [
      ["Part", x => `<button class="link-btn bt-t" data-proj="${x.p.id}">${esc(x.r.character || x.r.role)}</button><span class="bt-sub">${esc(x.r.role)}${x.n > 1 ? ` ×${x.n}` : ""}</span>`, "", x => (x.r.character || x.r.role).toLowerCase()],
      ["Playing age", x => esc(x.r.age || ""), "small", x => x.r.age || "~"],
      ["Film", x => `${esc(x.p.title)}<span class="bt-sub">${esc(x.p.type)}</span>`, "", x => x.p.title],
      ["Shoots", x => esc(x.p.shoots.map(fmtRange).join(" + ")), "mono small", castDay],
      ["Apply", x => castApply(x, true), ""]
    ] },
    timeline: { dim: x => castClosed(x.p), label: x => `<button class="link-btn bt-t" data-proj="${x.p.id}">${esc(x.r.character || x.r.role)}</button>`, sub: x => x.p.title,
      segs: x => x.p.shoots.map(r => ({ from: r.from, to: r.to, label: fmtRange(r) })) }
  });
  function castApply(x, small) {
    const m = me(), c = castOf(x.p), closed = castClosed(x.p), sz = small ? "btn-xs" : "btn-sm";
    if (closed) return `<span class="muted small">Casting closed</span>`;
    const mr = m && myReqFor(x.p, x.r.rid, "crew");
    const req = !m ? `<button class="btn btn-ghost ${sz}" data-signin>Sign in to ask</button>` : mr ? statusChip(mr) : onProject(x.p, m.id) ? `<span class="muted small">You're on this film</span>` : runs(x.p, m) ? "" : `<button class="btn ${c.link ? "btn-ghost" : "btn-accent"} ${sz}" data-castreq="${x.p.id}|${x.r.rid}">${x.r.character ? `Ask to play ${esc(x.r.character)}` : "Ask for this part"}</button>`;
    return (c.link ? `<a class="btn btn-accent ${sz}" href="${esc(c.link)}" target="_blank" rel="noopener">Apply on ${esc(castSite(c.link))}</a>` : "") + req;
  }
  function castCard(x) {
    const p = x.p, r = x.r, c = castOf(p), closed = castClosed(p), m = me();
    return `<article class="card cast-card${closed ? " is-dim" : ""}" style="--c:${projColor(p)}">
      <div class="proj-top"><span class="type-tag">${esc(r.role)}${x.n > 1 ? ` ×${x.n}` : ""}</span><span class="term-tag">${esc(p.type)}</span>${closed ? `<span class="tag-arch">Casting closed</span>` : c.closes ? `<span class="term-tag ${daysUntil(c.closes) <= 7 ? "tag-soon" : ""}">Closes ${fmtDay(c.closes)}</span>` : ""}</div>
      <h3 class="card-t"><button class="link-btn" data-proj="${p.id}">${esc(r.character || (r.role === "Supporting artist" ? "Supporting artists" : r.role))}</button></h3>
      <p class="card-sub">${r.age ? `<span class="part-age">Playing age ${esc(r.age)}</span> · ` : ""}<button class="link-btn" data-proj="${p.id}">${esc(p.title)}</button> · <span>${esc(p.director)}</span></p>
      ${m && r.brief && r.brief.text ? `<p class="logline">${esc(r.brief.text.length > 220 ? r.brief.text.slice(0, 217) + "…" : r.brief.text)}</p>` : `<p class="logline">${esc(p.logline)}</p>`}
      <p class="small muted mono">${esc(p.shoots.map(fmtRange).join(" + "))} · ${esc(locShort(p))}</p>
      ${c.pay ? `<p class="small">${esc(c.pay)}</p>` : ""}
      <div class="card-actions">${castApply(x)}</div>
    </article>`;
  }
  // people who act: anyone listing a cast role, plus anyone with a cast credit, so producers can go back to actors they've worked with
  function talentList() {
    const cs = castSet();
    return S.students.filter(listed).map(s => ({ s, parts: creditsOf(s).filter(x => !x.shadow && cs.has(x.role)), roles: s.roles.filter(r => cs.has(r)) })).filter(x => x.roles.length || x.parts.length);
  }
  function talentCard(x) {
    const s = x.s, m = me(), nf = nextFree(s);
    return `<article class="card crew-card talent-card">
      <div class="crew-top"><span class="avatar avatar-lg">${initials(s.name)}</span>
        <div><h3 class="card-t"><button class="link-btn" data-student="${s.id}">${esc(s.name)}</button>${s.guest ? ` <span class="tag-guest">Guest</span>` : ""}</h3><p class="card-sub">${esc(s.pathway)} · <span class="term-tag">${esc(tLabel(s))}</span></p>${s.based ? `<p class="based-line">${pinIco}<span>${esc(s.based)}</span></p>` : ""}</div></div>
      <div class="avail-line">${nf ? `<span class="badge badge-free">Free ${esc(nf)}</span>` : `<span class="badge badge-off">${s.openToOffers ? "Open to offers" : "No dates set"}</span>`}</div>
      <div class="chips">${x.roles.map(r => `<span class="chip chip-primary">${esc(r)}</span>`).join("")}</div>
      ${x.parts.length ? `<ul class="credit-list part-list">${x.parts.slice(0, 3).map(c => `<li><span class="cr-role">${esc(c.character || c.role)}</span><button class="link-btn" data-proj="${c.p.id}">${esc(c.p.title)}</button><span class="muted">${monYear(c.p.shoots[0].from)}</span></li>`).join("")}</ul>${x.parts.length > 3 ? `<p class="small muted">and ${x.parts.length - 3} more</p>` : ""}` : `<p class="small muted">No LFS parts yet</p>`}
      <div class="card-actions">${m && s.id === m.id ? `<span class="muted small">This is you</span>` : crewContact(s)}<button class="btn btn-ghost btn-sm" data-student="${s.id}">Profile</button></div>
    </article>`;
  }
  function renderCast(partial) {
    const root = $("#view-cast"), m = me();
    if (castMode === "talent" && !m) castMode = "parts";
    if (!partial || !root.querySelector(".cast-host")) {
      root.innerHTML = `
        <div class="view-head"><div><h1 class="page-title">Casting</h1><p class="muted">Parts in LFS films, from leads to supporting artists. Ask for a part here, apply through the film's casting call, or find actors who've worked on LFS shoots.</p></div>
          <div class="head-acts"><button class="btn btn-accent" id="castPost">Cast your film</button></div></div>
        <div class="seg-btn cast-mode" role="group" aria-label="Show"><button type="button" data-castmode="parts" aria-pressed="${castMode === "parts"}" class="${castMode === "parts" ? "on" : ""}">Parts</button><button type="button" data-castmode="talent" aria-pressed="${castMode === "talent"}" class="${castMode === "talent" ? "on" : ""}">Talent</button></div>
        <div class="cast-host"></div>`;
      $("#castPost").onclick = () => {
        if (!m) return openSignIn("Sign in to cast your film.");
        const mine = live().filter(p => isActive(p) && canManage(p));
        if (!mine.length) return openPostForm();
        openModal(`<h2 id="modalTitle" class="m-title">Cast your film</h2><p class="muted">Add Talent or Supporting artist parts to one of your shoots, with a character name and playing age. You can also add a casting call link from Backstage, Spotlight, StarNow or Mandy.</p>
          <ul class="pick-list">${mine.map(p => `<li><button type="button" class="btn btn-ghost btn-sm" data-castedit="${p.id}">${esc(p.title)}</button> <span class="muted small mono">${esc(p.shoots.map(fmtRange).join(" + "))}</span></li>`).join("")}</ul>
          <div class="form-actions"><button type="button" class="btn btn-quiet" id="castNew">Post a new shoot instead</button></div>`);
        modalBody.querySelectorAll("[data-castedit]").forEach(b => (b.onclick = () => openPostForm(project(b.dataset.castedit), "roles")));
        $("#castNew").onclick = () => openPostForm();
      };
      root.querySelectorAll("[data-castmode]").forEach(b => (b.onclick = () => { if (b.dataset.castmode === "talent" && !me()) return openSignIn("Sign in to see who acts on LFS films."); castMode = b.dataset.castmode; renderCast(); }));
    }
    const host = root.querySelector(".cast-host");
    const wire = h => { bindOpeners(h); h.querySelectorAll("[data-castreq]").forEach(b => (b.onclick = () => { const [pid, rid] = b.dataset.castreq.split("|"); openRequest(project(pid), rid, "crew"); })); };
    if (castMode === "parts") {
      if (!host.querySelector(".board-host")) host.innerHTML = `<div class="board-host" data-fkey="cast"></div>`;
      board({ key: "cast", host: host.querySelector(".board-host"), cfg: castCfg(), items: castItems(), card: castCard, partial, redraw: renderCast,
        empty: `<div class="empty"><p class="empty-t">No parts open right now</p><p class="muted">Casting a shoot? Add Talent or Supporting artist roles to it and they show up here.</p></div>`, after: wire });
      return;
    }
    if (!host.querySelector(".talent-bar")) {
      host.innerHTML = `<div class="filters talent-bar"><input type="search" id="talQ" placeholder="Search name, city, film or part"><select id="talPart" aria-label="Part"><option value="">Talent and supporting artists</option>${[...castSet()].map(r => `<option>${esc(r)}</option>`).join("")}</select><label class="toggle"><input type="checkbox" id="talCred"> <span>Has acted on an LFS film</span></label></div><p class="result-meta" id="talMeta"></p><div class="card-grid" id="talList"></div>`;
      ["#talQ", "#talPart", "#talCred"].forEach(sel => $(sel).addEventListener("input", () => renderCast(true)));
      syncPickers(host);
    }
    const q = $("#talQ").value.trim().toLowerCase(), part = $("#talPart").value, cred = $("#talCred").checked;
    const list = talentList().filter(x => !q || [x.s.name, x.s.pref, x.s.based, x.s.from, x.s.bio, ...x.roles, ...x.parts.flatMap(c => [c.character, c.p.title])].join(" ").toLowerCase().includes(q))
      .filter(x => !part || x.roles.includes(part) || x.parts.some(c => c.role === part)).filter(x => !cred || x.parts.length)
      .sort((a, b) => b.parts.length - a.parts.length || a.s.name.localeCompare(b.s.name));
    $("#talMeta").textContent = `${list.length} ${list.length === 1 ? "person" : "people"}`;
    $("#talList").innerHTML = list.length ? list.map(talentCard).join("") : `<div class="empty"><p class="empty-t">No one matches yet.</p><p class="muted">Actors appear here once they add Talent or Supporting artist to their profile, or once they've been cast on an LFS shoot.</p></div>`;
    wire($("#talList"));
  }

  function render() {
    if (view === "about") renderAbout();
    if (view === "calendar") renderCalendar();
    if (view === "projects") renderProjects();
    if (view === "cast") renderCast();
    if (!me()) return;
    if (view === "crew") renderCrew();
    if (view === "mine") renderMine();
    if (view === "me") loadMe();
    if (view === "admin") renderAdmin();
    if (view === "scripts") renderScripts();
    if (view === "post") renderPost();
    if (view === "release") renderRelease();
    if (view === "paid") renderPaid();
    if (view === "fund") renderFund();
  }
  applyTerms(false); refreshCohortFilter(); syncReps();
  drawHeader();
  render();
  // links from emails and newsletters: #p/<id> opens a project, #me/days and #me/notifications jump to that part of the profile
  function openHash() {
    const h = decodeURIComponent(location.hash.slice(1)); if (!h) return;
    const [a, b] = h.split("/");
    const views = { calendar: "calendar", develop: "scripts", scripts: "scripts", shoot: "projects", projects: "projects", post: "post", release: "release", funding: "fund", fund: "fund", casting: "cast", cast: "cast", paid: "paid", crew: "crew", mine: "mine", me: "me", admin: "admin" };
    if ((a === "msg" || a === "messages") && me()) { if (b) openThread(b); else openMessages(); history.replaceState(null, "", location.pathname + location.search); return; }
    if (a === "p" && b) { const p = project(b); if (p) { setView("calendar"); openProject(p.id); } else toast("That project isn't on Crew Call any more"); }
    else if (views[a]) { setView(views[a]); if (a === "me" && b) { showMeTab(b === "notifications" ? "settings" : b); setTimeout(() => { const el = $(b === "days" ? "#daysFs" : b === "notifications" ? "#notifyFs" : ""); if (el) el.scrollIntoView({ block: "start" }); }, 60); } }
    else return;
    history.replaceState(null, "", location.pathname + location.search);
  }
  openHash();
  window.addEventListener("hashchange", openHash);
  // for cloud.js: the live data, and a way to redraw after other people's changes arrive
  window.CC_APP = { S, toast, can, cloudSignIn, refresh: () => { applyTerms(false); refreshCohortFilter(); syncReps(); drawHeader(); if (!$("#modal").hidden) return; render(); } };
})();
