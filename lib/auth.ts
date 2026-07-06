import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { createServerClient } from './supabase/server';

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'apocalypse-hub-secret-change-me');

// Session tokens are signed with NEXTAUTH_SECRET. If it's missing in production
// the insecure fallback is used and anyone could forge a session — warn loudly.
if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET) {
  console.warn(
    '[SECURITY] NEXTAUTH_SECRET is not set — session tokens are signed with an insecure default. Set NEXTAUTH_SECRET in your environment immediately.'
  );
}

export interface SessionUser {
  id: string;
  email: string;
  username: string;
  role: string;
  plan: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  // Embed the user's current token version so "log out everywhere" (which bumps
  // the version) can invalidate every token issued before it.
  let tv = 0;
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('users')
      .select('token_version')
      .eq('id', user.id)
      .maybeSingle();
    tv = data?.token_version ?? 0;
  } catch {
    /* default 0 if the column/DB isn't reachable */
  }

  return new SignJWT({ ...user, tv })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function getUserFromRequest(request: Request): Promise<SessionUser | null> {
  const authHeader = request.headers.get('authorization');
  const cookieHeader = request.headers.get('cookie');

  // Try every available token and use the first that verifies, so a stale
  // localStorage Bearer token can't override a still-valid session cookie.
  const candidates: string[] = [];
  if (authHeader?.startsWith('Bearer ')) candidates.push(authHeader.slice(7));
  if (cookieHeader) {
    const match = cookieHeader.match(/ah_session=([^;]+)/);
    if (match) candidates.push(match[1]);
  }

  for (const token of candidates) {
    try {
      const { payload } = await jwtVerify(token, secret);
      const id = (payload as any).id as string | undefined;
      if (!id) continue;

      // Reject tokens whose version is stale (logged out everywhere) or whose
      // user no longer exists (deleted). Fail-open only on a DB/network error so
      // a Supabase hiccup can't sign everyone out.
      try {
        const supabase = createServerClient();
        const { data, error } = await supabase
          .from('users')
          .select('token_version')
          .eq('id', id)
          .maybeSingle();
        if (!error) {
          if (!data) continue; // user deleted
          if ((data.token_version ?? 0) !== ((payload as any).tv ?? 0)) continue; // invalidated
        }
      } catch {
        /* fail-open: accept the (cryptographically valid) token */
      }

      return {
        id,
        email: (payload as any).email,
        username: (payload as any).username,
        role: (payload as any).role,
        plan: (payload as any).plan,
      };
    } catch {
      // Not a valid token — try the next candidate.
    }
  }
  return null;
}

export async function authenticateUser(email: string, password: string): Promise<SessionUser | null> {
  const supabase = createServerClient();
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (!user) return null;

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) return null;

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    plan: user.plan,
  };
}

export async function createUser(email: string, username: string, password: string): Promise<SessionUser> {
  const supabase = createServerClient();
  const passwordHash = await hashPassword(password);

  const { data: user, error } = await supabase
    .from('users')
    .insert({ email, username, password_hash: passwordHash })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    plan: user.plan,
  };
}
