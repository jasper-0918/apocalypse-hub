import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { createServerClient } from './supabase/server';

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'apocalypse-hub-secret-change-me');

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
  return new SignJWT({ ...user })
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

  let token: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (cookieHeader) {
    const match = cookieHeader.match(/ah_session=([^;]+)/);
    if (match) token = match[1];
  }

  if (!token) return null;
  return verifySessionToken(token);
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
