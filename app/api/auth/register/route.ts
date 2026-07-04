export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createUser, createSessionToken } from '@/lib/auth';
import { registerSchema } from '@/lib/validators';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, username, password } = parsed.data;
    const user = await createUser(email, username, password);
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
      return NextResponse.json(
        { error: 'Email or username already taken' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
