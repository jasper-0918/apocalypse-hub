import type { MetadataRoute } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { getGameSummaries } from '@/lib/scripts-server';
import { selectAll } from '@/lib/paginate';
import { SITE_URL } from '@/lib/seo';

// Regenerate at most hourly so newly published scripts appear without a redeploy.
export const revalidate = 3600;

// Served at /sitemap.xml. Lists the public marketing/browse pages plus every
// published script detail page so search engines can discover them all.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/trending`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/discover`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/rules`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/get-key`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
  ];

  let scripts: any[] = [];
  try {
    const supabase = createServerClient();
    // Page through every published script (PostgREST caps a single call at ~1000).
    scripts = await selectAll((from, to) =>
      supabase
        .from('scripts')
        .select('id, slug, updated_at, created_at')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .range(from, to)
    );
    if (scripts.length === 0) {
      // Pre-migration fallback (no slug column yet).
      scripts = await selectAll((from, to) =>
        supabase
          .from('scripts')
          .select('id, created_at')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .range(from, to)
      );
    }
  } catch {
    scripts = [];
  }

  const scriptRoutes: MetadataRoute.Sitemap = scripts.map((s) => ({
    url: `${SITE_URL}/script/${s.slug || s.id}`,
    lastModified: new Date(s.updated_at || s.created_at || now),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  let gameRoutes: MetadataRoute.Sitemap = [];
  try {
    const games = await getGameSummaries();
    gameRoutes = games.map((g) => ({
      url: `${SITE_URL}/game/${g.slug}`,
      lastModified: new Date(g.lastModified || now),
      changeFrequency: 'weekly',
      priority: 0.6,
    }));
  } catch {
    gameRoutes = [];
  }

  return [...staticRoutes, ...gameRoutes, ...scriptRoutes];
}
