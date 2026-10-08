import { getRecentScripts, getGameSummaries, getPopularImported } from '@/lib/scripts-server';
import { HomeClient, type GameLink } from './home-client';

// ISR: the homepage is public, read-only data. Server-rendering the first page
// of the catalog puts real /script/<slug> links in the HTML (internal linking +
// crawlability) and removes three client round-trips on first paint.
// Do NOT read searchParams here — that would make the route dynamic and
// uncacheable. The client reads ?search= from the URL after hydration.
// Hourly, not every 5 min: on Hobby each stale hit by a crawler is a rebuild,
// and rebuilds put the team over its Active CPU and ISR write limits (Oct 2026).
export const revalidate = 3600;

export default async function HomePage() {
  const [scripts, games, discover] = await Promise.all([
    getRecentScripts(),
    getGameSummaries(),
    getPopularImported(8),
  ]);

  // The API returns games sorted by script count (desc); keep the top 10.
  const gameLinks: GameLink[] = games
    .slice(0, 10)
    .map((g) => ({ slug: g.slug, name: g.name, count: g.count }));

  return <HomeClient initialScripts={scripts} initialGames={gameLinks} initialDiscover={discover} />;
}
