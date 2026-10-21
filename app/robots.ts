import { MetadataRoute } from 'next';
import { BRAND } from '@/lib/brand';

// Crawl budget. A few pages generate links to every combination of view / year / month / filter / date / city, which is an
// endless set of URLs that all show the same content (every one is a full, uncached server render). Well-behaved crawlers
// are asked to skip those variants. The plain pages — /calendar, /calendar/<year>/<month>, /panchang, /panchang/YYYY-MM-DD, /rashifal,
// /rashifal/<sign> — stay crawlable. Nothing here changes what a visitor sees.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/api/',
        '/calendar?',        // old query-string calendar links (they redirect to /calendar/<year>/<month>)
        '/calendar/ics',     // downloadable files — for people, not crawlers
        '/panchang?',        // city / date form results
        '/panchang/*?',      // a day page with a ?city= variant
        '/rashifal?',        // ?d= date variants
        '/rashifal/*?',
      ],
    },
    sitemap: `${BRAND.site}/sitemap.xml`,
  };
}
