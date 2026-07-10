// Central SEO constants. SITE_URL must be the absolute, canonical origin
// (no trailing slash) — used by metadata, sitemap, robots and JSON-LD.
// Set NEXT_PUBLIC_BASE_URL in Vercel to your real domain when you have one.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_BASE_URL || 'https://apocalypsebloxhub.vercel.app'
).replace(/\/+$/, '');

export const SITE_NAME = 'Apocalypse Blox Hub';

export const SITE_DESCRIPTION =
  'Apocalypse Blox Hub is a Roblox script hub — browse free scripts and loaders for popular games, unlock them with a quick key system, and copy the loadstring straight into your executor.';

/**
 * CollectionPage + ItemList structured data for a page that lists scripts
 * (game landing pages, /trending, /discover). Tells search engines the page is
 * a curated list and which script URLs it points at.
 *
 * Does NOT emit a BreadcrumbList — the `<Breadcrumbs>` component already does
 * that wherever it's rendered, and duplicating it is worse than omitting it.
 */
export function collectionPageJsonLd({
  name,
  url,
  description,
  items,
  max = 50,
}: {
  name: string;
  url: string;
  description?: string;
  items: { slug: string; name: string }[];
  max?: number;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    url,
    ...(description ? { description } : {}),
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.slice(0, max).map((s, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE_URL}/script/${s.slug}`,
        name: s.name,
      })),
    },
  };
}
