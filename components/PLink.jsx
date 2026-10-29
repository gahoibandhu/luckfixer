'use client';
// components/PLink.jsx — next/link that does not spend a request per link on every page view.
//
// Next.js preloads every <Link> that scrolls into view. On this site that was the biggest repeat cost per page view:
// each public page has ~19 chrome links (logo, 9 menu items, search, 9 footer links), and each preload is a request to the CDN or
// a function. /search alone is a 54 KB payload (the whole library is embedded in it) fetched on every single page view.
//
//   • server-rendered pages (/panchang, /rashifal, /tyohar …): the preload is a ~200-byte empty stub that still runs a function → never preloaded.
//   • heavy static pages (/search, /calendar, /calendar/<y>/<m>) and links marked `intent` (the logo, menu and footer): preloaded only
//     when the visitor shows intent — hovers (desktop) or touches (phone) the link — so the next page is still ready by the time of the
//     click, but only for links somebody is actually about to use.
//   • every other link keeps Next.js's normal behaviour.
// Pass `prefetch` explicitly to override any of this.
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// public pages that read ?query params / "today" and therefore render per request (see the "ƒ" routes in `next build`)
const DYNAMIC_INDEX = new Set(['/panchang', '/rashifal', '/tyohar', '/ekadashi', '/pradosh', '/purnima', '/amavasya', '/sankashti']);
const DYNAMIC_CHILD = /^\/(panchang|rashifal)\/[^/]+$/;                    // /panchang/<date>, /rashifal/<sign>
const HEAVY_STATIC = new Set(['/search', '/calendar']);
const HEAVY_CHILD = /^\/calendar\/\d{4}(\/\d{1,2})?$/;                      // /calendar/<year>/<month>

const pathOf = (href) => {
  const raw = typeof href === 'string' ? href : (href && href.pathname) || '';
  return raw.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
};

/** 'off' | 'intent' | 'auto' — what a link to this href gets when the caller has not chosen. */
export function linkMode(href, intent = false) {
  const p = pathOf(href);
  if (DYNAMIC_INDEX.has(p) || DYNAMIC_CHILD.test(p)) return 'off';
  if (intent || HEAVY_STATIC.has(p) || HEAVY_CHILD.test(p)) return 'intent';
  return 'auto';
}

export default function PLink({ href, prefetch, intent = false, onMouseEnter, onTouchStart, ...props }) {
  const router = useRouter();
  if (prefetch !== undefined && prefetch !== null) return <Link href={href} prefetch={prefetch} onMouseEnter={onMouseEnter} onTouchStart={onTouchStart} {...props} />;
  const mode = linkMode(href, intent);
  if (mode === 'auto') return <Link href={href} onMouseEnter={onMouseEnter} onTouchStart={onTouchStart} {...props} />;
  if (mode === 'off') return <Link href={href} prefetch={false} onMouseEnter={onMouseEnter} onTouchStart={onTouchStart} {...props} />;
  const warm = () => { try { router.prefetch(typeof href === 'string' ? href : (href.pathname || '/')); } catch { /* prefetching is only a speed-up */ } };
  return (
    <Link href={href} prefetch={false} {...props}
      onMouseEnter={(e) => { if (onMouseEnter) onMouseEnter(e); warm(); }}
      onTouchStart={(e) => { if (onTouchStart) onTouchStart(e); warm(); }} />
  );
}
