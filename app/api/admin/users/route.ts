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
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');

  const { data: users } = await supabase
    .from('users')
    .select('id, username, email, plan, role, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  return NextResponse.json(users || []);
}
