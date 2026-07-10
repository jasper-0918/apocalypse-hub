import { getDiscoverInitial } from '@/lib/scripts-server';
import { DISCOVER_PAGE_SIZE } from '@/lib/list-config';
import { SITE_URL, collectionPageJsonLd } from '@/lib/seo';
import { DiscoverClient } from './discover-client';

// ISR. Server-renders the default view (popular, page 1) so the HTML carries
// real /script/<slug> links; the client takes over for search/sort/paging.
// Do NOT read searchParams here — it would make the route dynamic. The client
// reads ?sort/?q/?page/?size after hydration and refetches when they're set.
export const revalidate = 300;

export default async function DiscoverPage() {
  const { scripts, total } = await getDiscoverInitial(DISCOVER_PAGE_SIZE);

  // Describes the first page of the catalog (what's actually in this HTML).
  const jsonLd = collectionPageJsonLd({
    name: 'Discover Roblox Scripts',
    url: `${SITE_URL}/discover`,
    description: 'Browse thousands of free Roblox scripts, sorted by popular or latest.',
    items: scripts,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DiscoverClient initialScripts={scripts} initialTotal={total} />
    </>
  );
}
