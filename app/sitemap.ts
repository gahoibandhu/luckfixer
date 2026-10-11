import { MetadataRoute } from 'next';
import { RASHIS } from '@/lib/public-content';
import { BRAND } from '@/lib/brand';

// Every public (no-login) page. Daily pages change every day; guides rarely.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = BRAND.site;
  const now = new Date();
  const daily = ['/', '/panchang', '/rashifal', '/gita-shlok', '/aaj-ka-upay'];
  const guides = ['/tyohar', '/vrat', '/aarti'];
  const stable = ['/tyohar', '/vrat', '/aarti', '/tools', '/meri-rashi', '/moolank', '/sade-sati', '/manglik', '/vrat-calendar', '/ram-shalaka', '/rashi', '/about', '/privacy', '/terms', '/login'];
  return [
    ...daily.map((p, i) => ({ url: base + (p === '/' ? '' : p), lastModified: now, changeFrequency: 'daily' as const, priority: p === '/' ? 1 : 0.9 - i * 0.02 })),
    ...stable.map(p => ({ url: base + p, lastModified: now, changeFrequency: 'monthly' as const, priority: p === '/login' ? 0.5 : 0.7 })),
    ...guides.map(p => ({ url: base + p, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...['ekadashi', 'purnima', 'amavasya', 'pradosh', 'shraddh'].map(s => ({ url: `${base}/vrat/${s}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 })),
    ...['hanuman-chalisa', 'ganesh-aarti', 'om-jai-jagdish-hare', 'shiv-aarti', 'hanuman-aarti', 'lakshmi-aarti', 'durga-aarti', 'santoshi-mata-aarti'].map(s => ({ url: `${base}/aarti/${s}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 })),
    ...RASHIS.map(r => ({ url: `${base}/rashi/${r.slug}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.6 })),
    ...RASHIS.map(r => ({ url: `${base}/rashifal/${r.slug}`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.8 })),
    ...['ekadashi', 'purnima', 'amavasya', 'pradosh', 'shraddh'].map(v => ({ url: `${base}/vrat/${v}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 })),
    ...['hanuman-chalisa', 'ganesh-aarti', 'om-jai-jagdish-hare', 'shiv-aarti', 'hanuman-aarti', 'lakshmi-aarti', 'durga-aarti', 'santoshi-mata-aarti'].map(a => ({ url: `${base}/aarti/${a}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 })),
    ...Array.from({ length: 9 }, (_, i) => ({ url: `${base}/moolank/${i + 1}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.6 })),
  ];
}
