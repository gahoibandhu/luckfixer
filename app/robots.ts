import { MetadataRoute } from 'next';
import { BRAND } from '@/lib/brand';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/'],
    },
    sitemap: `${BRAND.site}/sitemap.xml`,
  };
}
