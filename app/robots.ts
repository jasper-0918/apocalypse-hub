import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

// Served at /robots.txt. Let crawlers index public pages; keep private/app
// and API routes out of the index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard',
          '/admin',
          '/owner',
          '/get-key/return',
          '/login',
          '/register',
          '/verify',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
