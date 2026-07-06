export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createSessionToken } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { loginSchema } from '@/lib/validators';
import { getClientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit';
import { isEmailConfigured, sendLoginAlertEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = rateLimit(`login:${ip}`, 10, 5 * 60 * 1000);
    if (!rl.ok) return tooManyRequests(rl.retryAfter, 'Too many login attempts. Please wait a few minutes and try again.');

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const user = await authenticateUser(email, password);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Block sign-in until the email is verified. Keep this select minimal so a
    // not-yet-applied migration column can never make it error and bypass the gate.
    const supabase = createServerClient();
    const { data: row } = await supabase
      .from('users')
      .select('email_verified')
      .eq('id', user.id)
      .maybeSingle();
    if (row && row.email_verified === false) {
      return NextResponse.json(
        { error: 'Please verify your email first.', needsVerification: true, email: user.email },
        { status: 403 }
      );
    }

    // New-IP sign-in alert + last-login tracking. Best-effort: no-ops if migration
    // 019 isn't applied yet, and never blocks or fails the login. Skips the very
    // first login (no baseline IP).
    try {
      const { data: seen } = await supabase
        .from('users')
        .select('last_login_ip')
        .eq('id', user.id)
        .maybeSingle();
      const lastIp = (seen as any)?.last_login_ip;
      if (isEmailConfigured() && lastIp && lastIp !== ip) {
        const userAgent = req.headers.get('user-agent') || 'Unknown device';
        sendLoginAlertEmail(user.email, { ip, when: new Date().toUTCString(), userAgent }).catch(() => {});
      }
      await supabase
        .from('users')
        .update({ last_login_ip: ip, last_login_at: new Date().toISOString() })
        .eq('id', user.id);
    } catch {
      /* login tracking is optional */
    }

    const token = await createSessionToken(user);

    const response = NextResponse.json({
      token,
      user: { id: user.id, email: user.email, username: user.username, role: user.role, plan: user.plan },
    });

    response.cookies.set('ah_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
