/* Crew Call "share a shoot by email".
   Builds the email from a shoot, as HTML with inline styles (works in Outlook, Gmail and Apple Mail) and as plain text.
   Used by the app's Share by email preview and, in the live version, by the server when you press Send from Crew Call.
   Only things already public on the shoot go in: no crew names, emails or role briefs. Edit this file only. */
(function (root) {
  var PALETTE = ["#e0a100", "#c2410c", "#0054f1", "#6d28d9", "#0f766e", "#be185d", "#4d7c0f", "#57534e"];
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MAX_DAYS = 10;
  function D(s) { return new Date(s + "T00:00:00Z"); }
  function iso(d) { return d.toISOString().slice(0, 10); }
  function daysIn(a, b) { var out = [], c = D(a), g = 0; while (iso(c) <= b && g++ < 400) { out.push(iso(c)); c.setUTCDate(c.getUTCDate() + 1); } return out; }
  function fmtDay(s) { var d = D(s); return WD[d.getUTCDay()] + " " + d.getUTCDate() + " " + MON[d.getUTCMonth()]; }
  function fmtFull(s) { var d = D(s); return d.getUTCDate() + " " + MON[d.getUTCMonth()] + " " + d.getUTCFullYear(); }
  function fmtRange(a, b) { var x = D(a), y = D(b); if (a === b) return fmtDay(a); if (x.getUTCMonth() === y.getUTCMonth()) return x.getUTCDate() + "–" + y.getUTCDate() + " " + MON[y.getUTCMonth()]; return x.getUTCDate() + " " + MON[x.getUTCMonth()] + " – " + y.getUTCDate() + " " + MON[y.getUTCMonth()]; }
  function e(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function andList(a) { return a.length <= 1 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]; }
  var PERKS = [["meals", "Meals"], ["travel", "Travel"], ["credit", "Credit"]];

  // ctx: { today: "YYYY-MM-DD", site: "https://…/", name: id => name or "", isCast: role => bool, isHod: roleObj => bool }
  function data(p, ctx) {
    var days = (p.shoots || []).reduce(function (a, r) { return a.concat(daysIn(r.from, r.to)); }, []);
    var up = days.filter(function (d) { return d >= ctx.today; }), use = up.length ? up : days;
    var past = !!p.wrapped || !up.length;
    var locs = p.locations || [];
    var locName = function (i) { return locs[i] ? locs[i].name : "Location TBC"; };
    var group = function (rs) { var seen = {}, out = []; rs.forEach(function (r) { var k = r.role + "|" + (r.character || "").toLowerCase() + "|" + (r.paid ? r.pay || "Paid" : ""); if (seen[k]) seen[k].n++; else out.push(seen[k] = { r: r, n: 1 }); }); return out; };
    var open = past ? [] : (p.roles || []).filter(function (r) { return !r.filledBy; });
    var prods = (Array.isArray(p.producers) ? p.producers : p.producer && p.producer.name ? [p.producer] : []).filter(function (x) { return x && x.name; }).map(function (x) { return (x.sid && ctx.name(x.sid)) || x.name; });
    (p.roles || []).forEach(function (r) { if (r.role === "Producer" && r.filledBy && String(r.filledBy).indexOf("ext:") !== 0) { var n = ctx.name(r.filledBy); if (n && prods.indexOf(n) < 0) prods.push(n); } });
    var k = p.perks || {}, last = use[use.length - 1];
    return {
      url: ctx.site + "#p/" + encodeURIComponent(p.id), title: p.title || "", type: p.type || "", term: p.term || "", logline: p.logline || "",
      dir: (p.dsid && ctx.name(p.dsid)) || p.director || "", prods: prods,
      color: PALETTE[(parseInt(String(p.id).replace(/\D/g, ""), 10) || String(p.id).length) % PALETTE.length],
      span: use.length ? (use.length === 1 ? fmtDay(use[0]) : fmtRange(use[0], last)) + " " + D(last).getUTCFullYear() : "",
      nDays: use.length,
      days: use.map(function (d) { var inf = Object.assign({ call: "08:00", wrap: "18:00", loc: 0 }, (p.days || {})[d] || {}); return { date: fmtDay(d), call: inf.call, wrap: inf.wrap + (inf.wrap <= inf.call ? " +1" : ""), loc: locName(inf.loc) }; }),
      locs: locs.map(function (l) { return l.name; }).filter(Boolean),
      roles: group(open.filter(function (r) { return !ctx.isCast(r.role); })).map(function (x) { return { name: x.r.role, n: x.n, hod: ctx.isHod(x.r), pay: x.r.paid ? x.r.pay || "Paid" : "" }; }),
      cast: group(open.filter(function (r) { return ctx.isCast(r.role); })).map(function (x) { return { name: [x.r.character, x.r.role, x.r.age].filter(Boolean).join(", "), n: x.n, pay: x.r.paid ? x.r.pay || "Paid" : "" }; }),
      castCloses: (p.casting && p.casting.closes) ? fmtFull(p.casting.closes) : "",
      perks: PERKS.filter(function (x) { return k[x[0]]; }).map(function (x) { return x[1]; })
    };
  }
  function wanted(d) { return d.roles.length || d.cast.length; }
  function subject(d) { return d.title + ": " + (wanted(d) ? "crew wanted" : "shoot dates") + (d.span ? ", " + d.span : ""); }
  // o: { note, dates, locs, roles, cast, logline, perks, from }  (from = sender's name, shown when sent by Crew Call)
  function text(d, o) {
    var L = [];
    if ((o.note || "").trim()) L.push(o.note.trim(), "");
    L.push(d.title.toUpperCase(), [d.type, d.term].filter(Boolean).join(" · "), "Directed by " + d.dir + (d.prods.length ? " · Produced by " + andList(d.prods) : ""));
    if (o.logline && d.logline) L.push("", d.logline);
    if (o.dates && d.days.length) { L.push("", "DATES · " + (d.nDays === 1 ? "1 day" : d.nDays + " days")); d.days.slice(0, MAX_DAYS).forEach(function (x) { L.push(x.date + " · call " + x.call + ", wrap " + x.wrap + " · " + x.loc); }); if (d.days.length > MAX_DAYS) L.push("and " + (d.days.length - MAX_DAYS) + " more days"); }
    if (o.locs && d.locs.length) { L.push("", d.locs.length > 1 ? "LOCATIONS" : "LOCATION"); d.locs.forEach(function (x) { L.push("- " + x); }); }
    if (o.roles && d.roles.length) { L.push("", "OPEN ROLES"); d.roles.forEach(function (x) { L.push("- " + x.name + (x.n > 1 ? " (" + x.n + " needed)" : "") + (x.hod ? " · HOD" : "") + (x.pay ? " · " + x.pay : "")); }); }
    if (o.cast && d.cast.length) { L.push("", "PARTS TO CAST"); d.cast.forEach(function (x) { L.push("- " + x.name + (x.n > 1 ? " (" + x.n + " needed)" : "") + (x.pay ? " · " + x.pay : "")); }); if (d.castCloses) L.push("Casting closes " + d.castCloses); }
    if (o.perks && d.perks.length) L.push("", "Crew get: " + d.perks.join(", "));
    L.push("", wanted(d) ? "See the roles and ask to join on Crew Call:" : "See the shoot on Crew Call:", d.url, "");
    return L.join("\n");
  }
  function html(d, o) {
    var f = "font-family:Helvetica,Arial,sans-serif;", color = d.color;
    var h = function (t) { return '<tr><td style="' + f + 'padding:22px 28px 6px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b6a66">' + t + "</td></tr>"; };
    var li = function (a, b) { return '<tr><td style="' + f + 'padding:8px 0;border-top:1px solid #e6e4dd;font-size:15px;color:#111">' + a + '</td><td align="right" style="' + f + 'padding:8px 0;border-top:1px solid #e6e4dd;font-size:13px;color:#6b6a66;white-space:nowrap">' + b + "</td></tr>"; };
    var list = function (rows) { return '<tr><td style="padding:0 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">' + rows + "</table></td></tr>"; };
    var tag = function (t, bg, c) { return '<span style="display:inline-block;padding:1px 6px;margin-left:6px;border-radius:3px;background:' + bg + ";color:" + c + ';font-size:11px;font-weight:700">' + e(t) + "</span>"; };
    var sum = function (a) { return a.reduce(function (s, x) { return s + x.n; }, 0); };
    var rows = "";
    if (o.from) rows += '<tr><td style="' + f + 'padding:20px 28px 0;font-size:13px;color:#6b6a66">' + e(o.from) + " shared this shoot with you on Crew Call. Reply to this email to reach them.</td></tr>";
    if ((o.note || "").trim()) rows += '<tr><td style="' + f + 'padding:' + (o.from ? "12px" : "24px") + ' 28px 0;font-size:15px;line-height:1.5;color:#111">' + e(o.note.trim()).replace(/\n/g, "<br>") + "</td></tr>";
    rows += '<tr><td style="' + f + "padding:24px 28px 0;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:" + color + '">' + e([d.type, d.term].filter(Boolean).join(" · ")) + "</td></tr>" +
      '<tr><td style="' + f + 'padding:6px 28px 0;font-size:28px;line-height:1.15;font-weight:800;color:#111">' + e(d.title) + "</td></tr>" +
      '<tr><td style="' + f + 'padding:6px 28px 0;font-size:14px;color:#55544f">Directed by ' + e(d.dir) + (d.prods.length ? " · Produced by " + e(andList(d.prods)) : "") + "</td></tr>";
    if (d.span && o.dates) rows += '<tr><td style="padding:14px 28px 0"><span style="display:inline-block;padding:6px 10px;background:#f4f3eb;border:1px solid #dbdad7;font-family:Menlo,Consolas,monospace;font-size:14px;color:#111">' + e(d.span) + " · " + (d.nDays === 1 ? "1 day" : d.nDays + " days") + "</span></td></tr>";
    if (o.logline && d.logline) rows += '<tr><td style="' + f + 'padding:14px 28px 0;font-size:15px;line-height:1.5;color:#111">' + e(d.logline) + "</td></tr>";
    if (o.dates && d.days.length) rows += h("Schedule") + list(d.days.slice(0, MAX_DAYS).map(function (x) { return li("<b>" + e(x.date) + '</b><br><span style="font-size:13px;color:#6b6a66">' + e(x.loc) + "</span>", '<span style="font-family:Menlo,Consolas,monospace">Call ' + e(x.call) + " · Wrap " + e(x.wrap) + "</span>"); }).join("") + (d.days.length > MAX_DAYS ? li("and " + (d.days.length - MAX_DAYS) + " more days", "") : ""));
    if (o.locs && d.locs.length) rows += h(d.locs.length > 1 ? "Locations" : "Location") + list(d.locs.map(function (x) { return li(e(x), ""); }).join(""));
    if (o.roles && d.roles.length) rows += h("Open roles · " + sum(d.roles)) + list(d.roles.map(function (x) { return li(e(x.name) + (x.hod ? tag("HOD", "#111", "#fff") : "") + (x.n > 1 ? tag(x.n + " needed", "#ffe3e1", "#c80000") : ""), x.pay ? tag(x.pay, "#111", "#fff") : "In kind"); }).join(""));
    if (o.cast && d.cast.length) rows += h("Parts to cast · " + sum(d.cast)) + list(d.cast.map(function (x) { return li(e(x.name) + (x.n > 1 ? tag(x.n + " needed", "#ffe3e1", "#c80000") : ""), x.pay ? tag(x.pay, "#111", "#fff") : ""); }).join("") + (d.castCloses ? li('<span style="font-size:13px;color:#6b6a66">Casting closes ' + e(d.castCloses) + "</span>", "") : ""));
    if (o.perks && d.perks.length) rows += '<tr><td style="' + f + 'padding:18px 28px 0;font-size:14px;color:#111"><b>Crew get:</b> ' + e(d.perks.join(" · ")) + "</td></tr>";
    rows += '<tr><td style="padding:24px 28px 28px"><a href="' + e(d.url) + '" style="' + f + 'display:inline-block;padding:12px 20px;background:#ff0000;color:#000;font-size:15px;font-weight:700;text-decoration:none">' + (wanted(d) ? "See the roles and ask to join" : "See the shoot") + "</a></td></tr>";
    return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f4f3eb"><tr><td align="center" style="padding:16px 8px">' +
      '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:600px;background:#fff;border:1px solid #dbdad7">' +
      '<tr><td style="' + f + 'padding:12px 28px;background:#000;color:#fff;font-size:15px;font-weight:800">Crew Call <span style="font-weight:400;color:#9a958b;font-size:12px">· London Film School</span></td></tr>' +
      '<tr><td style="height:4px;background:' + color + ';font-size:0;line-height:0">&nbsp;</td></tr>' + rows +
      '<tr><td style="' + f + 'padding:14px 28px;border-top:1px solid #e6e4dd;font-size:12px;color:#6b6a66">Sent from Crew Call, run by LFS students. Sign in to see who\'s on the crew and get in touch.</td></tr>' +
      "</table></td></tr></table>";
  }
  root.CCShareEmail = { data: data, subject: subject, text: text, html: html, MAX_DAYS: MAX_DAYS };
})(typeof window !== "undefined" ? window : globalThis);
