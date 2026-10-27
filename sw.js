/* Service worker — Briefing du Matin
   Cache de l'app shell (index.html, manifest.json, icon.svg) pour un
   démarrage instantané et un mode hors-ligne. Les flux RSS externes
   passent toujours par le réseau (jamais mis en cache par ce SW). */

const CACHE = "briefing-matin-v2";
const ASSETS = ["./", "./index.html", "./manifest.json", "./icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Ressources même origine (app shell) : cache d'abord, réseau en secours
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then((hit) =>
        hit ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        }).catch(() =>
          // Navigation hors-ligne → version en cache de l'app
          req.mode === "navigate" ? caches.match("./index.html") : Response.error()
        )
      )
    );
    return;
  }

  // Requêtes externes (flux RSS, replieurs CORS) : réseau uniquement
});
