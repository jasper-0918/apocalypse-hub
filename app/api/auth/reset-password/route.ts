export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createServerClient } from '@/lib/supabase/server';
import { hashPassword } from '@/lib/auth';
import { resetPasswordSchema } from '@/lib/validators';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

// POST { token, password } -> redeem a reset link and set a new password.
// The token is single-use and expires; redeeming it also marks the email
// verified (receiving the email proves ownership).
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`reset:${ip}`, 10, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait a few minutes and try again.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { token, password } = parsed.data;
  const tokenHash = createHash('sha256').update(token).digest('hex');

  const supabase = createServerClient();
  const { data: user } = await supabase
    .from('users')
    .select('id, reset_expires')
    .eq('reset_token', tokenHash)
    .maybeSingle();

  if (!user || !user.reset_expires || new Date(user.reset_expires) < new Date()) {
    return NextResponse.json(
      { error: 'This reset link is invalid or has expired. Request a new one.' },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(password);
  await supabase
    .from('users')
    .update({
      password_hash: passwordHash,
      reset_token: null,
      reset_expires: null,
      email_verified: true,
    })
    .eq('id', user.id);

  return NextResponse.json({ ok: true });
}
