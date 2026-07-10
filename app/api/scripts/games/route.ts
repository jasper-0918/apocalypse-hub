export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getGameSummaries } from '@/lib/scripts-server';
import { cachedJson } from '@/lib/http';

// Public: distinct games that actually have published scripts, with a slug and
// count. Used to render homepage "browse by game" links that never 404.
export async function GET() {
  try {
    const games = await getGameSummaries();
    // The game list barely changes, so cache it a bit longer at the edge.
    return cachedJson(
      games.map((g) => ({ slug: g.slug, name: g.name, count: g.count })),
      300,
      600
    );
  } catch {
    return NextResponse.json([]);
  }
}
