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
  const { data: scripts } = await supabase
    .from('scripts')
    .select('id, name, description, is_protected, created_at, owner_id, users!scripts_owner_id_fkey(username)')
    .order('created_at', { ascending: false })
    .limit(100);

  const formatted = (scripts || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    is_protected: s.is_protected,
    created_at: s.created_at,
    owner_username: s.users?.username || 'Unknown',
  }));

  return NextResponse.json(formatted);
}
