// app/api/icon/route.js
//
// Same-origin icon proxy — fixes a common, hard-to-diagnose PWA
// installability blocker: manifest.json icons hosted on a third-party
// CDN (Cloudinary in our case) can silently fail Chrome's install
// criteria checks if that CDN doesn't send permissive CORS headers,
// because Chrome fetches manifest icons in a mode that respects CORS
// (unlike a plain <img> tag, which doesn't need CORS to just display).
//
// By proxying the logo through our own domain, the manifest icon URL
// becomes same-origin (https://luckfixer.jaigahoi.in/api/icon), which
// sidesteps any CORS restriction entirely — the browser never needs
// cross-origin permission because the request never leaves our origin
// from the browser's point of view; we fetch server-side instead,
// where CORS doesn't apply.

const SOURCE_URL = 'https://res.cloudinary.com/dtcrife6i/image/upload/v1781362788/new-project-28_1709384728_m3doei.jpg';

export async function GET() {
  try {
    const res = await fetch(SOURCE_URL);
    if (!res.ok) {
      return new Response('Icon not found', { status: 404 });
    }
    const buffer = await res.arrayBuffer();
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (e) {
    return new Response('Icon fetch failed', { status: 502 });
  }
}
