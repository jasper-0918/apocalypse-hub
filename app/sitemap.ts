import type { MetadataRoute } from 'next';
import { createServerClient } from '@/lib/supabase/server';
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
    { url: `${SITE_URL}/rules`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/get-key`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
  ];

  let scripts: any[] = [];
  try {
    const supabase = createServerClient();
    const rich = await supabase
      .from('scripts')
      .select('id, slug, updated_at, created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(5000);
    let data: any[] | null = rich.data as any[] | null;
    if (rich.error || !data) {
      // Pre-migration fallback (no slug column yet).
      const legacy = await supabase
        .from('scripts')
        .select('id, created_at')
        .eq('is_published', true)
        .limit(5000);
      data = legacy.data as any[] | null;
    }
    scripts = data || [];
  } catch {
    scripts = [];
  }

  const scriptRoutes: MetadataRoute.Sitemap = scripts.map((s) => ({
    url: `${SITE_URL}/script/${s.slug || s.id}`,
    lastModified: new Date(s.updated_at || s.created_at || now),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticRoutes, ...scriptRoutes];
}
