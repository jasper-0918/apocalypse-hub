export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { isProvider, verifyLootlabsSecret } from '@/lib/keyproviders';

// Server-to-server postback (used by Lootlabs). Configure in the Lootlabs panel
// (Advanced tab) as:
//   https://YOURSITE/api/keys/callback/lootlabs?click_id={click_id}&ip={ip}&unique_id={unique_id}&secret=<LOOTLABS_POSTBACK_SECRET>
// The user's link must carry &puid=<our token>, which Lootlabs echoes as click_id.
async function handle(req: NextRequest, provider: string) {
  if (!isProvider(provider)) {
    return NextResponse.json({ error: 'Unknown provider' }, { status: 404 });
  }

  const q = req.nextUrl.searchParams;
  // click_id = our unlock token (passed to Lootlabs as puid).
  const token = q.get('click_id') || q.get('token') || q.get('puid');
  const secret = q.get('secret');

  if (provider === 'lootlabs' && !verifyLootlabsSecret(secret)) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }
  if (!token) {
    return NextResponse.json({ error: 'Missing click_id' }, { status: 400 });
  }

  const supabase = createServerClient();

  // Advance pending -> verified for this provider only. Never resurrect a
  // claimed token (prevents replay).
  const { data: updated } = await supabase
    .from('key_unlocks')
    .update({ status: 'verified', verified_at: new Date().toISOString() })
    .eq('token', token)
    .eq('provider', provider)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  // Always 200 so the provider doesn't retry a resolved/unknown token forever.
  return NextResponse.json({ ok: true, verified: !!updated });
}

export async function GET(req: NextRequest, { params }: { params: { provider: string } }) {
  return handle(req, params.provider);
}
export async function POST(req: NextRequest, { params }: { params: { provider: string } }) {
  return handle(req, params.provider);
}
