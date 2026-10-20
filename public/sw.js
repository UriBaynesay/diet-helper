// Service worker for the installed app. Deliberately tiny and deliberately dumb:
//
//   - It exists so the app installs cleanly and so that, with no network, opening the
//     app shows a friendly page instead of the browser's own error.
//   - It caches ONLY the offline page and the icons.
//   - It NEVER caches (or even looks at) /api/*, POSTs, or any signed-in page: every
//     page of this app is personal data rendered by the server, and a copy of it must
//     never be served from a cache to whoever holds the phone next.
//
// Bump VERSION when this file's behaviour or the precached files change: a different
// cache name makes the old cache get deleted on activate.
const VERSION = "v1";
const CACHE = `diet-helper-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Only page navigations, only GET. Everything else (API calls, scripts, images,
  // form posts) goes straight to the network as if this worker did not exist.
  if (request.mode !== "navigate" || request.method !== "GET") return;

  // Network first: online, the app behaves exactly as without a worker. Only when the
  // network is unreachable does the person see the offline page.
  event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL).then((cached) => cached ?? Response.error())));
});
