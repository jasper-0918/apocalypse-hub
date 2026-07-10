import { getDiscoverInitial } from '@/lib/scripts-server';
import { DISCOVER_PAGE_SIZE } from '@/lib/list-config';
import { DiscoverClient } from './discover-client';

// ISR. Server-renders the default view (popular, page 1) so the HTML carries
// real /script/<slug> links; the client takes over for search/sort/paging.
// Do NOT read searchParams here — it would make the route dynamic. The client
// reads ?sort/?q/?page/?size after hydration and refetches when they're set.
export const revalidate = 300;

export default async function DiscoverPage() {
  const { scripts, total } = await getDiscoverInitial(DISCOVER_PAGE_SIZE);
  return <DiscoverClient initialScripts={scripts} initialTotal={total} />;
}
