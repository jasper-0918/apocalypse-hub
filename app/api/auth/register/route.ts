export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createUser, createSessionToken } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { registerSchema } from '@/lib/validators';
import { isEmailConfigured, generateCode, sendVerificationEmail } from '@/lib/email';
import { getClientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
    if (!rl.ok) return tooManyRequests(rl.retryAfter, 'Too many sign-ups from this network. Please try again later.');

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { email, username, password } = parsed.data;
    const user = await createUser(email, username, password);

    // If email is configured, require verification before issuing a session.
    if (isEmailConfigured()) {
      const code = generateCode();
      const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const supabase = createServerClient();
      await supabase
        .from('users')
        .update({ email_verified: false, verification_code: code, verification_expires: expires })
        .eq('id', user.id);

      await sendVerificationEmail(email, code);

      return NextResponse.json({ needsVerification: true, email });
    }

    // Email not configured → verify immediately (log the user in).
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
  } catch (error: any) {
    if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
      return NextResponse.json({ error: 'Email or username already taken' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
