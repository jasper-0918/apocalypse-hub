export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';
import { createServerClient } from '@/lib/supabase/server';
import { forgotPasswordSchema } from '@/lib/validators';
import { isEmailConfigured, sendPasswordResetEmail } from '@/lib/email';
import { getClientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit';
import { SITE_URL } from '@/lib/seo';

// POST { email } -> if the account exists, email a password-reset link.
// Always responds the same way so it can't be used to discover which emails
// have accounts (no user enumeration).
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`forgot:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.ok) return tooManyRequests(rl.retryAfter);

  const body = await req.json().catch(() => ({}));
  const parsed = forgotPasswordSchema.safeParse(body);
  const ok = NextResponse.json({ ok: true });
  if (!parsed.success || !isEmailConfigured()) return ok;

  const email = parsed.data.email.trim().toLowerCase();
  const supabase = createServerClient();
  const { data: user } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', email)
    .maybeSingle();

  // Don't reveal whether the account exists.
  if (!user) return ok;

  // Store only a hash of the token; the raw token lives only in the emailed link.
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  await supabase
    .from('users')
    .update({ reset_token: tokenHash, reset_expires: expires })
    .eq('id', user.id);

  const link = `${SITE_URL}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail(user.email, link);

  return ok;
}
