export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, bumpTokenVersion } from '@/lib/auth';

// POST /api/auth/logout-all — invalidate every session for the current user on
// all devices by bumping their token_version, then clear this device's cookie.
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await bumpTokenVersion(user.id);

  const res = NextResponse.json({ ok: true });
  // Clear the httpOnly cookie for the current device (other devices are cut off
  // by the version bump on their next request).
  res.cookies.set('ah_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
