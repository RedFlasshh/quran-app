/* Understanding the Quran — service worker: offline-capable app shell.
   Strategy:
   - App shell & Next.js assets: cache-first, so the app opens with NO network.
   - Supabase / API calls: network-first (never cached — always fresh data).
   - Navigations offline: fall back to the cached app shell.
*/

// Every production build stamps a real Next.js build ID in here automatically
// (see scripts/inject-sw-version.mjs, wired into `npm run build`) — this
// literal only matters for local `next dev`, where that script never runs.
const CACHE = "quran-app-v1";
const APP_SHELL = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];
const NAV_TIMEOUT_MS = 2500; // don't let a slow/flaky connection hang the launch — fall back to cache quickly

function fetchWithTimeout(req, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("nav-timeout")), ms);
    fetch(req).then(
      (res) => { clearTimeout(timer); resolve(res); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL).catch(() => {}))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

function isApiRequest(url) {
  return (
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("supabase.in") ||
    url.pathname.startsWith("/auth") ||
    url.pathname.startsWith("/rest") ||
    url.pathname.includes("/functions/")
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  if (isApiRequest(url)) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetchWithTimeout(req, NAV_TIMEOUT_MS)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/")))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
