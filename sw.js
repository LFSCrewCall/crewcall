// Crew Call service worker: lets the app be added to the home screen and opens the
// last-seen version when the signal drops. Live data always comes from the network.
const CACHE = "crewcall-v24";
const SHELL = ["./", "index.html", "style.css", "app.js", "data.js", "i18n-dict.js", "i18n.js", "config.js", "cloud.js", "emails/newsletter-template.js", "emails/digest-template.js", "manifest.webmanifest", "icons/icon-192.png", "vendor/fonts/fonts.css", "vendor/fonts/archivo-latin.woff2", "vendor/fonts/jetbrainsmono-latin.woff2"];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  // network first (and past the browser cache, so a new page never runs with an old app.js), so people always get the latest version; fall back to the cache offline
  e.respondWith(fetch(e.request, { cache: "no-cache" }).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
