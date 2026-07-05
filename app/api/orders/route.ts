export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

const ORDER_KINDS: Record<string, { label: string; amountUsd: number }> = {
  scripter: { label: 'Scripter Plan (30 days)', amountUsd: 5 },
  slots: { label: '+50 Script Slots', amountUsd: 10 },
};

const METHODS = ['gcash', 'paypal', 'wise', 'bank'];

// GET: the signed-in user's payment orders.
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerClient();
  const { data } = await supabase
    .from('payment_orders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return NextResponse.json(data ?? []);
}

// POST: submit a payment claim { kind, method, reference, note }.
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const kind = body.kind;
  const method = (body.method || '').toLowerCase();
  const reference = (body.reference || '').toString().trim().slice(0, 120);
  const note = (body.note || '').toString().trim().slice(0, 300);

  if (!ORDER_KINDS[kind]) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }
  if (!METHODS.includes(method)) {
    return NextResponse.json({ error: 'Choose a payment method' }, { status: 400 });
  }
  if (!reference) {
    return NextResponse.json({ error: 'Enter your payment reference / transaction number' }, { status: 400 });
  }

  const supabase = createServerClient();

  // Prevent stacking duplicate pending orders of the same kind.
  const { count: existing } = await supabase
    .from('payment_orders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('kind', kind)
    .eq('status', 'pending');
  if ((existing ?? 0) > 0) {
    return NextResponse.json(
      { error: 'You already have a pending order for this. Wait for it to be reviewed.' },
      { status: 409 }
    );
  }

  const { data: order, error } = await supabase
    .from('payment_orders')
    .insert({
      user_id: user.id,
      kind,
      label: ORDER_KINDS[kind].label,
      amount_usd: ORDER_KINDS[kind].amountUsd,
      method,
      reference,
      note: note || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error || !order) {
    return NextResponse.json({ error: 'Could not submit order' }, { status: 500 });
  }

  return NextResponse.json({
    order,
    message: 'Payment submitted! It will be activated once the owner confirms your payment.',
  });
}
