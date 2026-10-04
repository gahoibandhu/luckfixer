// lib/rate-limit.js — tiny in-memory limiter for the public (no-login) API routes.
// Per server instance and best-effort only (serverless instances don't share memory) — it stops casual abuse
// of the ephemeris service; real protection would be an edge/WAF rule or a shared store.
const buckets = globalThis.__lfBuckets || (globalThis.__lfBuckets = new Map());
export function rateLimit(key, max = 20, windowMs = 60_000) {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter(t => now - t < windowMs);
  if (hits.length >= max) { buckets.set(key, hits); return false; }
  hits.push(now); buckets.set(key, hits);
  if (buckets.size > 5000) buckets.delete(buckets.keys().next().value);
  return true;
}
export const clientIp = (req) => (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'anon';
