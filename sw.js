/* Service worker — Briefing du Matin
   Cache de l'app shell (index.html, manifest.json, icon.svg) pour un
   démarrage instantané et un mode hors-ligne.
   data.json : réseau d'abord (données fraîches), cache en secours (hors-ligne).
   Les requêtes externes (replieurs CORS) ne sont jamais mises en cache. */

const CACHE = "briefing-matin-v3";
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

  if (url.origin !== self.location.origin) return; // réseau uniquement

  // data.json : toujours le réseau en premier (fraîcheur), cache si hors-ligne
  if (url.pathname.endsWith("/data.json")) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }))
    );
    return;
  }

  // App shell : cache d'abord, réseau en secours
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) =>
      hit ||
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() =>
        req.mode === "navigate" ? caches.match("./index.html") : Response.error()
      )
    )
  );
});
