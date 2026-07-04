export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data: users } = await supabase
    .from('users')
    .select('id, username, email, plan, role, created_at, stripe_customer_id')
    .neq('plan', 'FREE')
    .order('created_at', { ascending: false });

  return NextResponse.json(users || []);
}
