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
//
// ONE deliberate exception: a single static offline.html (this file
// never changes, so caching it carries none of the staleness risk
// above). When the device has no network at all, the browser's own
// generic "This site can't be reached" page would otherwise show
// instead — replacing it with a branded page here is a pure UX win
// with no update-freshness trade-off.

const SW_VERSION = 'luckfixer-v2';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SW_VERSION).then((cache) => cache.add(OFFLINE_URL))
  );
  // Activate the new service worker immediately, don't wait for old
  // tabs/instances to close first — ensures updates roll out fast.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Remove caches from any earlier service-worker version —
      // keeps only the current offline-page cache around.
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== SW_VERSION).map((k) => caches.delete(k)));
      await self.clients.claim(); // take control of already-open tabs right away
    })()
  );
});

// Pure network pass-through for everything — every request goes
// straight to the network, always fetching the current live version.
// The ONLY fallback is for page navigations that fail outright (no
// network reachable at all): those get the cached offline.html
// instead of the browser's default error page. API calls, assets,
// etc. still fail normally with no interception — the app's own
// existing loading/error UI handles those cases.
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }
  event.respondWith(fetch(event.request));
});

