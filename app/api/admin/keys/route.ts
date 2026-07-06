export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { deleteExpiredKeys } from '@/lib/keys';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'OWNER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerClient();

  // Expired keys are deleted automatically — purge before listing so the
  // admin view only ever shows live keys.
  await deleteExpiredKeys(supabase);

  const { data: keys } = await supabase
    .from('keys')
    .select('id, value, expires_at, is_active, is_used, assigned_to, created_at, users!keys_assigned_to_fkey(username)')
    .order('created_at', { ascending: false })
    .limit(100);

  const formatted = (keys || []).map((k: any) => ({
    id: k.id,
    value: k.value,
    expires_at: k.expires_at,
    is_active: k.is_active,
    is_used: k.is_used,
    assigned_username: k.users?.username || null,
    created_at: k.created_at,
  }));

  return NextResponse.json(formatted);
}
