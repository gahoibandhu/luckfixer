// app/api/icon/route.js
//
// Same-origin icon proxy — fixes a common, hard-to-diagnose PWA
// installability blocker: manifest.json icons hosted on a third-party
// CDN (Cloudinary in our case) can silently fail Chrome's install
// criteria checks if that CDN doesn't send permissive CORS headers.
// By proxying the logo through our own domain, the manifest icon URL
// becomes same-origin.
//
// ALSO fixes a second, more important installability blocker: the
// original source photo's real pixel dimensions don't necessarily
// match what manifest.json declares (192x192 / 512x512). Chrome/Android
// validate actual icon dimensions during the install check — if the
// "512x512" entry doesn't actually decode to at least 512x512, install
// criteria can silently fail with no visible error to the user. We now
// resize server-side with sharp so every requested size is pixel-exact.

import sharp from 'sharp';

const SOURCE_URL = 'https://res.cloudinary.com/dtcrife6i/image/upload/v1781362788/new-project-28_1709384728_m3doei.jpg';
const VALID_SIZES = [192, 512];

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const requested = parseInt(searchParams.get('size') || '512', 10);
  const size = VALID_SIZES.includes(requested) ? requested : 512;

  try {
    const res = await fetch(SOURCE_URL);
    if (!res.ok) {
      return new Response('Icon not found', { status: 404 });
    }
    const buffer = Buffer.from(await res.arrayBuffer());

    // fit: 'cover' crops to a perfect square at the exact requested size —
    // guarantees the served image always matches the manifest's declared
    // sizes exactly, regardless of the source photo's original dimensions.
    const resized = await sharp(buffer)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toBuffer();

    return new Response(resized, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (e) {
    return new Response('Icon fetch failed', { status: 502 });
  }
}
