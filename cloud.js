// Crew Call: saving to the cloud (Supabase).
// With config.js empty, Crew Call runs as a demo with sample people and saves nothing.
// With a Supabase address and public key in config.js, everything is loaded from and
// saved to the Supabase database, and people sign in with an emailed code.
(() => {
  const CFG = window.CC_CLOUD || {};
  // Adding ?demo to the address opens the demo (sample people, nothing saved), even on the live site
  const DEMO = /[?&]demo\b/.test(location.search);
  const ON = !!(CFG.url && CFG.key) && !DEMO;
  window.CC_CLOUD_ON = ON;
  window.CC_DEMO = DEMO && !!(CFG.url && CFG.key);

  // Which part of the app goes into which kind of record
  const COLL = { students: "student", projects: "project", scripts: "script", releases: "release", releaseInterest: "releaseInterest", posts: "post", postInterest: "postInterest", funds: "fund", scriptInterest: "scriptInterest", newsletters: "newsletter", gigs: "gig", gigApps: "gigApp", requests: "request", notifications: "notification", reports: "report", transFixes: "transFix" };
  const SINGLE = ["admins", "owner", "adminPerms", "settings", "customWords", "handover", "nlAuto", "adminVia", "reps", "ownerProposal", "adminLog"];
  const CONSTS = ["COURSES", "TERM_DATES", "ROLE_GROUPS", "TERMS", "PATHWAYS", "TYPES", "KIT_CATS"];
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const KIND_OF = Object.fromEntries(Object.entries(COLL).map(([k, v]) => [v, k]));

  const V = (document.currentScript && /[?&]v=(\w+)/.exec(document.currentScript.src) || [])[1];
  const load = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = V ? src + "?v=" + V : src; s.async = false; s.onload = ok; s.onerror = () => no(new Error("Couldn't load " + src)); document.body.appendChild(s); });
  const startApp = async () => { await load("app.js"); await load("i18n-dict.js"); await load("i18n.js"); };

  if (!ON) { startApp(); return; }

  // ---------- live mode ----------
  let db, session = null, base = {}, baseMail = {}, busy = false, again = false, lastPull = Date.now(), denied = 0;
  const state = document.createElement("span");
  state.className = "cloud-state"; state.setAttribute("role", "status"); state.hidden = true;
  const show = (t, cls = "") => { state.hidden = !t; state.textContent = t || ""; state.className = "cloud-state " + cls; };

  // Everything in the app, as rows for the database
  function rows() {
    const S = window.CC_APP.S, C = window.CC_CONST, out = new Map(), mail = new Map();
    for (const [coll, kind] of Object.entries(COLL)) for (const it of S[coll] || []) {
      if (!it || !it.id) continue;
      let data = it;
      if (kind === "student" && UUID.test(it.id)) {
        data = { ...it }; delete data.email;
        if (it.email) mail.set(it.id, { id: it.id, email: it.email, share: !!it.shareEmail });
      }
      out.set(kind + "|" + it.id, { kind, id: String(it.id), data });
    }
    for (const it of S.invites || []) if (it && it.email) out.set("invite|" + it.email.toLowerCase(), { kind: "invite", id: it.email.toLowerCase(), data: it });
    for (const k of SINGLE) out.set("config|" + k, { kind: "config", id: k, data: { v: S[k] === undefined ? null : S[k] } });
    for (const k of CONSTS) out.set("config|" + k, { kind: "config", id: k, data: { v: C[k] } });
    return { out, mail };
  }
  const J = x => JSON.stringify(x);

  async function fetchAll(from, cols) {
    const all = [];
    for (let i = 0; ; i += 1000) {
      const { data, error } = await db.from(from).select(cols).range(i, i + 999);
      if (error) throw error;
      all.push(...data);
      if (data.length < 1000) return all;
    }
  }

  async function pull() {
    const signedIn = !!session;
    const recs = signedIn ? await fetchAll("records", "kind,id,data") : [...await fetchAll("records", "kind,id,data"), ...await fetchAll("public_projects", "kind,id,data")];
    const mails = signedIn ? await fetchAll("emails", "id,email,share") : [];
    return { recs, mails };
  }

  // Turn database rows into the app's starting data
  function seedFrom({ recs, mails }) {
    const demo = window.CC_SEED, S = {};
    for (const coll of Object.keys(COLL)) S[coll] = [];
    Object.assign(S, { invites: [], admins: [], owner: null, adminPerms: {}, settings: { ...demo.settings, senderEmail: "", replyTo: "", schoolAlias: "" }, customWords: {}, handover: { done: {}, notes: "", log: [] }, nlAuto: { ...demo.nlAuto, on: false }, adminVia: {}, reps: {}, ownerProposal: null, adminLog: [] });
    const em = Object.fromEntries(mails.map(m => [m.id, m.email]));
    // "Actor" became "Talent" (with "Supporting artist" alongside), so older records read with the new name
    const renamed = d => { const t = JSON.stringify(d); return t.includes('"Actor"') ? JSON.parse(t.replace(/"Actor"/g, '"Talent"')) : d; };
    for (const r0 of recs) {
      const r = { ...r0, data: renamed(r0.data) };
      if (r.kind === "config" && r.id === "ROLE_GROUPS" && r.data && r.data.v) { const g = r.data.v, c = Object.keys(g).find(k => (g[k] || []).includes("Talent")); if (c && !g[c].includes("Supporting artist")) g[c].splice(g[c].indexOf("Talent") + 1, 0, "Supporting artist"); }
      if (r.kind === "config") { if (CONSTS.includes(r.id)) window.CC_CONST[r.id] = r.data.v; else if (SINGLE.includes(r.id)) S[r.id] = r.data.v; continue; }
      if (r.kind === "invite") { S.invites.push(r.data); continue; }
      const coll = KIND_OF[r.kind]; if (!coll) continue;
      const it = { ...r.data, id: r.id };
      if (r.kind === "student") it.email = em[r.id] || it.email || "";
      if (r.kind === "project") { it.email = it.email || ""; it.roles = it.roles || []; it.shoots = it.shoots || []; it.locations = it.locations || []; it.shadows = it.shadows || []; }
      S[coll].push(it);
    }
    if (session) { const mine = S.students.find(s => s.id === session.user.id); if (mine) mine.email = session.user.email.toLowerCase(); }
    return S;
  }

  // Remember what the database holds, so only real changes are sent
  function rebase(keys) {
    const { out, mail } = rows();
    for (const [k, r] of out) if (!keys || keys.has(k)) base[k] = J(r.data);
    for (const [id, m] of mail) if (!keys || keys.has("student|" + id)) baseMail[id] = J(m);
  }

  const isNet = e => !e || !e.code && /fetch|network|timeout|load failed/i.test(e.message || "");

  async function sync() {
    if (!window.CC_APP || !session) return;
    if (busy) { again = true; return; }
    busy = true;
    const { out, mail } = rows();
    const jobs = [];
    for (const [k, r] of out) {
      const j = J(r.data);
      if (!(k in base)) jobs.push(["insert", k, r, j]);
      else if (base[k] !== j) jobs.push(["update", k, r, j]);
    }
    for (const k of Object.keys(base)) if (!out.has(k)) jobs.push(["delete", k, null, null]);
    for (const [id, m] of mail) if (baseMail[id] !== J(m) && (id === session.user.id || baseMail[id] !== undefined || window.CC_APP.can("people"))) jobs.push(["mail", id, m, J(m)]);
    if (!jobs.length) { busy = false; return; }
    show("Saving…", "cs-saving");
    let offline = false, refused = 0;
    for (const [op, k, r, j] of jobs) {
      let res;
      try {
        if (op === "insert") {
          res = await db.from("records").insert({ kind: r.kind, id: r.id, data: r.data });
          if (res.error && res.error.code === "23505") res = await db.from("records").update({ data: r.data }).match({ kind: r.kind, id: r.id }).select("id");
        } else if (op === "update") res = await db.from("records").update({ data: r.data }).match({ kind: r.kind, id: r.id }).select("id");
        else if (op === "delete") { const [kind, ...rest] = k.split("|"); res = await db.from("records").delete().match({ kind, id: rest.join("|") }).select("id"); }
        else res = await db.from("emails").upsert(r);
      } catch (e) { res = { error: e }; }
      if (res.error && isNet(res.error)) { offline = true; continue; }
      const none = !res.error && Array.isArray(res.data) && res.data.length === 0 && op !== "insert";
      if (res.error || none) { if (!k.startsWith("config|") || op !== "insert") refused++; console.warn("Crew Call: not saved", op, k, res.error || "no permission"); }
      if (op === "mail") baseMail[k] = j; else if (op === "delete") delete base[k]; else base[k] = j;
    }
    busy = false;
    if (offline) show("Offline. Changes will save when you're back online.", "cs-off");
    else if (refused) { show(""); denied += refused; window.CC_APP.toast(refused === 1 ? "One change couldn't be saved: only the person it belongs to or an admin can change it." : `${refused} changes couldn't be saved: only the people they belong to or an admin can change them.`); }
    else { show("Saved", "cs-ok"); setTimeout(() => { if (state.textContent === "Saved") show(""); }, 1500); }
    if (again) { again = false; setTimeout(sync, 50); }
  }

  let t = null;
  const soon = () => { clearTimeout(t); t = setTimeout(sync, 600); };

  // Fetch other people's changes, keeping anything this person hasn't saved yet
  async function refresh() {
    if (busy) return;
    lastPull = Date.now();
    let data; try { data = await pull(); } catch (e) { return; }
    const { out } = rows();
    const pending = new Set([...out.keys()].filter(k => base[k] !== J(out.get(k).data)));
    const fresh = seedFrom(data), S = window.CC_APP.S;
    const keep = {};
    for (const [coll, kind] of Object.entries(COLL)) keep[coll] = (S[coll] || []).filter(it => it && pending.has(kind + "|" + it.id));
    for (const coll of Object.keys(COLL)) S[coll] = [...fresh[coll].filter(it => !pending.has(COLL[coll] + "|" + it.id)), ...keep[coll]];
    S.invites = [...fresh.invites.filter(i => !pending.has("invite|" + i.email.toLowerCase())), ...(S.invites || []).filter(i => pending.has("invite|" + i.email.toLowerCase()))];
    for (const k of SINGLE) if (!pending.has("config|" + k)) S[k] = fresh[k];
    const old = base; base = {};
    for (const k of pending) if (k in old) base[k] = old[k];
    window.CC_APP.refresh();
    rebase(new Set(data.recs.map(r => r.kind + "|" + r.id).filter(k => !pending.has(k))));
  }

  window.CC_CLOUDAPI = {
    on: true,
    async canJoin(email) { const { data, error } = await db.rpc("can_join", { e: email }); if (error) throw error; return !!data; },
    async sendCode(email) {
      const { error } = await db.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: location.origin + location.pathname } });
      if (!error) return "";
      const st = error.status, m = error.message && error.message !== "{}" ? error.message : "";
      if (st === 429 || /rate limit/i.test(m)) return "Too many codes requested. Wait a while and try again.";
      if (st >= 500 || !m) return "Couldn't send the email. The email sender settings in Supabase need checking.";
      return m;
    },
    async verify(email, token) {
      const { error } = await db.auth.verifyOtp({ email, token, type: "email" });
      if (error) return error.message || "That code didn't work";
      location.reload(); return "";
    },
    async signOut() { await sync(); await db.auth.signOut(); location.reload(); },
    // server-side actions that RLS wouldn't allow as a plain edit (step down, hand over a project)
    async rpc(name, args) {
      await sync();
      const { data, error } = await db.rpc(name, args);
      if (error) return { error: error.message || "That didn't work" };
      await refresh(); return { data };
    },
    async calToken(reset) { const { data, error } = await db.rpc(reset ? "reset_cal_token" : "my_cal_token"); if (error) throw error; return data; },
    // project and campaign photos live in the public "covers" bucket, one folder per person (see supabase/storage.sql)
    async uploadCover(blob) {
      if (!session) throw new Error("Sign in first");
      const path = `${session.user.id}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.jpg`;
      const { error } = await db.storage.from("covers").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
      if (error) throw error;
      return db.storage.from("covers").getPublicUrl(path).data.publicUrl;
    },
    async removeCover(url) {
      const m = String(url || "").match(/\/storage\/v1\/object\/public\/covers\/(.+)$/);
      if (!m || !session || !m[1].startsWith(session.user.id + "/")) return;
      await db.storage.from("covers").remove([decodeURIComponent(m[1])]);
    },
    funcUrl: (CFG.url || "").replace(/\/$/, "") + "/functions/v1/crewcall",
    saveNow: sync,
    refresh,
    status: () => ({ session: !!session, pending: Object.keys(base).length, denied })
  };

  (async () => {
    document.body.appendChild(state);
    show("Loading…", "cs-saving");
    try {
      await load("vendor/supabase/supabase.js");
      db = window.supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
      session = (await db.auth.getSession()).data.session;
      if (session) await db.rpc("claim_owner");
      const data = await pull();
      window.CC_SEED = seedFrom(data);
      await startApp();
      if (session) window.CC_APP.cloudSignIn(session.user.id, session.user.email.toLowerCase());
      // what's already in the database counts as saved; anything missing (first run) gets added
      const have = new Set(data.recs.map(r => r.kind + "|" + r.id));
      if (session) { rebase(have); for (const m of data.mails) baseMail[m.id] = J({ id: m.id, email: m.email, share: m.share }); }
      // note the day this person was last here, so old-profile clean-up never removes someone who still visits
      if (session) { const m = (window.CC_APP.S.students || []).find(s => s.id === session.user.id), day = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" }); if (m && m.seen !== day) m.seen = day; }
      show("");
      if (session) {
        ["click", "change", "submit", "keyup"].forEach(ev => document.addEventListener(ev, soon, true));
        setInterval(sync, 5000);
        addEventListener("pagehide", sync);
        addEventListener("online", sync);
        document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && Date.now() - lastPull > 60000) refresh(); else if (document.visibilityState === "hidden") sync(); });
        setInterval(() => { if (document.visibilityState === "visible" && Date.now() - lastPull > 120000) refresh(); }, 30000);
        sync();
      }
      db.auth.onAuthStateChange((ev, s) => { if (ev === "SIGNED_OUT" && session) location.reload(); if (s) session = s; });
    } catch (e) {
      console.error(e);
      show("Couldn't reach the Crew Call database. Check your connection and reload.", "cs-off");
      if (!window.CC_APP) { window.CC_SEED = seedFrom({ recs: [], mails: [] }); await startApp(); }
    }
  })();
})();
