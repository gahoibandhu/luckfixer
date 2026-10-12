// app/api/icon/route.js — kept so phones that installed the old app (manifest pointed here) keep getting an icon.
// The real files are static: /brand/icon-192.png and /brand/icon-512.png.
export async function GET(req) {
  const size = parseInt(new URL(req.url).searchParams.get('size') || '512', 10);
  return Response.redirect(new URL(`/brand/icon-${size <= 192 ? 192 : 512}.png`, req.url), 308);
}
