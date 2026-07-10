export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { IMPORT_SOURCE } from '@/lib/import-scripts';
import { cachedJson } from '@/lib/http';

// Public: the imported community catalog (scripts brought in from ScriptBlox).
// These are real, published, key-gated scripts, so cards link to /script/<slug>
// and unlocking them credits the owner — same as any upload.
export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  const sort = req.nextUrl.searchParams.get('sort') === 'latest' ? 'latest' : 'popular';
  const search = req.nextUrl.searchParams.get('search')?.trim();
  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit')) || 40, 1), 60);
  const page = Math.max(Number(req.nextUrl.searchParams.get('page')) || 1, 1);
  const from = (page - 1) * limit;

  let q = supabase
    .from('scripts')
    .select(
      'id, name, slug, game, games, thumbnail_url, view_count, is_protected, created_at, owner_id, users!scripts_owner_id_fkey(username)',
      { count: 'exact' }
    )
    .eq('is_published', true)
    .eq('external_source', IMPORT_SOURCE);

  if (search) q = q.or(`name.ilike.%${search}%,game.ilike.%${search}%`);

  q =
    sort === 'latest'
      ? q.order('created_at', { ascending: false })
      : q.order('view_count', { ascending: false });

  const { data, error, count } = await q.range(from, from + limit - 1);
  if (error) {
    // Column/table missing (migration not applied) — degrade to empty, not 500.
    return NextResponse.json({ scripts: [], total: 0 });
  }

  const scripts = (data || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    slug: s.slug || s.id,
    game: s.game || 'Universal',
    games: Array.isArray(s.games) && s.games.length ? s.games : [s.game || 'Universal'],
    thumbnail_url: s.thumbnail_url ?? null,
    view_count: s.view_count ?? 0,
    is_protected: !!s.is_protected,
    created_at: s.created_at,
    owner_username: s.users?.username || undefined,
  }));

  return cachedJson({ scripts, total: count ?? scripts.length });
}
