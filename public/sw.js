// public/sw.js
//
// Luckfixer 2.0 — MINIMAL "wrapper" service worker
//
// The whole point of this PWA is to be a thin installable shell around
// the live website — NOT an offline-capable cached app. It intentionally
// does not cache pages, API responses, or assets. This guarantees that
// every time the site is deployed (new features, bug fixes), users
// see the update immediately the next time they open the app — no
// stale cached HTML/JS, no manual "clear cache" instructions needed.
//
// Vercel's CDN already handles static asset caching/performance at the
// edge; adding a second service-worker cache layer here would only risk
// serving outdated content after a deploy, which is exactly what we
// want to avoid.

const SW_VERSION = 'luckfixer-v1';

self.addEventListener('install', () => {
  // Activate the new service worker immediately, don't wait for old
  // tabs/instances to close first — ensures updates roll out fast.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Defensive cleanup: remove any caches from a possible earlier
      // version of this service worker (we don't create any ourselves,
      // but this guards against leftover caches if a future version
      // ever adds one and later removes it again).
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== SW_VERSION).map((k) => caches.delete(k)));
      await self.clients.claim(); // take control of already-open tabs right away
    })()
  );
});

// Pure network pass-through — every request goes straight to the network,
// always fetching the current live version. No offline fallback by design.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
