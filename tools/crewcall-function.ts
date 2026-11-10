// Crew Call email and calendar server (Supabase Edge Function "crewcall").
// Built by tools/build_function.py into supabase/functions/crewcall/index.ts. Edit this file, then rebuild.
//
// What it does
//   GET  .../functions/v1/crewcall/cal/<token>/my-shoots.ics   a person's calendar feed (shoots they're on or run)
//   GET  .../functions/v1/crewcall/cal/<token>/all-shoots.ics  every upcoming shoot
//   POST .../functions/v1/crewcall?job=mail     notification emails, newsletters, test sends   (every 10 minutes)
//   POST .../functions/v1/crewcall?job=digest   weekly digests that are due this hour           (every hour)
//   POST .../functions/v1/crewcall?job=nightly  term move-up, old-profile warnings and clean-up  (every night)
// Jobs need the header x-cron-secret, set in supabase/jobs.sql. Emails go through Brevo's HTTP API.
//
// Secrets (Edge Functions, Secrets): BREVO_API_KEY, CRON_SECRET, and optionally SITE_URL, SENDER_EMAIL, SENDER_NAME, DAILY_CAP.
// SUPABASE_URL and the secret key (SUPABASE_SECRET_KEYS, or the older SUPABASE_SERVICE_ROLE_KEY) are provided by Supabase automatically.

import { createClient } from "npm:@supabase/supabase-js@2";

// ---------- email designs and default lists, copied in from the app by the build script ----------
/*@@DIGEST@@*/
/*@@NEWSLETTER@@*/
const DEFAULT_CONST: any = /*@@CONST@@*/;

const env = (k: string, d = "") => Deno.env.get(k) || d;
const SITE = env("SITE_URL", "https://lfscrewcall.github.io/crewcall/").replace(/\/?$/, "/");
const CAP = +env("DAILY_CAP", "280"); // Brevo's free plan allows 300 emails a day
// prefer the new secret key; fall back to the older service role key
function secretKey() {
  try { const k = JSON.parse(env("SUPABASE_SECRET_KEYS", "{}")); const v = k.default || Object.values(k)[0]; if (v) return String(v); } catch (_) { /* not set */ }
  return env("SUPABASE_SERVICE_ROLE_KEY");
}
const db = createClient(env("SUPABASE_URL"), secretKey(), { auth: { persistSession: false } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------- dates (all in London time) ----------
const D = (s: string) => new Date(s + "T00:00:00Z");
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => { const d = D(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const daysIn = (from: string, to: string) => { const out: string[] = []; let c = from, g = 0; while (c <= to && g++ < 400) { out.push(c); c = addDays(c, 1); } return out; };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const fmtDay = (s: string) => { const d = D(s); return `${WD[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`; };
const fmtFull = (s: string) => { const d = D(s); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const fmtRange = (r: any) => {
  const a = D(r.from), b = D(r.to);
  if (r.from === r.to) return fmtDay(r.from);
  if (a.getUTCMonth() === b.getUTCMonth()) return `${a.getUTCDate()}–${b.getUTCDate()} ${MON[b.getUTCMonth()]}`;
  return `${a.getUTCDate()} ${MON[a.getUTCMonth()]} – ${b.getUTCDate()} ${MON[b.getUTCMonth()]}`;
};
// TEST_NOW is only for testing the jobs at a pretend time; leave it unset
function london(now = env("TEST_NOW") ? new Date(env("TEST_NOW")) : new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short" }).formatToParts(now).map(x => [x.type, x.value]));
  const date = `${p.year}-${p.month}-${p.day}`;
  return { date, hour: +p.hour, stamp: `${date}T${p.hour}:${p.minute}`, dow: D(date).getUTCDay() };
}
const esc = (s: any) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const first = (n: string) => (n || "").split(" ")[0];
const uid = (p: string) => p + Math.random().toString(36).slice(2, 9);

// ---------- loading everything ----------
async function fetchAll(from: string, cols: string, filter?: (q: any) => any) {
  const all: any[] = [];
  for (let i = 0; ; i += 1000) {
    let q = db.from(from).select(cols).range(i, i + 999);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw error;
    all.push(...data);
    if (data.length < 1000) return all;
  }
}
const COLL: Record<string, string> = { student: "students", project: "projects", request: "requests", notification: "notifications", newsletter: "newsletters" };
async function load(kinds = ["student", "project", "request", "notification", "newsletter", "config"]) {
  const recs = await fetchAll("records", "kind,id,data,created_at", q => q.in("kind", kinds));
  const mails = kinds.includes("student") ? await fetchAll("emails", "id,email") : [];
  const em: Record<string, string> = Object.fromEntries(mails.map((m: any) => [m.id, m.email]));
  const S: any = { students: [], projects: [], requests: [], notifications: [], newsletters: [], admins: [], owner: null, adminPerms: {}, settings: { senderName: "Crew Call", retainMonths: 12 }, nlAuto: { on: false }, em };
  const C: any = JSON.parse(JSON.stringify(DEFAULT_CONST));
  for (const r of recs) {
    if (r.kind === "config") { if (r.id in C) C[r.id] = r.data.v ?? C[r.id]; else if (r.data && r.data.v != null) S[r.id] = r.data.v; continue; }
    const coll = COLL[r.kind]; if (!coll) continue;
    const it = { ...r.data, id: r.id, _created: r.created_at };
    if (r.kind === "student") { it.email = em[r.id] || ""; it.roles = it.roles || []; it.learn = it.learn || []; it.days = it.days || []; }
    if (r.kind === "project") { it.roles = it.roles || []; it.shoots = it.shoots || []; it.locations = it.locations || []; it.shadows = it.shadows || []; }
    S[coll].push(it);
  }
  S.settings = { senderName: "Crew Call", retainMonths: 12, ...S.settings };
  return { S, C };
}
const clean = (it: any) => { const d = { ...it }; delete d._created; delete d.email; return d; };
async function saveRec(kind: string, it: any) {
  const data = kind === "student" ? clean(it) : (() => { const d = { ...it }; delete d._created; return d; })();
  const { error } = await db.from("records").update({ data }).match({ kind, id: it.id });
  if (error) throw error;
}
async function addNotification(S: any, to: string, kind: string, text: string, pid?: string) {
  const st = S.students.find((s: any) => s.id === to); if (!st) return;
  const n = notifyOf(st);
  const emailed = kind === "request" ? n.apply : kind === "match" ? n.match : kind === "update" || kind === "term" ? n.updates : kind === "news" ? n.news : true;
  const id = uid("n"), data = { id, to, kind, text, pid: pid || null, at: london().date, read: false, emailed };
  await db.from("records").insert({ kind: "notification", id, data, owner: null });
  S.notifications.push({ ...data, _created: new Date().toISOString() });
}

// ---------- the app's rules, kept in step with app.js ----------
const notifyOf = (m: any) => Object.assign({ apply: true, digest: false, when: "mon", scope: "match", match: true, updates: true, news: true }, (m && m.notify) || {});
const sameMail = (a: string, b: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
const prodsOf = (p: any) => (Array.isArray(p.producers) ? p.producers : p.producer && p.producer.name ? [p.producer] : []).filter((x: any) => x && x.name);
const isDirectorOf = (p: any, m: any) => !!m && ((p.dsid && p.dsid === m.id) || sameMail(p.email, m.email) || p.roles.some((r: any) => r.role === "Director" && r.filledBy === m.id));
const isProducerOf = (p: any, m: any) => !!m && (prodsOf(p).some((x: any) => (x.sid && x.sid === m.id) || sameMail(x.email, m.email)) || p.roles.some((r: any) => r.role === "Producer" && r.filledBy === m.id));
const runs = (p: any, m: any) => isDirectorOf(p, m) || isProducerOf(p, m);
const projDays = (p: any) => p.shoots.flatMap((r: any) => daysIn(r.from, r.to));
const dayInfo = (p: any, d: string) => Object.assign({ call: "08:00", wrap: "18:00", loc: 0 }, (p.days || {})[d] || {});
const locs = (p: any) => p.locations || [];
const locName = (p: any, i: number) => (locs(p)[i] ? locs(p)[i].name : "Location TBC");
const locShort = (p: any) => { const l = locs(p); return l.length ? l[0].name + (l.length > 1 ? ` + ${l.length - 1} more` : "") : "Location TBC"; };
const PALETTE = ["#e0a100", "#c2410c", "#0054f1", "#6d28d9", "#0f766e", "#be185d", "#4d7c0f", "#57534e"];
const projColor = (p: any) => PALETTE[(parseInt(String(p.id).replace(/\D/g, ""), 10) || String(p.id).length) % PALETTE.length];
const openRoles = (p: any) => p.roles.filter((r: any) => !r.filledBy);
const isExt = (r: any) => typeof r.filledBy === "string" && r.filledBy.startsWith("ext:");
const onProject = (p: any, sid: string) => p.roles.some((r: any) => r.filledBy === sid) || p.shadows.some((x: any) => x.sid === sid);
const inRanges = (ranges: any[], d: string) => (ranges || []).some(r => r.from <= d && d <= r.to);
const liveP = (S: any) => S.projects.filter((p: any) => !p.archived);
const contactOf = (S: any, p: any) => {
  const pr = prodsOf(p)[0];
  if (pr) { const st = (pr.sid && S.students.find((s: any) => s.id === pr.sid)); return { name: st ? st.name : pr.name, role: "Producer" }; }
  const st = p.dsid && S.students.find((s: any) => s.id === p.dsid);
  return { name: st ? st.name : p.director, role: "Director" };
};

// terms, cohorts and move-up (same maths as app.js)
function terms(C: any, TODAY: string) {
  const TD = () => [...C.TERM_DATES].sort((a: any, b: any) => a.start.localeCompare(b.start));
  const periodById = (id: string) => C.TERM_DATES.find((t: any) => t.id === id);
  const startedTerm = (d = TODAY) => TD().filter((t: any) => t.start <= d).pop() || null;
  const termNow = (d = TODAY) => TD().find((t: any) => t.start <= d && d <= t.end) || null;
  const nextTerm = (d = TODAY) => TD().find((t: any) => t.start > d) || null;
  const lockDate = (t: any) => addDays(t.start, C.LOCK_WEEKS * 7 - 1);
  const periodNo = (t: any) => {
    if (!t) return null as any;
    const x = /^(\d{4})-(aut|spr|sum)$/.exec(t.id || "");
    if (x) return x[2] === "aut" ? +x[1] * 3 : (+x[1] - 1) * 3 + (x[2] === "spr" ? 1 : 2);
    const d = D(t.start), y = d.getUTCFullYear(), mo = d.getUTCMonth();
    return mo >= 8 ? y * 3 : mo <= 2 ? (y - 1) * 3 + 1 : (y - 1) * 3 + 2;
  };
  const courseById = (id: string) => C.COURSES.find((c: any) => c.id === id);
  const curPeriod = () => periodNo(startedTerm() || nextTerm());
  const courseTermNo = (cr: any, intake: number, at = curPeriod()) => cr.every === "term"
    ? cr.anchor.term + (at - periodNo(periodById(cr.anchor.periodId) || { id: cr.anchor.periodId })) - (intake - cr.anchor.code)
    : at - intake * 3 + 1;
  const periodName = (p: number) => { const y = Math.floor(p / 3), r = p % 3; return r === 0 ? `Autumn ${y}` : r === 1 ? `Spring ${y + 1}` : `Summer ${y + 1}`; };
  const periodByNo = (p: number) => C.TERM_DATES.find((t: any) => periodNo(t) === p) || null;
  const cohortStartP = (cr: any, intake: number) => cr.every === "term"
    ? 1 - cr.anchor.term + periodNo(periodById(cr.anchor.periodId) || { id: cr.anchor.periodId }) + (intake - cr.anchor.code)
    : intake * 3;
  const cohortEnd = (cr: any, intake: number) => {
    const set = (cr.endByIntake || {})[String(intake)];
    if (set) return { date: set, exact: true };
    const last = cohortStartP(cr, intake) + cr.terms - 1;
    if (cr.ends === "sept") { const aut = periodByNo(last + 1); return { date: aut ? addDays(aut.start, 11) : null, exact: false }; }
    const t = periodByNo(last); return { date: t ? t.end : null, exact: false, approx: periodName(last) };
  };
  const termName = (cr: any, n: number, intake: number, on = TODAY) => {
    if (n > cr.terms && intake != null) { const e = cohortEnd(cr, intake); if (e.date && on <= e.date) n = cr.terms; }
    return cr.every === "term"
      ? (n < 1 ? "Term 1" : n < cr.terms ? `Term ${n}` : n === cr.terms ? "Graduation term" : "Alumni")
      : (n <= cr.terms ? cr.label : "Alumni");
  };
  const cohortCode = (cr: any, intake: number) => cr.every === "term" ? `${cr.prefix}${intake}`
    : cr.prefix ? `${cr.prefix}${String(intake).slice(2)}` : `${cr.label} ${intake}–${String(intake + 1).slice(2)}`;
  const termFromCohort = (s: any) => { const cr = courseById(s.course); return cr && s.intake != null ? termName(cr, courseTermNo(cr, s.intake), s.intake) : s.term; };
  return { startedTerm, termNow, nextTerm, lockDate, courseById, cohortCode, termFromCohort };
}

// ---------- sending ----------
let sentToday = -1;
async function countToday() {
  if (sentToday >= 0) return sentToday;
  const start = new Date(); start.setUTCHours(0, 0, 0, 0);
  const { count } = await db.from("email_log").select("key", { count: "exact", head: true }).gte("at", start.toISOString()).not("key", "like", "x:%");
  sentToday = count || 0; return sentToday;
}
const logged = async (keys: string[]) => {
  const have = new Set<string>();
  for (let i = 0; i < keys.length; i += 200) {
    const { data } = await db.from("email_log").select("key").in("key", keys.slice(i, i + 200));
    (data || []).forEach((r: any) => have.add(r.key));
  }
  return have;
};
const mark = (key: string) => db.from("email_log").upsert({ key }, { onConflict: "key", ignoreDuplicates: true });
class CapReached extends Error {}
async function send(S: any, to: { email: string; name?: string }, subject: string, html: string, key: string) {
  if ((await countToday()) >= CAP) throw new CapReached("Daily email limit reached");
  const body: any = {
    sender: { email: env("SENDER_EMAIL", S.settings.senderEmail || "lfscrewcall@gmail.com"), name: env("SENDER_NAME", S.settings.senderName || "Crew Call") },
    to: [{ email: to.email, ...(to.name ? { name: to.name } : {}) }], subject, htmlContent: html
  };
  if (S.settings.replyTo) body.replyTo = { email: S.settings.replyTo };
  const r = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": env("BREVO_API_KEY"), "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`Brevo ${r.status}: ${(await r.text()).slice(0, 300)}`);
  await mark(key); sentToday++;
}

// a plain, branded email for notifications and reminders
function simpleEmail(o: { title: string; first?: string; items: { text: string; url?: string }[]; button?: { label: string; url: string }; foot?: string }) {
  const F = "font-family:Helvetica,Arial,sans-serif;";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(o.title)}</title></head>
<body style="margin:0;background:#f4f3eb;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3eb;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #dbdad7;">
<tr><td style="background:#000;padding:16px 24px;${F}font-size:18px;font-weight:bold;color:#fff;">Crew Call <span style="color:#ff0000;">●</span></td></tr>
<tr><td style="padding:24px;${F}font-size:15px;line-height:22px;color:#000;">
${o.first ? `<p style="margin:0 0 12px;">Hi ${esc(o.first)},</p>` : ""}
${o.items.map(i => `<p style="margin:0 0 14px;padding:0 0 14px;border-bottom:1px solid #ebe9e1;">${esc(i.text)}${i.url ? `<br><a href="${esc(i.url)}" style="color:#c00000;font-size:14px;">Open in Crew Call</a>` : ""}</p>`).join("")}
${o.button ? `<p style="margin:18px 0 0;"><a href="${esc(o.button.url)}" style="display:inline-block;background:#ff0000;color:#000;text-decoration:none;font-weight:bold;padding:10px 18px;">${esc(o.button.label)}</a></p>` : ""}
</td></tr>
<tr><td style="padding:16px 24px;${F}font-size:12px;line-height:18px;color:#57534e;border-top:1px solid #dbdad7;">${o.foot || `You get these because of your email settings in Crew Call. <a href="${SITE}#me/notifications" style="color:#57534e;">Change what you get</a>.`}<br>Crew Call is run by LFS students. It is not an official LFS service.</td></tr>
</table></td></tr></table></body></html>`;
}

// ---------- job: notification emails, newsletters, tests ----------
function nlRecipients(S: any, a: string) {
  const ms = S.students.filter((s: any) => !s.incomplete && !s.hidden && notifyOf(s).news !== false);
  if (a === "all") return ms;
  if (a === "lfs") return ms.filter((s: any) => !s.guest);
  if (a === "alumni") return ms.filter((s: any) => s.term === "Alumni");
  if (a === "alias") return [];
  const [k, v] = (a || "").split(":");
  if (k === "course") return ms.filter((s: any) => s.course === v || (!s.course && v === "MAF" && !s.guest && /^Term|^Graduation/.test(s.term || "")));
  if (k === "term") return ms.filter((s: any) => s.term === v);
  if (k === "cohort") return ms.filter((s: any) => s.cohort === v);
  return ms;
}
async function jobMail(S: any) {
  const out = { notifications: 0, newsletters: 0, tests: 0 };
  const now = london();
  // 1. notifications: one email per person with everything new since the last run
  const since = Date.now() - 2 * 864e5;
  const fresh = S.notifications.filter((n: any) => n.emailed && n.kind !== "news" && new Date(n._created).getTime() > since && Date.now() - new Date(n._created).getTime() > 60e3);
  // each notification is marked "x:n:<id>" once handled; the email itself is logged as "n:<first id>"
  const done = await logged(fresh.flatMap((n: any) => ["n:" + n.id, "x:n:" + n.id]));
  const byTo: Record<string, any[]> = {};
  for (const n of fresh) if (!done.has("n:" + n.id) && !done.has("x:n:" + n.id)) (byTo[n.to] = byTo[n.to] || []).push(n);
  for (const [to, list] of Object.entries(byTo)) {
    const st = S.students.find((s: any) => s.id === to), email = S.em[to];
    const unread = list.filter(n => !n.read);
    if (!st || !email || !unread.length) { for (const n of list) await mark("x:n:" + n.id); continue; }
    const subject = unread.length === 1 ? `Crew Call: ${unread[0].text.length > 70 ? unread[0].text.slice(0, 67) + "…" : unread[0].text}` : `Crew Call: ${unread.length} updates for you`;
    const html = simpleEmail({ title: subject, first: first(st.name), items: unread.map(n => ({ text: n.text, url: n.kind === "message" && n.from ? `${SITE}#msg/${n.from}` : n.pid ? `${SITE}#p/${n.pid}` : undefined })), button: { label: "Open Crew Call", url: SITE } });
    await send(S, { email, name: st.name }, subject, html, "n:" + unread[0].id);
    for (const n of list) await mark("x:n:" + n.id);
    out.notifications++;
  }
  // 2. newsletters sent from Admin, or scheduled and now due
  for (const nl of S.newsletters) {
    const m = nl.mail;
    if (!m || m.state !== "queued" || !m.html) continue;
    if (m.after && m.after > now.stamp) continue;
    const people = nlRecipients(S, nl.audience).filter((s: any) => S.em[s.id]);
    const targets = nl.audience === "alias" ? (S.settings.schoolAlias ? [{ id: "alias", email: S.settings.schoolAlias, name: "" }] : []) : people.map((s: any) => ({ id: s.id, email: S.em[s.id], name: s.name }));
    const have = await logged(targets.map((t: any) => `nl:${nl.id}:${t.id}`));
    for (const t of targets) { if (have.has(`nl:${nl.id}:${t.id}`)) continue; await send(S, { email: t.email, name: t.name }, nl.subject, m.html, `nl:${nl.id}:${t.id}`); }
    nl.mail = { ...m, state: "sent", html: undefined, sentAt: new Date().toISOString(), count: targets.length };
    if (nl.status === "scheduled") {
      Object.assign(nl, { status: "sent", sentBy: nl.approvedBy, sentAt: now.date, recipients: nl.audience === "alias" ? null : targets.length });
      for (const s of people) await addNotification(S, s.id, "news", `New newsletter from the Crew Call admins: “${nl.subject}”.`);
    }
    await saveRec("newsletter", nl); out.newsletters++;
  }
  // 3. "Send me a test" from a newsletter or the automatic newsletter
  const tests: [string, any, any][] = S.newsletters.filter((n: any) => n.test).map((n: any) => ["newsletter", n, n.test]);
  if (S.nlAuto && S.nlAuto.test) tests.push(["nlAuto", S.nlAuto, S.nlAuto.test]);
  for (const [kind, holder, t] of tests) {
    const email = S.em[t.to], key = `t:${kind}:${holder.id || "auto"}:${t.at}`;
    if (email && !(await logged([key])).has(key)) await send(S, { email }, `[Test] ${t.subject}`, t.html, key);
    delete holder.test;
    if (kind === "newsletter") await saveRec("newsletter", holder);
    else await db.from("records").update({ data: { v: holder } }).match({ kind: "config", id: "nlAuto" });
    out.tests++;
  }
  // 4. the automatic newsletter can't build itself here, so its senders get a reminder on the day
  const A = S.nlAuto;
  if (A && A.on && now.dow === 1 && now.hour >= 9) {
    const due = A.freq === "fortnightly" ? now.date >= addDays(A.lastSent || "2000-01-01", 14) : +now.date.slice(8) <= 7 && (!A.lastSent || A.lastSent.slice(0, 7) !== now.date.slice(0, 7));
    const key = "x:auto:" + now.date;
    if (due && !(await logged([key])).has(key)) {
      const senders = [S.owner, ...(S.admins || [])].filter((id, i, a) => id && a.indexOf(id) === i && (id === S.owner || ((S.adminPerms || {})[id] || []).includes("send")));
      for (const id of senders) await addNotification(S, id, "update", "This issue of the automatic newsletter is ready. Open Admin, Newsletter to check it and press Send now.");
      await mark(key);
    }
  }
  return out;
}

// ---------- job: weekly digest ----------
const WHEN: Record<string, [number, number, string, string]> = { mon: [1, 8, "Monday", "8am"], sun: [0, 18, "Sunday", "6pm"], fri: [5, 16, "Friday", "4pm"] };
function buildDigest(S: any, C: any, m: any, TODAY: string) {
  const T = terms(C, TODAY), n = notifyOf(m), roles: string[] = m.roles || [];
  const isActive = (p: any) => !p.wrapped && p.shoots.some((r: any) => r.to >= TODAY);
  const bookedOn = (sid: string, d: string) => liveP(S).filter((p: any) => onProject(p, sid) && inRanges(p.shoots, d));
  const isFree = (s: any, d: string) => (s.days || []).includes(d) && bookedOn(s.id, d).length === 0;
  const horizon = addDays(TODAY, 42);
  const upcoming = liveP(S).filter((p: any) => isActive(p) && p.shoots.some((r: any) => r.from <= horizon) && openRoles(p).length && !runs(p, m));
  const items: any[] = [];
  upcoming.forEach((p: any) => {
    const days = projDays(p).filter((d: string) => d >= TODAY), free = days.filter((d: string) => isFree(m, d)).length;
    const mine = [...new Set(openRoles(p).map((r: any) => r.role))].filter((r: any) => n.scope === "all" || roles.includes(r));
    if (!mine.length || (n.scope === "match" && !free)) return;
    items.push({ p, roles: mine, free, total: days.length, match: mine.some((r: any) => roles.includes(r)) });
  });
  items.sort((a, b) => b.match - a.match || b.free / b.total - a.free / a.total || a.p.shoots[0].from.localeCompare(b.p.shoots[0].from));
  const allOpen = upcoming.reduce((t: number, p: any) => t + openRoles(p).length, 0);
  const run = liveP(S).filter((p: any) => isActive(p) && runs(p, m));
  const [, , wd, time] = WHEN[n.when] || WHEN.mon;
  const subject = items.length ? `${items.length} shoot${items.length === 1 ? "" : "s"} looking for crew like you this week` : "Crew Call: your week";
  const tn = T.termNow(), wk = tn ? Math.floor((D(TODAY).getTime() - D(tn.start).getTime()) / 6048e5) + 1 : 0;
  const lockedLearn = liveP(S).filter((p: any) => isActive(p) && !runs(p, m) && !onProject(p, m.id)).flatMap((p: any) => p.roles.filter((r: any) => r.filledBy && !isExt(r) && (m.learn || []).includes(r.role)).map((r: any) => ({ title: p.title, role: r.role, dates: p.shoots.map(fmtRange).join(" + "), url: SITE + "#p/" + p.id }))).slice(0, 3);
  const upd = m.updated ? Math.round((D(TODAY).getTime() - D(m.updated).getTime()) / 864e5) : null;
  const nt = T.nextTerm();
  const data = {
    subject, first: first(m.name), weekLabel: fmtDay(TODAY),
    termLabel: tn ? `${tn.name}, week ${wk}` : (nt ? `Holiday. ${nt.name} starts ${fmtDay(nt.start)}` : "This week"),
    topRole: roles.length === 1 ? roles[0] : "",
    stats: { open: allOpen, thisWeek: liveP(S).filter((p: any) => isActive(p) && projDays(p).some((d: string) => d >= TODAY && d <= addDays(TODAY, 6))).length, newCount: liveP(S).filter((p: any) => p.created && p.created >= addDays(TODAY, -7)).length },
    matches: items.map(it => { const d0 = projDays(it.p).find((d: string) => d >= TODAY); return { title: it.p.title, type: it.p.type === it.p.term ? it.p.type : it.p.type + " · " + it.p.term, dates: it.p.shoots.map(fmtRange).join(" + "), call: dayInfo(it.p, d0).call, loc: locShort(it.p), roles: it.roles.map((r: string) => ({ name: r, mine: roles.includes(r) })), free: it.free, total: it.total, color: projColor(it.p), url: SITE + "#p/" + it.p.id }; }),
    own: run.map((p: any) => ({ title: p.title, waiting: S.requests.filter((q: any) => q.pid === p.id && q.status === "pending").length, open: openRoles(p).length, url: SITE + "#p/" + p.id })),
    learn: lockedLearn,
    updatedAgo: upd == null ? "" : upd <= 0 ? "today" : upd === 1 ? "yesterday" : `${upd} days ago`,
    sendLabel: `${wd}s at ${time}`,
    links: { app: SITE, days: SITE + "#me/days", settings: SITE + "#me/notifications", unsubscribe: SITE + "#me/notifications" }
  };
  return { subject, html: (globalThis as any).CrewCallDigest(data) };
}
async function jobDigest(S: any, C: any) {
  const now = london(); let sent = 0;
  const due = S.students.filter((s: any) => { const n = notifyOf(s); const w = WHEN[n.when] || WHEN.mon; return n.digest && !s.incomplete && S.em[s.id] && now.dow === w[0] && now.hour >= w[1]; });
  const have = await logged(due.map((s: any) => `d:${s.id}:${now.date}`));
  for (const s of due) {
    const key = `d:${s.id}:${now.date}`; if (have.has(key)) continue;
    const { subject, html } = buildDigest(S, C, s, now.date);
    await send(S, { email: S.em[s.id], name: s.name }, subject, html, key); sent++;
  }
  return { digests: sent };
}

// ---------- job: nightly term move-up and old-profile clean-up ----------
async function jobNightly(S: any, C: any) {
  const now = london(), TODAY = now.date, T = terms(C, TODAY), cur = T.startedTerm();
  let moved = 0, warned = 0, deleted = 0;
  for (const s of S.students) {
    if (s.guest || !s.course || s.intake == null) continue;
    const cr = T.courseById(s.course); if (!cr) continue;
    const old = s.term, code = T.cohortCode(cr, s.intake), t = T.termFromCohort({ ...s, cohort: code });
    if (t === old && code === s.cohort) continue;
    s.cohort = code; s.term = t; s.termFor = cur && cur.id; moved++;
    if (old && t !== old) {
      s.termConfirmed = t === "Alumni";
      await addNotification(S, s.id, "term", t === "Alumni"
        ? `${cur ? cur.name : "A new term"} has started and your course is over, so your profile now says Alumni (${s.cohort}). You stay in Crew Call and can still crew on shoots.`
        : `${cur ? cur.name : "A new term"} has started, so your profile has moved from ${old} to ${t} (${s.cohort}). If you're repeating or intermitting, change your cohort until ${fmtFull(T.lockDate(cur))}.`);
    }
    await saveRec("student", s);
  }
  // old profiles: alumni and guests who haven't been back for retainMonths
  const mo = +S.settings.retainMonths || 12, auto = S.settings.autoClean !== false;
  const monthsAgo = (n: number) => { const d = D(TODAY); d.setUTCMonth(d.getUTCMonth() - n); return iso(d); };
  const lastSeen = (s: any) => [s.seen, s.updated].filter(Boolean).sort().pop() || "2000-01-01";
  const cut = monthsAgo(mo), warnBy = addDays(cut, 30);
  const keep = new Set([S.owner, ...(S.admins || [])]);
  for (const s of S.students) {
    if (!(s.guest || s.term === "Alumni") || keep.has(s.id) || !UUID.test(s.id)) continue;
    const last = lastSeen(s); if (last >= warnBy) continue;
    const wkey = `w:${s.id}:${last}`, email = S.em[s.id];
    const { data: w } = await db.from("email_log").select("at").eq("key", wkey).maybeSingle();
    if (!w && email) {
      const on = (() => { const d = D(last); d.setUTCMonth(d.getUTCMonth() + mo); return iso(d); })();
      await send(S, { email, name: s.name }, "Your Crew Call profile is due to be deleted", simpleEmail({ title: "Your Crew Call profile", first: first(s.name), items: [{ text: `You haven't been on Crew Call for a while, so your profile will be deleted on ${fmtFull(on > TODAY ? on : addDays(TODAY, 30))}. To keep it, open Crew Call and sign in before then.` }], button: { label: "Keep my profile", url: SITE } }), wkey);
      warned++; continue;
    }
    const warnedLongAgo = !email || (w && Date.now() - new Date(w.at).getTime() > 28 * 864e5);
    if (auto && last < cut && warnedLongAgo) {
      await db.from("records").delete().eq("kind", "notification").filter("data->>to", "eq", s.id);
      await db.from("records").delete().eq("kind", "request").filter("data->>sid", "eq", s.id).filter("data->>status", "eq", "pending");
      await db.from("records").delete().match({ kind: "student", id: s.id });
      await db.auth.admin.deleteUser(s.id);
      await mark(`x:del:${s.id}`); deleted++;
    }
  }
  if (deleted) {
    const { data } = await db.from("records").select("data").match({ kind: "config", id: "adminLog" }).maybeSingle();
    const logArr = (data && data.data && data.data.v) || [];
    logArr.unshift({ at: TODAY, by: "server", text: `Deleted ${deleted} old profile${deleted === 1 ? "" : "s"} (alumni and guests not seen for ${mo} months)` });
    await db.from("records").upsert({ kind: "config", id: "adminLog", data: { v: logArr }, owner: null });
  }
  return { moved, warned, deleted };
}

// ---------- calendar feeds ----------
const icsEsc = (s: any) => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const fold = (line: string) => { const out: string[] = []; let s = line; while (new TextEncoder().encode(s).length > 74) { let i = 74; while (new TextEncoder().encode(s.slice(0, i)).length > 74) i--; out.push(s.slice(0, i)); s = " " + s.slice(i); } out.push(s); return out.join("\r\n"); };
function buildIcs(S: any, projects: any[], name: string) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Crew Call//LFS//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${icsEsc(name)}`, "X-WR-TIMEZONE:Europe/London", "REFRESH-INTERVAL;VALUE=DURATION:PT4H", "X-PUBLISHED-TTL:PT4H",
    "BEGIN:VTIMEZONE", "TZID:Europe/London", "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0000", "TZOFFSETTO:+0100", "TZNAME:BST", "DTSTART:19700329T010000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT", "BEGIN:STANDARD", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0000", "TZNAME:GMT", "DTSTART:19701025T020000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD", "END:VTIMEZONE"];
  projects.forEach(p => { const ds = projDays(p); ds.forEach((d: string, i: number) => {
    const inf = dayInfo(p, d), endDay = inf.wrap <= inf.call ? addDays(d, 1) : d, c = contactOf(S, p);
    const t = (day: string, hm: string) => day.replace(/-/g, "") + "T" + hm.replace(":", "") + "00";
    L.push("BEGIN:VEVENT", `UID:${p.id}-${d}@crewcall.lfs`, `DTSTAMP:${stamp}`, `DTSTART;TZID=Europe/London:${t(d, inf.call)}`, `DTEND;TZID=Europe/London:${t(endDay, inf.wrap)}`,
      `SUMMARY:${icsEsc(`${p.title} · Day ${i + 1}/${ds.length}`)}`, `LOCATION:${icsEsc(locName(p, inf.loc))}`, `URL:${SITE}#p/${p.id}`,
      `DESCRIPTION:${icsEsc(`${p.type}, ${p.term}. Call ${inf.call}, wrap ${inf.wrap}.\nContact: ${c.name} (${c.role}).\nOpen roles: ${openRoles(p).map((r: any) => r.role).join(", ") || "none"}.\n${SITE}#p/${p.id}`)}`, "END:VEVENT");
  }); });
  L.push("END:VCALENDAR"); return L.map(fold).join("\r\n") + "\r\n";
}
async function calendar(token: string, which: string) {
  const { data: tok } = await db.from("cal_tokens").select("uid").eq("token", token).maybeSingle();
  if (!tok) return new Response("This calendar link has been replaced or removed. Get a new one from Crew Call, Sync calendar.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  const { S } = await load(["student", "project"]);
  const meS = S.students.find((s: any) => s.id === tok.uid) || { id: tok.uid, email: S.em[tok.uid] || "" };
  const TODAY = london().date;
  const upcoming = liveP(S).filter((p: any) => !p.wrapped && !p.shoots.every((r: any) => r.to < TODAY));
  const list = which === "my" ? upcoming.filter((p: any) => onProject(p, meS.id) || runs(p, meS)) : upcoming;
  return new Response(buildIcs(S, list, which === "my" ? "Crew Call: my shoots" : "Crew Call: all shoots"), { headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "max-age=900" } });
}

// ---------- entry point ----------
Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const cal = /\/cal\/([A-Za-z0-9]{16,64})\/(my|all)-shoots\.ics$/.exec(url.pathname);
  try {
    if (req.method === "GET" && cal) return await calendar(cal[1], cal[2]);
    if (req.method !== "POST") return new Response("Crew Call server is running.", { headers: { "content-type": "text/plain" } });
    if (!env("CRON_SECRET") || req.headers.get("x-cron-secret") !== env("CRON_SECRET")) return new Response("Not allowed", { status: 401 });
    sentToday = -1;
    const job = url.searchParams.get("job") || "mail";
    const { S, C } = await load();
    const result: any = { job };
    try {
      if (job === "mail" || job === "all") Object.assign(result, await jobMail(S));
      if (job === "digest" || job === "all") Object.assign(result, await jobDigest(S, C));
      if (job === "nightly" || job === "all") Object.assign(result, await jobNightly(S, C));
    } catch (e) {
      if (!(e instanceof CapReached)) throw e;
      result.paused = "Daily email limit reached. The rest go tomorrow.";
    }
    result.sentToday = sentToday;
    return Response.json(result);
  } catch (e) {
    console.error(e);
    return Response.json({ error: String((e as any)?.message || e) }, { status: 500 });
  }
});
