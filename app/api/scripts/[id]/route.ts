export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/utils';
import { pingIndexNow } from '@/lib/indexnow';
import { isStaff } from '@/lib/plans';
import { linkScriptToActiveKeys } from '@/lib/keys';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerClient();

  const { data: script } = await supabase
    .from('scripts')
    .select('owner_id')
    .eq('id', params.id)
    .single();

  if (!script) {
    return NextResponse.json({ error: 'Script not found' }, { status: 404 });
  }

  if ((script as any).owner_id !== user.id && !isStaff(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await supabase.from('scripts').delete().eq('id', params.id);

  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerClient();

  const { data: script } = await supabase
    .from('scripts')
    .select('owner_id')
    .eq('id', params.id)
    .single();

  if (!script) {
    return NextResponse.json({ error: 'Script not found' }, { status: 404 });
  }

  if ((script as any).owner_id !== user.id && !isStaff(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const updates: Record<string, any> = {};

    if (body.isPublished !== undefined) updates.is_published = body.isPublished;
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.thumbnailUrl !== undefined) updates.thumbnail_url = body.thumbnailUrl || null;
    if (Array.isArray(body.games)) {
      const games = Array.from(
        new Set(body.games.map((g: any) => (typeof g === 'string' ? g.trim() : '')).filter(Boolean))
      ).slice(0, 20) as string[];
      if (games.length) {
        updates.games = games;
        updates.game = games[0];
      }
    } else if (body.game !== undefined) {
      updates.game = body.game;
      updates.games = [body.game];
    }

    const { data: updated } = await supabase
      .from('scripts')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    // When publishing, link every active key to this script (paged + bulk).
    if (body.isPublished === true) {
      if (updated) await linkScriptToActiveKeys(supabase, updated.id);

      // Ask search engines to (re)crawl the now-public page and its listings.
      if (updated) {
        const gList = Array.isArray(updated.games) && updated.games.length
          ? updated.games
          : [updated.game || 'Universal'];
        const paths = new Set<string>(['/', `/script/${updated.slug || updated.id}`]);
        for (const g of gList) if (g) paths.add(`/game/${slugify(String(g))}`);
        await pingIndexNow(Array.from(paths));
      }
    }

    return NextResponse.json(updated || { success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerClient();
  const { data: script } = await supabase
    .from('scripts')
    .select('id, name, description, is_protected, is_published, game, created_at, updated_at, owner_id')
    .eq('id', params.id)
    .single();

  if (!script) {
    return NextResponse.json({ error: 'Script not found' }, { status: 404 });
  }

  if ((script as any).owner_id !== user.id && !isStaff(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(script);
}
