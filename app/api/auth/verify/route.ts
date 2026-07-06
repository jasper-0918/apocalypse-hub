export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createSessionToken } from '@/lib/auth';
import { generateCode, sendVerificationEmail, isEmailConfigured } from '@/lib/email';
import { getClientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit';

// POST { email, code } -> verify the code and log the user in.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`verify:${ip}`, 20, 10 * 60 * 1000);
  if (!rl.ok) return tooManyRequests(rl.retryAfter, 'Too many attempts. Please wait a few minutes and try again.');

  const body = await req.json().catch(() => ({}));
  const email = (body.email || '').toString().trim().toLowerCase();
  const code = (body.code || '').toString().trim();

  if (!email || !code) {
    return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: user } = await supabase
    .from('users')
    .select('id, email, username, role, plan, email_verified, verification_code, verification_expires')
    .eq('email', email)
    .maybeSingle();

  if (!user) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  if (user.email_verified) {
    return NextResponse.json({ error: 'This email is already verified. Please log in.' }, { status: 400 });
  }
  if (!user.verification_code || user.verification_code !== code) {
    return NextResponse.json({ error: 'Incorrect code' }, { status: 400 });
  }
  if (user.verification_expires && new Date(user.verification_expires) < new Date()) {
    return NextResponse.json({ error: 'Code expired. Request a new one.' }, { status: 400 });
  }

  await supabase
    .from('users')
    .update({ email_verified: true, verification_code: null, verification_expires: null })
    .eq('id', user.id);

  const sessionUser = { id: user.id, email: user.email, username: user.username, role: user.role, plan: user.plan };
  const token = await createSessionToken(sessionUser);
  const response = NextResponse.json({ token, user: sessionUser });
  response.cookies.set('ah_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return response;
}

// PATCH { email } -> resend a fresh code.
export async function PATCH(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`verify-resend:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.ok) return tooManyRequests(rl.retryAfter);
  if (!isEmailConfigured()) {
    return NextResponse.json({ error: 'Email is not configured' }, { status: 503 });
  }
  const body = await req.json().catch(() => ({}));
  const email = (body.email || '').toString().trim().toLowerCase();
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  const supabase = createServerClient();
  const { data: user } = await supabase
    .from('users')
    .select('id, email_verified')
    .eq('email', email)
    .maybeSingle();

  if (!user || user.email_verified) {
    // Don't reveal account state; pretend success.
    return NextResponse.json({ ok: true });
  }

  const code = generateCode();
  const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  await supabase
    .from('users')
    .update({ verification_code: code, verification_expires: expires })
    .eq('id', user.id);
  await sendVerificationEmail(email, code);

  return NextResponse.json({ ok: true });
}
