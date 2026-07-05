import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const RICH_COLUMNS =
  'id, name, slug, description, game, games, view_count, is_protected, created_at, owner_id, users!scripts_owner_id_fkey(username)';
const LEGACY_COLUMNS =
  'id, name, description, game, is_protected, created_at, owner_id, users!scripts_owner_id_fkey(username)';

// Public: List all published scripts (no auth required)
export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  const game = req.nextUrl.searchParams.get('game');
  const search = req.nextUrl.searchParams.get('search');
  const sort = req.nextUrl.searchParams.get('sort'); // 'trending' | 'recent' (default)
  const limitParam = Number(req.nextUrl.searchParams.get('limit')) || 100;

  const build = (columns: string, orderCol: string) => {
    let q = supabase
      .from('scripts')
      .select(columns)
      .eq('is_published', true)
      .order(orderCol, { ascending: false })
      .limit(Math.min(limitParam, 200));
    if (game) q = q.ilike('game', game);
    if (search) q = q.or(`name.ilike.%${search}%,description.ilike.%${search}%,game.ilike.%${search}%`);
    return q;
  };

  const orderCol = sort === 'trending' ? 'view_count' : 'created_at';

  // Try the rich column set (post-migration-014); fall back to legacy so the
  // catalog never 500s during the window before the migration is applied.
  let { data: scripts, error } = await build(RICH_COLUMNS, orderCol);
  if (error) {
    ({ data: scripts } = await build(LEGACY_COLUMNS, 'created_at'));
  }

  const formatted = (scripts || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    slug: s.slug || s.id,
    description: s.description,
    game: s.game || 'Universal',
    games: Array.isArray(s.games) && s.games.length ? s.games : [s.game || 'Universal'],
    view_count: s.view_count ?? 0,
    is_protected: s.is_protected,
    created_at: s.created_at,
    owner_username: s.users?.username || 'Unknown',
  }));

  return NextResponse.json(formatted);
}
