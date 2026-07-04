export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { createHash } from 'crypto';
import { obfuscateLua, generateLoadstringSnippet } from '@/lib/obfuscator';
import { PLAN_LIMITS } from '@/lib/stripe';
import { scriptUploadSchema } from '@/lib/validators';

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerClient();
  const { data: dbUser } = await supabase
    .from('users')
    .select('plan')
    .eq('id', user.id)
    .single();

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const limit = PLAN_LIMITS[dbUser.plan] ?? 0;
  if (limit === 0) {
    return NextResponse.json(
      { error: 'Free accounts cannot store scripts. Upgrade to Pro or higher.' },
      { status: 403 }
    );
  }

  const { count: scriptCount } = await supabase
    .from('scripts')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', user.id);

  if ((scriptCount ?? 0) >= limit) {
    return NextResponse.json(
      { error: `Your ${dbUser.plan} plan allows a maximum of ${limit} scripts.` },
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
    const game = body.game || 'Universal';
    const category = body.category || 'general';
    const isPublished = body.isPublished ?? false;
    const obfuscatedHash = createHash('sha256').update(content).digest('hex');
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://apocalypsehub.com';

    const { data: script, error } = await supabase
      .from('scripts')
      .insert({
        name,
        description,
        original_content: content,
        obfuscated_hash: obfuscatedHash,
        is_protected: true,
        is_published: isPublished,
        game,
        category,
        owner_id: user.id,
      })
      .select()
      .single();

    if (error) {
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
    .select('id, name, description, is_protected, is_published, game, category, created_at, updated_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  return NextResponse.json(scripts || []);
}
