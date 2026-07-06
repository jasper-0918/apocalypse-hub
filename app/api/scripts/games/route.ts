export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getGameSummaries } from '@/lib/scripts-server';

// Public: distinct games that actually have published scripts, with a slug and
// count. Used to render homepage "browse by game" links that never 404.
export async function GET() {
  try {
    const games = await getGameSummaries();
    return NextResponse.json(
      games.map((g) => ({ slug: g.slug, name: g.name, count: g.count }))
    );
  } catch {
    return NextResponse.json([]);
  }
}
