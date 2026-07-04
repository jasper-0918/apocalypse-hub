export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { PROVIDERS, isProvider, buildGateUrl, generateUnlockToken } from '@/lib/keyproviders';

// POST: begin a gated unlock. Creates a single-use token and returns the
// provider gate URL the user must complete before a key can be claimed.
export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* body optional */
  }

  const provider = body.provider;
  if (!isProvider(provider)) {
    return NextResponse.json(
      { error: `Unknown provider. Use one of: ${Object.keys(PROVIDERS).join(', ')}` },
      { status: 400 }
    );
  }

  const scriptId = body.scriptId || null;
  const sessionId = body.sessionId || req.headers.get('x-session-id') || null;
  const authUser = await getUserFromRequest(req);

  if (!authUser && !sessionId) {
    return NextResponse.json({ error: 'Session identifier required' }, { status: 400 });
  }

  const token = generateUnlockToken();
  const supabase = createServerClient();

  const { error } = await supabase.from('key_unlocks').insert({
    token,
    script_id: scriptId,
    provider,
    user_id: authUser?.id ?? null,
    session_id: sessionId,
    status: 'pending',
  });

  if (error) {
    return NextResponse.json({ error: 'Could not start unlock' }, { status: 500 });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin || 'http://localhost:3000';
  const gateUrl = await buildGateUrl(provider, token, baseUrl);

  return NextResponse.json({
    token,
    provider,
    gateUrl, // null if the provider link isn't configured yet
    configured: gateUrl !== null,
  });
}
