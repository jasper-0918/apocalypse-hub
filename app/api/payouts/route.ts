export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { computeWithdrawal, MIN_PAYOUT_USD } from '@/lib/earnings';

// GET: list the creator's payout requests.
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerClient();
  const { data } = await supabase
    .from('payout_requests')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return NextResponse.json(data ?? []);
}

// POST: request a withdrawal in USD or Robux.
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const currency = body.currency === 'ROBUX' ? 'ROBUX' : 'USD';
  const amountUsd = Number(body.amountUsd);
  const destination = (body.destination || '').toString().slice(0, 200);

  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return NextResponse.json({ error: 'Enter a valid amount' }, { status: 400 });
  }
  if (amountUsd < MIN_PAYOUT_USD) {
    return NextResponse.json(
      { error: `Minimum withdrawal is $${MIN_PAYOUT_USD.toFixed(2)}.` },
      { status: 400 }
    );
  }
  if (!destination) {
    return NextResponse.json(
      { error: currency === 'ROBUX' ? 'Enter your Roblox username' : 'Enter your PayPal email' },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Atomically deduct from balance; fails if insufficient funds.
  const { data: ok, error: debitError } = await supabase.rpc('debit_creator_balance', {
    p_user_id: user.id,
    p_amount: amountUsd,
  });

  if (debitError) {
    return NextResponse.json({ error: 'Could not process withdrawal' }, { status: 500 });
  }
  if (!ok) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
  }

  const { feeUsd, netUsd, robuxAmount } = computeWithdrawal(amountUsd, currency);

  const { data: payout, error } = await supabase
    .from('payout_requests')
    .insert({
      user_id: user.id,
      currency,
      amount_usd: amountUsd,
      fee_usd: feeUsd,
      net_usd: netUsd,
      robux_amount: robuxAmount,
      destination,
      status: 'pending',
    })
    .select()
    .single();

  if (error || !payout) {
    // Refund balance only (not lifetime) if the request row failed to persist.
    // A negative debit adds the amount back without touching lifetime earnings.
    await supabase.rpc('debit_creator_balance', { p_user_id: user.id, p_amount: -amountUsd });
    return NextResponse.json({ error: 'Could not create payout request' }, { status: 500 });
  }

  return NextResponse.json({
    payout,
    message:
      currency === 'ROBUX'
        ? `Requested ${robuxAmount} Robux. Paid out manually after review.`
        : `Requested $${netUsd.toFixed(2)} (after $${feeUsd.toFixed(2)} fee). Paid out manually after review.`,
  });
}
