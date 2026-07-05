export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { reactionIdentity, fetchReactionState } from '@/lib/reactions';

const RICH =
  'id, name, slug, description, game, games, thumbnail_url, view_count, is_protected, is_published, created_at, updated_at, owner_id, users!scripts_owner_id_fkey(username)';
const LEGACY =
  'id, name, description, game, is_protected, is_published, created_at, updated_at, owner_id, users!scripts_owner_id_fkey(username)';

// Public: full detail for a single published script, by slug (or id fallback).
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const supabase = createServerClient();
  const slug = decodeURIComponent(params.slug);

  const lookup = async (columns: string) => {
    // Try slug first, then treat the param as a raw id.
    let { data } = await supabase.from('scripts').select(columns).eq('slug', slug).maybeSingle();
    if (!data) {
      ({ data } = await supabase.from('scripts').select(columns).eq('id', slug).maybeSingle());
    }
    return data as any;
  };

  let script: any = null;
  try {
    script = await lookup(RICH);
  } catch {
    script = null;
  }
  if (!script) {
    // Fall back for the pre-migration window (no slug/games columns yet).
    script = await lookup(LEGACY);
  }

  if (!script || !script.is_published) {
    return NextResponse.json({ error: 'Script not found' }, { status: 404 });
  }

  // Count the view (best-effort, non-blocking on failure).
  supabase.rpc('increment_script_view', { p_script_id: script.id }).then(() => {}, () => {});

  // Resolve the caller's reaction state (logged-in or anon).
  const user = await getUserFromRequest(req);
  const anonId = req.nextUrl.searchParams.get('anon');
  const identity = reactionIdentity(user?.id ?? null, anonId);
  let reactions;
  try {
    reactions = await fetchReactionState(supabase, script.id, identity);
  } catch {
    reactions = { likes: 0, dislikes: 0, favorites: 0, me: { like: false, dislike: false, favorite: false } };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
  const games =
    Array.isArray(script.games) && script.games.length ? script.games : [script.game || 'Universal'];

  return NextResponse.json({
    id: script.id,
    name: script.name,
    slug: script.slug || script.id,
    description: script.description || '',
    game: script.game || games[0],
    games,
    thumbnail_url: script.thumbnail_url ?? null,
    view_count: (script.view_count ?? 0) + 1,
    is_protected: script.is_protected,
    created_at: script.created_at,
    updated_at: script.updated_at,
    owner_username: script.users?.username || 'Unknown',
    loadstring: `loadstring(game:HttpGet("${baseUrl}/api/scripts/serve/${script.id}?key=YOUR_KEY_HERE"))()`,
    reactions,
  });
}
