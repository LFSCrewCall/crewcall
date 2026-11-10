/* Crew Call newsletter email.
   Builds the newsletter the admins design in Admin > Newsletter, using the same black and red
   look as the weekly digest. Inline styles only, so it works in Outlook, Gmail and Apple Mail.
   Block types: heading, text, image, button, divider, and "auto" (open roles, upcoming shoots,
   Develop posts or Release films, filled in from Crew Call when the email is sent). */
(function (root) {
  var C = { ink: "#000000", muted: "#57534e", faint: "#8a867f", line: "#dbdad7", page: "#f4f3eb", card: "#ffffff",
            dark: "#000000", accent: "#ff0000", pill: "#ebe9e1", pillInk: "#3d3d3d" };
  var F = "font-family:Archivo,'Helvetica Neue',Arial,sans-serif;";
  function e(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function safeUrl(u) { u = String(u || "").trim(); return /^https?:\/\//i.test(u) ? u : ""; }
  function para(t) {
    return String(t || "").split(/\n{2,}/).map(function (p) {
      return '<p style="margin:0 0 14px;' + F + 'font-size:15px;line-height:23px;color:' + C.ink + ';">' + e(p).replace(/\n/g, "<br>") + '</p>';
    }).join("");
  }
  function btn(label, url) {
    return '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:' + C.accent + ';border:1px solid ' + C.accent + ';">' +
      '<a href="' + e(url) + '" style="display:inline-block;padding:12px 18px;' + F + 'font-size:14px;font-weight:bold;color:#000000;text-decoration:none;">' + e(label) + '</a></td></tr></table>';
  }
  function cell(inner, pad) { return '<tr><td style="background:' + C.card + ';border-left:1px solid ' + C.line + ';border-right:1px solid ' + C.line + ';padding:' + (pad || "0 24px") + ';">' + inner + '</td></tr>'; }

  var AUTO_TITLES = { roles: "Open roles", shoots: "Coming up", develop: "In development", release: "Films looking for an audience" };

  function block(b) {
    if (b.t === "heading") return cell('<div style="' + F + 'font-size:22px;line-height:27px;font-weight:900;color:' + C.ink + ';padding:18px 0 8px;">' + e(b.text) + '</div>');
    if (b.t === "text") return cell(para(b.text));
    if (b.t === "divider") return cell('<div style="border-top:1px solid ' + C.line + ';margin:8px 0 18px;font-size:0;line-height:0;">&nbsp;</div>');
    if (b.t === "button") { var u = safeUrl(b.url); return u ? cell('<div style="padding:4px 0 18px;">' + btn(b.label || "Open", u) + '</div>') : ""; }
    if (b.t === "image") {
      var src = safeUrl(b.url); if (!src) return "";
      var img = '<img src="' + e(src) + '" alt="' + e(b.alt) + '" width="550" style="display:block;width:100%;max-width:550px;height:auto;border:0;">';
      var link = safeUrl(b.link);
      return cell('<div style="padding:6px 0 ' + (b.caption ? "6px" : "18px") + ';">' + (link ? '<a href="' + e(link) + '">' + img + '</a>' : img) + '</div>' +
        (b.caption ? '<div style="' + F + 'font-size:12px;color:' + C.muted + ';padding-bottom:18px;">' + e(b.caption) + '</div>' : ""));
    }
    if (b.t === "auto") {
      var items = b.items || [];
      var head = '<div style="' + F + 'font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:' + C.muted + ';font-weight:bold;padding:14px 0 8px;">' + e(b.title || AUTO_TITLES[b.what] || "From Crew Call") + '</div>';
      if (!items.length) return cell(head + '<p style="' + F + 'font-size:14px;color:' + C.muted + ';margin:0 0 16px;">Nothing to show right now.</p>');
      var rows = items.map(function (it, i) {
        var tags = (it.tags || []).map(function (t) { return '<span style="display:inline-block;margin:4px 4px 0 0;padding:3px 8px;font-size:12px;font-weight:bold;background:' + C.pill + ';color:' + C.pillInk + ';">' + e(t) + '</span>'; }).join("");
        return '<tr><td style="padding:12px 0 12px 12px;border-left:4px solid ' + e(it.color || C.accent) + ';' + (i ? "border-top:1px solid " + C.line + ";" : "") + F + 'font-size:14px;line-height:20px;">' +
          '<a href="' + e(it.url) + '" style="color:' + C.ink + ';font-weight:bold;text-decoration:none;font-size:16px;">' + e(it.title) + '</a><br><span style="color:' + C.muted + ';">' + e(it.meta) + '</span>' + (tags ? '<br>' + tags : "") + '</td></tr>';
      }).join("");
      return cell(head + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">' + rows + '</table>');
    }
    return "";
  }

  function render(d) {
    var out = [];
    out.push('<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>' + e(d.subject || "Crew Call") + '</title></head>');
    out.push('<body style="margin:0;padding:0;background:' + C.page + ';">');
    if (d.preheader) out.push('<div style="display:none;max-height:0;overflow:hidden;opacity:0;">' + e(d.preheader) + '</div>');
    out.push('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:' + C.page + ';"><tr><td align="center" style="padding:24px 12px;">');
    out.push('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">');
    out.push('<tr><td style="background:' + C.dark + ';padding:18px 24px;' + F + '"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
      '<td style="' + F + '"><span style="display:inline-block;background:' + C.accent + ';color:#000000;font-size:18px;line-height:20px;font-weight:900;text-transform:uppercase;padding:6px 10px;">Crew Call</span></td>' +
      '<td align="right" style="font-size:12px;color:#a8a49c;letter-spacing:1px;text-transform:uppercase;' + F + '">Newsletter' + (d.issueLabel ? ' &middot; ' + e(d.issueLabel) : "") + '</td></tr></table></td></tr>');
    out.push('<tr><td style="background:' + C.card + ';padding:28px 24px 6px;border:1px solid ' + C.line + ';border-top:0;border-bottom:0;' + F + '">' +
      '<div style="font-size:30px;line-height:33px;font-weight:900;letter-spacing:-.3px;color:' + C.ink + ';">' + e(d.subject || "Untitled newsletter") + '</div>' +
      (d.preheader ? '<div style="font-size:15px;line-height:22px;color:' + C.muted + ';padding-top:8px;">' + e(d.preheader) + '</div>' : "") + '</td></tr>');
    (d.blocks || []).forEach(function (b) { out.push(block(b)); });
    out.push('<tr><td style="background:' + C.card + ';border:1px solid ' + C.line + ';border-top:0;padding:6px 24px 20px;' + F + 'font-size:13px;color:' + C.muted + ';">' + e(d.signoff || "") + '</td></tr>');
    out.push('<tr><td style="padding:24px 8px 8px;' + F + 'font-size:12px;line-height:18px;color:' + C.muted + ';text-align:center;">' +
      'Sent by the Crew Call admins to ' + e(d.audienceLabel || "Crew Call members") + '.<br>' +
      '<a href="' + e(d.links && d.links.settings) + '" style="color:' + C.muted + ';">Change what you get</a> &nbsp;&middot;&nbsp; <a href="' + e(d.links && d.links.unsubscribe) + '" style="color:' + C.muted + ';">Stop the newsletter</a> &nbsp;&middot;&nbsp; <a href="' + e(d.links && d.links.app) + '" style="color:' + C.muted + ';">Open Crew Call</a><br><br>' +
      'Crew Call is run by LFS students. It is not an official LFS service.</td></tr>');
    out.push('</table></td></tr></table></body></html>');
    return out.join("");
  }
  root.CrewCallNewsletter = render;
  if (typeof module !== "undefined") module.exports = render;
})(typeof window !== "undefined" ? window : globalThis);
