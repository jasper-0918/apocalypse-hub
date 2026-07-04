export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'OWNER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerClient();

  const [usersRes, scriptsRes, keysRes, activeKeysRes] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('scripts').select('*', { count: 'exact', head: true }),
    supabase.from('keys').select('*', { count: 'exact', head: true }),
    supabase.from('keys').select('*', { count: 'exact', head: true }).eq('is_active', true).gt('expires_at', new Date().toISOString()),
  ]);

  return NextResponse.json({
    users: usersRes.count ?? 0,
    scripts: scriptsRes.count ?? 0,
    keys: keysRes.count ?? 0,
    activeKeys: activeKeysRes.count ?? 0,
  });
}
