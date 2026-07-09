export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { selectAll } from '@/lib/paginate';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'OWNER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerClient();
  // Load the whole catalog (paged past the ~1000-row cap) so the admin page's
  // search + pager can reach every script, not just the most recent 200.
  const scripts = await selectAll((from, to) =>
    supabase
      .from('scripts')
      .select('id, name, slug, description, is_protected, is_published, game, view_count, created_at, owner_id, users!scripts_owner_id_fkey(username)')
      .order('created_at', { ascending: false })
      .range(from, to)
  );

  const formatted = (scripts || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    slug: s.slug || s.id,
    description: s.description,
    is_protected: s.is_protected,
    is_published: s.is_published,
    game: s.game,
    view_count: s.view_count ?? 0,
    created_at: s.created_at,
    owner_username: s.users?.username || 'Unknown',
  }));

  return NextResponse.json(formatted);
}
