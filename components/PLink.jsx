// components/PLink.jsx — next/link with one difference: no automatic prefetch for pages that are rendered on the server per request.
//
// Why: <Link> prefetches every link that scrolls into view. For a server-rendered page with no loading.js, that prefetch is a request
// that runs a server function, is not cacheable, and comes back as a ~200-byte empty stub — it preloads nothing. The calendar alone
// has 365 such day links in its year view, and every public page's nav has more, so each visit caused dozens to hundreds of useless
// function invocations. Pages that are static (e.g. /ekadashi/kamada, /tyohar/diwali) are still prefetched exactly as before — they
// come from the CDN for free and make navigation instant. Pass `prefetch` explicitly on a link to override this.
import Link from 'next/link';

// the public pages that read ?query params / "today" and therefore render per request (see the "ƒ" routes in `next build`),
// plus /calendar (static, but each month page is large — not worth preloading from every nav link)
const DYNAMIC_INDEX = new Set(['/panchang', '/rashifal', '/calendar', '/tyohar', '/ekadashi', '/pradosh', '/purnima', '/amavasya', '/sankashti']);
const DYNAMIC_CHILD = /^\/(panchang|rashifal)\/[^/]+$|^\/calendar\/\d{4}(\/\d{1,2})?$/;   // /panchang/<date>, /rashifal/<sign>, /calendar/<year>/<month> (static, but a full page of data per link)

export function isDynamicPublicPath(href) {
  const raw = typeof href === 'string' ? href : (href && href.pathname) || '';
  const path = raw.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  return DYNAMIC_INDEX.has(path) || DYNAMIC_CHILD.test(path);
}

export default function PLink({ href, prefetch, ...props }) {
  return <Link href={href} prefetch={prefetch ?? (isDynamicPublicPath(href) ? false : undefined)} {...props} />;
}
