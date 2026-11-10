/* Crew Call weekly digest email.
   One function builds the whole email as HTML with inline styles, so it works in Outlook, Gmail and Apple Mail.
   Used by the app's "Preview this week's digest" and, in the live version, by the weekly send job.
   To change the wording or colours, edit this file only. */
(function (root) {
  var C = { ink: "#000000", muted: "#57534e", faint: "#8a867f", line: "#dbdad7", page: "#f4f3eb", card: "#ffffff",
            dark: "#000000", accent: "#ff0000", accentInk: "#000000", mine: "#ffe3e1", mineInk: "#782525",
            pill: "#ebe9e1", pillInk: "#3d3d3d", free: "#0054f1", freeSoft: "#e5edff" };
  var F = "font-family:Archivo,'Helvetica Neue',Arial,sans-serif;";
  function e(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function btn(label, url, solid) {
    return '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-radius:0;background:' + (solid ? C.accent : C.card) + ';border:1px solid ' + (solid ? C.accent : C.line) + ';">' +
      '<a href="' + e(url) + '" style="display:inline-block;padding:10px 16px;' + F + 'font-size:14px;font-weight:bold;color:' + (solid ? C.accentInk : C.ink) + ';text-decoration:none;white-space:nowrap;">' + e(label) + '</a></td></tr></table>';
  }
  function h2(t, note) {
    return '<tr><td style="padding:28px 0 10px;' + F + '"><div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:' + C.muted + ';font-weight:bold;">' + e(t) + '</div>' +
      (note ? '<div style="font-size:13px;color:' + C.faint + ';padding-top:4px;">' + e(note) + '</div>' : "") + '</td></tr>';
  }
  function freeLine(m) {
    if (!m.total) return "";
    var all = m.free === m.total, none = !m.free;
    var txt = none ? "You haven't marked these days free" : all ? "You're free every shoot day" : "You're free " + m.free + " of " + m.total + " shoot days";
    return '<span style="display:inline-block;padding:3px 8px;border-radius:0;background:' + (none ? C.pill : C.freeSoft) + ';color:' + (none ? C.muted : C.free) + ';font-size:12px;font-weight:bold;">' + e(txt) + '</span>';
  }
  function card(m) {
    var pills = m.roles.map(function (r) {
      return '<span style="display:inline-block;margin:0 4px 4px 0;padding:4px 9px;border-radius:0;font-size:12px;font-weight:bold;background:' + (r.mine ? C.mine : C.pill) + ';color:' + (r.mine ? C.mineInk : C.pillInk) + ';">' + e(r.name) + '</span>';
    }).join("");
    return '<tr><td style="padding:0 0 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:' + C.card + ';border:1px solid ' + C.line + ';border-radius:0;border-left:4px solid ' + e(m.color || C.accent) + ';">' +
      '<tr><td style="padding:16px 18px;' + F + '">' +
      '<div style="font-size:12px;color:' + C.muted + ';padding-bottom:2px;">' + e(m.type) + '</div>' +
      '<a href="' + e(m.url) + '" style="font-size:18px;font-weight:bold;color:' + C.ink + ';text-decoration:none;">' + e(m.title) + '</a>' +
      '<div style="font-size:14px;color:' + C.ink + ';padding:6px 0 10px;line-height:20px;">' + e(m.dates) + '<br><span style="color:' + C.muted + ';">Call ' + e(m.call) + ' &middot; ' + e(m.loc) + '</span></div>' +
      '<div style="padding-bottom:8px;">' + pills + '</div>' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="' + F + 'vertical-align:middle;">' + freeLine(m) + '</td>' +
      '<td align="right" style="vertical-align:middle;">' + btn("Request to join", m.url, true) + '</td></tr></table>' +
      '</td></tr></table></td></tr>';
  }
  function row(cells) {
    return '<tr><td style="padding:12px 0;border-top:1px solid ' + C.line + ';' + F + 'font-size:14px;line-height:20px;color:' + C.ink + ';">' + cells + '</td></tr>';
  }

  function render(d) {
    var s = d.stats || {};
    var headline = d.matches.length
      ? d.matches.length + " shoot" + (d.matches.length === 1 ? "" : "s") + " need" + (d.matches.length === 1 ? "s" : "") + " " + (d.topRole ? "a " + d.topRole : "crew like you") + " on days you're free"
      : "Nothing matches your days this week";
    var pre = d.matches.length ? d.matches.slice(0, 2).map(function (m) { return m.title; }).join(", ") + (d.matches.length > 2 ? " and more" : "") + " are looking for crew." : "Mark more free days to get matched with shoots.";
    var out = [];
    out.push('<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>' + e(d.subject || "Crew Call weekly") + '</title></head>');
    out.push('<body style="margin:0;padding:0;background:' + C.page + ';">');
    out.push('<div style="display:none;max-height:0;overflow:hidden;opacity:0;">' + e(pre) + '</div>');
    out.push('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:' + C.page + ';"><tr><td align="center" style="padding:24px 12px;">');
    out.push('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">');
    // header
    out.push('<tr><td style="background:' + C.dark + ';border-radius:0;padding:18px 24px;' + F + '"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
      '<td style="' + F + '"><span style="display:inline-block;background:' + C.accent + ';color:#000000;font-size:18px;line-height:20px;font-weight:900;letter-spacing:-.2px;text-transform:uppercase;padding:6px 10px;">Crew Call</span></td>' +
      '<td align="right" style="font-size:12px;color:#a8a49c;letter-spacing:1px;text-transform:uppercase;' + F + '">Weekly &middot; ' + e(d.weekLabel) + '</td></tr></table></td></tr>');
    // hero
    out.push('<tr><td style="background:' + C.card + ';padding:28px 24px 24px;border:1px solid ' + C.line + ';border-top:0;border-radius:0;' + F + '">' +
      '<div style="font-size:14px;color:' + C.muted + ';padding-bottom:6px;">Hi ' + e(d.first) + ',</div>' +
      '<div style="font-size:28px;line-height:31px;font-weight:900;letter-spacing:-.3px;color:' + C.ink + ';">' + e(headline) + '</div>' +
      '<div style="font-size:14px;line-height:21px;color:' + C.muted + ';padding-top:8px;">' + e(d.termLabel) + '. Shoots in the next six weeks, matched to your roles and the days you\'ve marked free.</div>' +
      // stats
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;border-top:1px solid ' + C.line + ';"><tr>' +
      [["Open roles", s.open], ["Shoots this week", s.thisWeek], ["New since last week", s.newCount]].map(function (x, i) {
        return '<td width="33%" style="padding:14px 0 0;' + (i ? "padding-left:12px;" : "") + F + '"><div style="font-size:24px;font-weight:bold;color:' + C.ink + ';">' + e(x[1]) + '</div><div style="font-size:12px;color:' + C.muted + ';">' + x[0] + '</div></td>';
      }).join("") + '</tr></table></td></tr>');
    // body
    out.push('<tr><td style="background:' + C.page + ';padding:0 0 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">');
    if (d.own && d.own.length) {
      out.push(h2("Your projects"));
      out.push('<tr><td style="background:' + C.card + ';border:1px solid ' + C.line + ';border-radius:0;padding:4px 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">');
      d.own.forEach(function (p, i) {
        var bits = [];
        if (p.waiting) bits.push('<b style="color:' + C.mineInk + ';">' + p.waiting + ' request' + (p.waiting > 1 ? "s" : "") + ' waiting</b>');
        bits.push(p.open ? p.open + " role" + (p.open > 1 ? "s" : "") + " still open" : '<span style="color:' + C.free + ';font-weight:bold;">Fully crewed</span>');
        out.push('<tr><td style="padding:12px 0;' + (i ? "border-top:1px solid " + C.line + ";" : "") + F + 'font-size:14px;line-height:20px;"><a href="' + e(p.url) + '" style="color:' + C.ink + ';font-weight:bold;text-decoration:none;">' + e(p.title) + '</a><br><span style="color:' + C.muted + ';">' + bits.join(" &middot; ") + '</span></td>' +
          '<td align="right" style="padding:12px 0;' + (i ? "border-top:1px solid " + C.line + ";" : "") + '">' + btn(p.waiting ? "Review" : "Open", p.url, false) + '</td></tr>');
      });
      out.push('</table></td></tr>');
    }
    out.push(h2("Needs you", "Your roles are highlighted"));
    if (d.matches.length) d.matches.forEach(function (m) { out.push(card(m)); });
    else out.push('<tr><td style="background:' + C.card + ';border:1px solid ' + C.line + ';border-radius:0;padding:18px;' + F + 'font-size:14px;color:' + C.muted + ';">No shoots match your roles on your free days this week. Marking more free days usually helps.</td></tr>');
    if (d.learn && d.learn.length) {
      out.push(h2("Learn on set", "Shoots where you could ask to shadow a role you want to learn"));
      out.push('<tr><td style="background:' + C.card + ';border:1px solid ' + C.line + ';border-radius:0;padding:4px 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">');
      d.learn.forEach(function (l, i) {
        out.push('<tr><td style="padding:12px 0;' + (i ? "border-top:1px solid " + C.line + ";" : "") + F + 'font-size:14px;line-height:20px;">Shadow the <b>' + e(l.role) + '</b> on <a href="' + e(l.url) + '" style="color:' + C.ink + ';font-weight:bold;">' + e(l.title) + '</a><br><span style="color:' + C.muted + ';">' + e(l.dates) + '</span></td></tr>');
      });
      out.push('</table></td></tr>');
    }
    // nudge
    out.push('<tr><td style="padding:24px 0 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:' + C.dark + ';border-radius:0;"><tr>' +
      '<td style="padding:18px;' + F + 'font-size:14px;line-height:20px;color:#ece8e1;"><b>Are your free days still right?</b><br><span style="color:' + C.faint + ';">Last updated ' + e(d.updatedAgo) + '. Up-to-date days get you better matches.</span></td>' +
      '<td align="right" style="padding:18px;">' + btn("Update my days", d.links.days, true) + '</td></tr></table></td></tr>');
    out.push('</table></td></tr>');
    // footer
    out.push('<tr><td style="padding:24px 8px 8px;' + F + 'font-size:12px;line-height:18px;color:' + C.muted + ';text-align:center;">' +
      'You get this because you turned on the weekly digest in Crew Call. It arrives ' + e(d.sendLabel) + '.<br>' +
      '<a href="' + e(d.links.settings) + '" style="color:' + C.muted + ';">Change what you get</a> &nbsp;&middot;&nbsp; <a href="' + e(d.links.unsubscribe) + '" style="color:' + C.muted + ';">Turn off the digest</a> &nbsp;&middot;&nbsp; <a href="' + e(d.links.app) + '" style="color:' + C.muted + ';">Open Crew Call</a><br><br>' +
      'Crew Call is run by LFS students. It is not an official LFS service.</td></tr>');
    out.push('</table></td></tr></table></body></html>');
    return out.join("");
  }
  root.CrewCallDigest = render;
  if (typeof module !== "undefined") module.exports = render;
})(typeof window !== "undefined" ? window : globalThis);
