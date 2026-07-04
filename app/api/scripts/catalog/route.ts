import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Public: List all published scripts (no auth required)
export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  const game = req.nextUrl.searchParams.get('game');
  const search = req.nextUrl.searchParams.get('search');

  let query = supabase
    .from('scripts')
    .select('id, name, description, game, category, is_protected, created_at, owner_id, users!scripts_owner_id_fkey(username)')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(100);

  if (game) {
    query = query.ilike('game', game);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,game.ilike.%${search}%`);
  }

  const { data: scripts } = await query;

  const formatted = (scripts || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    game: s.game || 'Universal',
    category: s.category || 'general',
    is_protected: s.is_protected,
    created_at: s.created_at,
    owner_username: s.users?.username || 'Unknown',
  }));

  return NextResponse.json(formatted);
}
