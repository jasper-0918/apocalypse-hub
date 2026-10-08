export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/utils';
import { pingIndexNow } from '@/lib/indexnow';
import { isStaff } from '@/lib/plans';
import { linkScriptToActiveKeys } from '@/lib/keys';

// Public pages that show this script. Script and game pages are cached for a
// day (ISR), so an edit or delete refreshes them here instead of waiting.
function publicPaths(s: { id: string; slug?: string | null; game?: string | null; games?: string[] | null }): string[] {
  const gList = Array.isArray(s.games) && s.games.length ? s.games : [s.game || 'Universal'];
  const paths = ['/', `/script/${s.slug || s.id}`];
  for (const g of gList) if (g) paths.push(`/game/${slugify(String(g))}`);
  return paths;
}

function revalidateAll(paths: string[]) {
  Array.from(new Set(paths)).forEach((p) => revalidatePath(p));
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerClient();

  const { data: script } = await supabase
    .from('scripts')
    .select('id, owner_id, slug, game, games')
    .eq('id', params.id)
    .single();

  if (!script) {
    return NextResponse.json({ error: 'Script not found' }, { status: 404 });
  }

  if ((script as any).owner_id !== user.id && !isStaff(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await supabase.from('scripts').delete().eq('id', params.id);
  revalidateAll(publicPaths(script as any));

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
    .select('id, owner_id, slug, game, games')
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

    // Old and new pages both: a game change moves the script between listings.
    if (updated) revalidateAll(publicPaths(script as any).concat(publicPaths(updated)));

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
