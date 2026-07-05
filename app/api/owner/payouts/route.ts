export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

function isStaff(role?: string) {
  return role === 'OWNER' || role === 'ADMIN';
}

// GET: all creator payout requests (newest first).
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data } = await supabase
    .from('payout_requests')
    .select('*, users(username, email)')
    .order('created_at', { ascending: false })
    .limit(200);

  const formatted = (data ?? []).map((p: any) => ({
    ...p,
    username: p.users?.username ?? 'Unknown',
    email: p.users?.email ?? '',
    users: undefined,
  }));
  return NextResponse.json(formatted);
}

// PATCH: { id, action: 'approve' | 'reject' }.
// approve -> mark paid (you've sent the money). reject -> refund the creator's balance.
export async function PATCH(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const id = body.id;
  const action = body.action;
  if (!id || (action !== 'approve' && action !== 'reject')) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: payout } = await supabase
    .from('payout_requests')
    .select('*')
    .eq('id', id)
    .eq('status', 'pending')
    .maybeSingle();

  if (!payout) {
    return NextResponse.json({ error: 'Payout not found or already processed' }, { status: 404 });
  }

  if (action === 'reject') {
    // Refund the amount that was debited when the request was created.
    // Negative debit adds it back without touching lifetime earnings.
    await supabase.rpc('debit_creator_balance', {
      p_user_id: payout.user_id,
      p_amount: -Number(payout.amount_usd),
    });
  }

  await supabase
    .from('payout_requests')
    .update({ status: action === 'approve' ? 'paid' : 'rejected', processed_at: new Date().toISOString() })
    .eq('id', id);

  return NextResponse.json({ ok: true });
}
