import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose/jwt/verify';

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'apocalypse-hub-secret-change-me');

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    !pathname.startsWith('/dashboard') &&
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/owner')
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get('ah_session')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    const role = (payload as any).role;

    if (pathname.startsWith('/admin') && role !== 'ADMIN' && role !== 'OWNER') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    if (pathname.startsWith('/owner') && role !== 'OWNER') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL('/login', req.url));
    response.cookies.delete('ah_session');
    return response;
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/owner/:path*'],
};
