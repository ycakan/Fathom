/*
 * Fathom service worker.
 *
 * Strategy: network-first with a cache fallback. Online launches always get
 * the freshest deploy from GitHub Pages (and refresh the cache as they go);
 * offline launches are served entirely from the cache.
 */
const CACHE = "fathom-v1";

const SHELL = [
  ".",
  "index.html",
  "style.css",
  "manifest.webmanifest",
  "js/state.js",
  "js/creatures.js",
  "js/aquarium.js",
  "js/timer.js",
  "js/shop.js",
  "js/app.js",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
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
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // keep the offline copy fresh
        if (res.ok && new URL(e.request.url).origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request, { ignoreSearch: true }).then((hit) => {
          if (hit) return hit;
          if (e.request.mode === "navigate") return caches.match("index.html");
          return Response.error();
        })
      )
  );
});
