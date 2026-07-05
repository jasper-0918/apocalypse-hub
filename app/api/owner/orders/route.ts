export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

function isStaff(role?: string) {
  return role === 'OWNER' || role === 'ADMIN';
}

// GET: all payment orders (newest first) for review.
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data } = await supabase
    .from('payment_orders')
    .select('*, users(username, email)')
    .order('created_at', { ascending: false })
    .limit(200);

  const formatted = (data ?? []).map((o: any) => ({
    ...o,
    username: o.users?.username ?? 'Unknown',
    email: o.users?.email ?? '',
    users: undefined,
  }));
  return NextResponse.json(formatted);
}

// PATCH: approve or reject an order { id, action: 'approve' | 'reject' }.
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

  // Only act on a still-pending order (prevents double-applying).
  const { data: order } = await supabase
    .from('payment_orders')
    .select('*')
    .eq('id', id)
    .eq('status', 'pending')
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: 'Order not found or already processed' }, { status: 404 });
  }

  if (action === 'approve') {
    if (order.kind === 'scripter') {
      await supabase.from('users').update({ plan: 'SCRIPTER' }).eq('id', order.user_id);
    } else if (order.kind === 'slots') {
      const { data: u } = await supabase
        .from('users')
        .select('extra_slot_packs')
        .eq('id', order.user_id)
        .single();
      await supabase
        .from('users')
        .update({ extra_slot_packs: (u?.extra_slot_packs ?? 0) + 1 })
        .eq('id', order.user_id);
    }
  }

  await supabase
    .from('payment_orders')
    .update({ status: action === 'approve' ? 'approved' : 'rejected', processed_at: new Date().toISOString() })
    .eq('id', id);

  return NextResponse.json({ ok: true });
}
