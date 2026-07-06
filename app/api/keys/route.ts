export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { generateKeyValue, getKeyExpiry } from '@/lib/keygen';
import { deleteExpiredKeys } from '@/lib/keys';
import { earningsForCompletion, UNIQUE_COMPLETION_WINDOW_HOURS } from '@/lib/earnings';
import { isGateEnforced } from '@/lib/keyproviders';

// POST: Claim a key (works for both authenticated and anonymous users)
export async function POST(req: NextRequest) {
  const supabase = createServerClient();

  let userId: string | null = null;
  let sessionId: string | null = null;
  let userPlan = 'FREE';

  // Which script the user was unlocking (for per-completion creator earnings).
  let scriptId =
    req.nextUrl.searchParams.get('scriptId') ||
    req.nextUrl.searchParams.get('script') ||
    null;
  let provider = req.nextUrl.searchParams.get('provider');
  const token = req.nextUrl.searchParams.get('token');

  const authUser = await getUserFromRequest(req);
  if (authUser) {
    userId = authUser.id;
    userPlan = authUser.plan || 'FREE';
  } else {
    const body = await req.json().catch(() => ({} as any));
    sessionId = body.sessionId || req.headers.get('x-session-id');
    if (!sessionId) {
      return NextResponse.json({ error: 'Session identifier required' }, { status: 400 });
    }
  }

  // ---- Anti-bypass gate: require a provider-verified, single-use token ----
  if (isGateEnforced()) {
    if (!token) {
      return NextResponse.json(
        { error: 'Complete the key system to unlock a key.' },
        { status: 403 }
      );
    }
    const { data: unlock } = await supabase
      .from('key_unlocks')
      .select('*')
      .eq('token', token)
      .eq('status', 'verified')
      .maybeSingle();

    const belongsToClaimer =
      !!unlock &&
      ((userId && unlock.user_id === userId) || (sessionId && unlock.session_id === sessionId));

    if (!unlock || !belongsToClaimer) {
      return NextResponse.json(
        { error: 'Key system not completed or already used. Please go through the link again.' },
        { status: 403 }
      );
    }

    // Consume the token (single use). 0 rows updated => already claimed.
    const { data: consumed } = await supabase
      .from('key_unlocks')
      .update({ status: 'claimed', claimed_at: new Date().toISOString() })
      .eq('id', unlock.id)
      .eq('status', 'verified')
      .select('id')
      .maybeSingle();

    if (!consumed) {
      return NextResponse.json(
        { error: 'This unlock was already used. Please go through the link again.' },
        { status: 403 }
      );
    }

    // Trust the token's attribution over any client-supplied query params.
    scriptId = unlock.script_id || scriptId;
    provider = unlock.provider || provider;
  }

  // Resolve key expiry hours: Scripter/Developer can configure their own
  let expiryHours = 12;
  if (userId && userPlan === 'SCRIPTER') {
    const { data: userRow } = await supabase
      .from('users')
      .select('key_expiry_hours')
      .eq('id', userId)
      .maybeSingle();
    if (userRow?.key_expiry_hours) expiryHours = userRow.key_expiry_hours;
  }

  const now = new Date().toISOString();

  // Auto-purge every expired key so nothing stale lingers in the system.
  await deleteExpiredKeys(supabase);

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

  // Mint a fresh key on demand for this claimer — no daily pool, no admin
  // action required. Each successful claim creates exactly one active key.
  const { data: activatedKey, error: mintError } = await supabase
    .from('keys')
    .insert({
      value: generateKeyValue(),
      expires_at: getKeyExpiry(expiryHours),
      is_active: true,
      is_used: false,
      assigned_to: userId,
      claimed_by_session: sessionId,
      activated_at: now,
    })
    .select()
    .single();

  if (mintError || !activatedKey) {
    return NextResponse.json(
      { error: 'Could not generate a key. Please try again in a moment.' },
      { status: 503 }
    );
  }

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

  // ---- Credit the creator for this key-system completion ----
  // Attributed to the specific script the user was unlocking. Self-completions
  // (a creator unlocking their own script) do not earn, to prevent farming.
  if (scriptId) {
    const { data: script } = await supabase
      .from('scripts')
      .select('id, owner_id, completion_count')
      .eq('id', scriptId)
      .eq('is_published', true)
      .maybeSingle();

    if (script && script.owner_id && script.owner_id !== userId) {
      // Uniqueness: only earn once per (script, viewer) within the window.
      const windowStart = new Date(
        Date.now() - UNIQUE_COMPLETION_WINDOW_HOURS * 3600 * 1000
      ).toISOString();
      let dupQuery = supabase
        .from('script_completions')
        .select('id', { count: 'exact', head: true })
        .eq('script_id', script.id)
        .gte('created_at', windowStart);
      dupQuery = userId
        ? dupQuery.eq('claimer_user_id', userId)
        : dupQuery.eq('claimer_session', sessionId);
      const { count: recentDup } = await dupQuery;

      if (!recentDup) {
        const { data: owner } = await supabase
          .from('users')
          .select('lifetime_earnings_usd')
          .eq('id', script.owner_id)
          .maybeSingle();

        const { gross, commission, net } = earningsForCompletion(
          Number(owner?.lifetime_earnings_usd ?? 0)
        );

        await supabase.from('script_completions').insert({
          script_id: script.id,
          owner_id: script.owner_id,
          claimer_user_id: userId,
          claimer_session: sessionId,
          provider,
          gross_usd: gross,
          commission_usd: commission,
          net_usd: net,
        });

        await supabase
          .from('scripts')
          .update({ completion_count: (script.completion_count ?? 0) + 1 })
          .eq('id', script.id);

        await supabase.rpc('credit_creator_earnings', {
          p_user_id: script.owner_id,
          p_net: net,
        });
      }
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
