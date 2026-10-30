// components/PLink.jsx — next/link that never preloads on its own.
//
// Next.js preloads every <Link> that scrolls into view, and it does so in several pieces: ONE link costs about SIX requests. A public page
// has 20–60 links, so just opening /moolank or /rashi and scrolling made ~100 requests (measured in a real browser: 118 on /moolank,
// 130 on /rashi, 97–109 of them preloads of pages nobody opened). Some of those preloads also run a server function (pages that render per
// request, and the login proxy for /chat, /kundli …) and they use the visitor's mobile data.
//
// Without preloading, a click fetches the next page on demand — one or two requests, from the CDN, and it is only spent on the page the
// visitor actually opens. Every <Link> on the site goes through this component; pass `prefetch` explicitly on a link to override.
import Link from 'next/link';

export default function PLink({ prefetch, intent, ...props }) {   // `intent` was an earlier option; accepted and ignored so older call sites keep working
  return <Link prefetch={prefetch ?? false} {...props} />;
}
