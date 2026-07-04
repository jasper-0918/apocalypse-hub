export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { verifyWorkink, verifyLinkvertise } from '@/lib/keyproviders';

// POST { token, wtoken?, hash? }
// Called by the /get-key/return page after the user returns from the provider.
//  - Work.ink:    proves completion with wtoken (validated via isValid).
//  - Linkvertise: proves completion with hash (validated against the token).
//  - Lootlabs:    verified out-of-band by the postback; this just reports status.
export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const token = body.token;
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const supabase = createServerClient();
  const { data: unlock } = await supabase
    .from('key_unlocks')
    .select('id, provider, status')
    .eq('token', token)
    .maybeSingle();

  if (!unlock) return NextResponse.json({ error: 'Unknown token' }, { status: 404 });
  if (unlock.status === 'verified' || unlock.status === 'claimed') {
    return NextResponse.json({ verified: true });
  }

  let ok = false;
  if (unlock.provider === 'workink') {
    ok = (await verifyWorkink(String(body.wtoken || ''))).valid;
  } else if (unlock.provider === 'linkvertise') {
    ok = await verifyLinkvertise(String(body.hash || ''));
  } else {
    // Lootlabs (or others): only the server postback can mark it verified.
    return NextResponse.json({ verified: false, pending: true });
  }

  if (!ok) return NextResponse.json({ verified: false }, { status: 403 });

  const { data: updated } = await supabase
    .from('key_unlocks')
    .update({ status: 'verified', verified_at: new Date().toISOString() })
    .eq('id', unlock.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  return NextResponse.json({ verified: !!updated });
}
