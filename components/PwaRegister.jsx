'use client';
// components/PwaRegister.jsx
//
// Registers the minimal service worker (see public/sw.js) so the site
// can be "Added to Home Screen" as an installable app. The service
// worker itself does no caching — it's purely there to satisfy PWA
// installability requirements while guaranteeing every visit always
// loads the live, currently-deployed site (no stale cached version).

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Non-fatal — app works fine as a regular website even if SW
      // registration fails (e.g. unsupported browser, blocked by user).
    });
  }, []);

  return null;
}
