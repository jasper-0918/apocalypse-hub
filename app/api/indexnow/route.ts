export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { getGameSummaries } from '@/lib/scripts-server';
import { pingIndexNow } from '@/lib/indexnow';

// Admin-only: submit every public page (home, browse pages, all game pages, all
// published scripts) to IndexNow in one shot. Handy for a brand-new site or
// after a big content change, to get everything crawled without waiting.
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'OWNER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const paths = new Set<string>(['/', '/trending', '/rules', '/pricing', '/get-key']);

  try {
    const games = await getGameSummaries();
    for (const g of games) paths.add(`/game/${g.slug}`);
  } catch {
    /* still submit whatever we have */
  }

  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('scripts')
      .select('id, slug')
      .eq('is_published', true)
      .limit(5000);
    for (const s of (data as any[]) || []) paths.add(`/script/${s.slug || s.id}`);
  } catch {
    /* still submit whatever we have */
  }

  const result = await pingIndexNow(Array.from(paths));
  return NextResponse.json(result);
}
