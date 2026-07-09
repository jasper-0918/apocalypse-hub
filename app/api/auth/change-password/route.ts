export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import {
  getUserFromRequest,
  verifyPassword,
  hashPassword,
  bumpTokenVersion,
  createSessionToken,
} from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { changePasswordSchema } from '@/lib/validators';
import { sendPasswordChangedEmail } from '@/lib/email';

// POST /api/auth/change-password { currentPassword, newPassword } — change the
// signed-in user's password. Logs out other devices and keeps this one signed in
// with a fresh token.
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = changePasswordSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }
  const { currentPassword, newPassword } = parsed.data;

  const supabase = createServerClient();
  const { data: row } = await supabase
    .from('users')
    .select('password_hash, email')
    .eq('id', user.id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  const ok = await verifyPassword(currentPassword, row.password_hash);
  if (!ok) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
  }

  await supabase
    .from('users')
    .update({ password_hash: await hashPassword(newPassword) })
    .eq('id', user.id);

  // Invalidate every session (including this one's old token), then mint a fresh
  // token so the current device stays signed in while others are cut off.
  const newTv = await bumpTokenVersion(user.id);
  const token = await createSessionToken(user, newTv ?? undefined);

  sendPasswordChangedEmail(row.email).catch(() => {});

  const res = NextResponse.json({ ok: true, token });
  res.cookies.set('ah_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return res;
}
