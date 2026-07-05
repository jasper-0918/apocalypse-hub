export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { createHash } from 'crypto';
import { obfuscateLua, generateLoadstringSnippet } from '@/lib/obfuscator';
import { effectiveScriptLimit } from '@/lib/plans';
import { scriptUploadSchema } from '@/lib/validators';
import { buildScriptSlug } from '@/lib/utils';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerClient();
  const { data: dbUser } = await supabase
    .from('users')
    .select('plan, extra_slot_packs')
    .eq('id', user.id)
    .single();

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const limit = effectiveScriptLimit(dbUser.plan, dbUser.extra_slot_packs ?? 0);

  const { count: scriptCount } = await supabase
    .from('scripts')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', user.id);

  if ((scriptCount ?? 0) >= limit) {
    const upsell =
      dbUser.plan === 'SCRIPTER'
        ? 'Buy another +50 slot pack to upload more.'
        : 'Upgrade to Scripter (50 scripts) to upload more.';
    return NextResponse.json(
      { error: `You've reached your limit of ${limit} scripts. ${upsell}` },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const parsed = scriptUploadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, description, content } = parsed.data;

    // Supported games: accept an array (new UI) and fall back to the single
    // `game` field for older clients. The first game is stored as the primary.
    const rawGames: string[] = Array.isArray(body.games) ? body.games : [];
    const games = Array.from(
      new Set(
        rawGames
          .map((g) => (typeof g === 'string' ? g.trim() : ''))
          .filter(Boolean)
      )
    ).slice(0, 20);
    if (games.length === 0) games.push((body.game || 'Universal').trim() || 'Universal');
    const game = games[0];

    const isPublished = body.isPublished ?? false;
    const obfuscatedHash = createHash('sha256').update(content).digest('hex');
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://apocalypsehub.com';
    const slug = buildScriptSlug(name, randomUUID());

    const baseRow = {
      name,
      description,
      original_content: content,
      obfuscated_hash: obfuscatedHash,
      is_protected: true,
      is_published: isPublished,
      game,
      slug,
      owner_id: user.id,
    };

    // Try inserting with the multi-game array; if the `games` column doesn't
    // exist yet (migration 014 not applied), fall back to the base row so
    // uploads keep working during the migration window.
    let { data: script, error } = await supabase
      .from('scripts')
      .insert({ ...baseRow, games })
      .select()
      .single();

    if (error) {
      ({ data: script, error } = await supabase
        .from('scripts')
        .insert(baseRow)
        .select()
        .single());
    }

    if (error || !script) {
      return NextResponse.json({ error: 'Failed to create script' }, { status: 500 });
    }

    // If published, link all currently active keys to this script
    if (isPublished) {
      const { data: activeKeys } = await supabase
        .from('keys')
        .select('id')
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString());

      if (activeKeys) {
        for (const key of activeKeys) {
          await supabase.from('script_keys').upsert({
            script_id: script.id,
            key_id: key.id,
          }, { onConflict: 'script_id,key_id' });
        }
      }
    }

    return NextResponse.json({
      id: script.id,
      name: script.name,
      slug: script.slug,
      loadstring: generateLoadstringSnippet(script.id, baseUrl),
      message: 'Script uploaded and protected successfully.',
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// GET: List user's own scripts (authenticated)
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerClient();
  const { data: scripts } = await supabase
    .from('scripts')
    .select('id, name, slug, description, is_protected, is_published, game, games, view_count, created_at, updated_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  return NextResponse.json(scripts || []);
}
