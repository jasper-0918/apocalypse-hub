export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createServerClient } from '@/lib/supabase/server';
import { hashPassword, bumpTokenVersion } from '@/lib/auth';
import { resetPasswordSchema } from '@/lib/validators';
import { getClientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit';
import { sendPasswordChangedEmail } from '@/lib/email';

// POST { token, password } -> redeem a reset link and set a new password.
// The token is single-use and expires; redeeming it also marks the email
// verified (receiving the email proves ownership).
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`reset:${ip}`, 10, 15 * 60 * 1000);
  if (!rl.ok) return tooManyRequests(rl.retryAfter, 'Too many attempts. Please wait a few minutes and try again.');

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
    .select('id, email, reset_expires')
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

  // Cut off any sessions opened with the old password. Separate + best-effort so
  // it can't fail the reset if migration 018 (token_version) isn't applied yet.
  await bumpTokenVersion(user.id);

  sendPasswordChangedEmail(user.email).catch(() => {});

  return NextResponse.json({ ok: true });
}
