export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { reactionIdentity, fetchReactionState, ReactionKind } from '@/lib/reactions';

const KINDS: ReactionKind[] = ['like', 'dislike', 'favorite'];

// POST: toggle a reaction { kind: 'like'|'dislike'|'favorite', anon?: string }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const kind = body.kind as ReactionKind;
  if (!KINDS.includes(kind)) {
    return NextResponse.json({ error: 'Invalid reaction' }, { status: 400 });
  }

  const user = await getUserFromRequest(req);
  const identity = reactionIdentity(user?.id ?? null, body.anon ?? null);
  if (!identity) {
    return NextResponse.json({ error: 'Missing identity' }, { status: 400 });
  }

  const supabase = createServerClient();
  const scriptId = params.id;

  // Is this reaction already set?
  const { data: existing } = await supabase
    .from('script_reactions')
    .select('id')
    .eq('script_id', scriptId)
    .eq('identity', identity)
    .eq('kind', kind)
    .maybeSingle();

  if (existing) {
    // Toggle off.
    await supabase.from('script_reactions').delete().eq('id', existing.id);
  } else {
    // like/dislike are mutually exclusive — clear the opposite first.
    if (kind === 'like' || kind === 'dislike') {
      const opposite = kind === 'like' ? 'dislike' : 'like';
      await supabase
        .from('script_reactions')
        .delete()
        .eq('script_id', scriptId)
        .eq('identity', identity)
        .eq('kind', opposite);
    }
    await supabase.from('script_reactions').insert({ script_id: scriptId, identity, kind });
  }

  const state = await fetchReactionState(supabase, scriptId, identity);
  return NextResponse.json(state);
}
