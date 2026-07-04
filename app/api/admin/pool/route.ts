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
  const today = new Date().toISOString().split('T')[0];

  const { data: pool } = await supabase
    .from('daily_key_pools')
    .select('*')
    .eq('date', today)
    .single();

  if (!pool) {
    return NextResponse.json({ generated: false, date: today, keyCount: 0 });
  }

  const { count } = await supabase
    .from('daily_key_pool_keys')
    .select('*', { count: 'exact', head: true })
    .eq('pool_id', pool.id);

  return NextResponse.json({
    generated: pool.generated,
    date: today,
    keyCount: count ?? 0,
  });
}
