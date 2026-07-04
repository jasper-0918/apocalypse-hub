export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { generateKeyValue, getKeyExpiry } from '@/lib/keygen';

// POST: Claim a key (works for both authenticated and anonymous users)
export async function POST(req: NextRequest) {
  const supabase = createServerClient();

  let userId: string | null = null;
  let sessionId: string | null = null;
  let userPlan = 'FREE';

  const authUser = await getUserFromRequest(req);
  if (authUser) {
    userId = authUser.id;
    userPlan = authUser.plan || 'FREE';
  } else {
    const body = await req.json();
    sessionId = body.sessionId || req.headers.get('x-session-id');
    if (!sessionId) {
      return NextResponse.json({ error: 'Session identifier required' }, { status: 400 });
    }
  }

  // Resolve key expiry hours: Scripter/Developer can configure their own
  let expiryHours = 12;
  if (userId && (userPlan === 'SCRIPTER' || userPlan === 'DEVELOPER')) {
    const { data: userRow } = await supabase
      .from('users')
      .select('key_expiry_hours')
      .eq('id', userId)
      .maybeSingle();
    if (userRow?.key_expiry_hours) expiryHours = userRow.key_expiry_hours;
  }

  const now = new Date().toISOString();
  const today = new Date().toISOString().split('T')[0];

  // Block only if there is a currently ACTIVE (non-expired) key
  if (userId) {
    const { data: activeKey } = await supabase
      .from('keys')
      .select('id, expires_at')
      .eq('assigned_to', userId)
      .eq('is_active', true)
      .gt('expires_at', now)
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeKey) {
      return NextResponse.json(
        { error: `You already have an active key. It expires at ${new Date(activeKey.expires_at).toLocaleString()}.` },
        { status: 429 }
      );
    }
  } else if (sessionId) {
    const { data: activeKey } = await supabase
      .from('keys')
      .select('id, expires_at')
      .eq('claimed_by_session', sessionId)
      .eq('is_active', true)
      .gt('expires_at', now)
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeKey) {
      return NextResponse.json(
        { error: `You already have an active key. It expires at ${new Date(activeKey.expires_at).toLocaleString()}.` },
        { status: 429 }
      );
    }
  }

  // Get or auto-generate today's pool
  let { data: pool } = await supabase
    .from('daily_key_pools')
    .select('id')
    .eq('date', today)
    .eq('generated', true)
    .maybeSingle();

  if (!pool) {
    const keyValues = Array.from({ length: 100 }, () => generateKeyValue());
    const createdKeys: any[] = [];
    for (const value of keyValues) {
      const { data: key } = await supabase
        .from('keys')
        .insert({ value, expires_at: getKeyExpiry(), is_active: false, is_used: false })
        .select()
        .single();
      if (key) createdKeys.push(key);
    }
    const { data: newPool } = await supabase
      .from('daily_key_pools')
      .upsert({ date: today, generated: true }, { onConflict: 'date' })
      .select()
      .single();
    if (newPool) {
      pool = newPool;
      for (const key of createdKeys) {
        await supabase.from('daily_key_pool_keys').insert({ pool_id: newPool.id, key_id: key.id });
      }
    }
  }

  if (!pool) {
    return NextResponse.json(
      { error: 'Key pool unavailable. Try again in a moment.' },
      { status: 503 }
    );
  }

  const { data: poolKeys } = await supabase
    .from('daily_key_pool_keys')
    .select('key_id')
    .eq('pool_id', pool.id);

  if (!poolKeys || poolKeys.length === 0) {
    return NextResponse.json(
      { error: 'All keys for today have been claimed. Come back tomorrow!' },
      { status: 503 }
    );
  }

  const keyIds = poolKeys.map((pk: any) => pk.key_id);

  const { data: availableKey } = await supabase
    .from('keys')
    .select('*')
    .in('id', keyIds)
    .is('assigned_to', null)
    .eq('is_active', false)
    .limit(1)
    .single();

  if (!availableKey) {
    return NextResponse.json(
      { error: 'All keys for today have been claimed. Come back tomorrow!' },
      { status: 503 }
    );
  }

  const { data: activatedKey } = await supabase
    .from('keys')
    .update({
      assigned_to: userId,
      claimed_by_session: sessionId,
      is_active: true,
      activated_at: new Date().toISOString(),
      expires_at: getKeyExpiry(expiryHours),
    })
    .eq('id', availableKey.id)
    .select()
    .single();

  await supabase.from('key_requests').insert({
    user_id: userId,
    fulfilled: true,
    key_id: activatedKey?.id,
  });

  // Link this key to all published scripts (universal key)
  const { data: publishedScripts } = await supabase
    .from('scripts')
    .select('id')
    .eq('is_published', true);

  if (publishedScripts && activatedKey) {
    for (const script of publishedScripts) {
      await supabase
        .from('script_keys')
        .insert({ script_id: script.id, key_id: activatedKey.id })
        .select();
    }
  }

  return NextResponse.json({
    key: activatedKey?.value,
    expiresAt: activatedKey?.expires_at,
    message: `Key claimed! Valid for ${expiryHours} hours.`,
  });
}

// GET: List user's keys (authenticated only)
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerClient();
  const { data: keys } = await supabase
    .from('keys')
    .select('*')
    .eq('assigned_to', user.id)
    .order('created_at', { ascending: false });

  return NextResponse.json(keys || []);
}
