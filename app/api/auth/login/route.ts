export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createSessionToken } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { loginSchema } from '@/lib/validators';

export async function POST(req: NextRequest) {
  try {
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

    // Block sign-in until the email is verified.
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
