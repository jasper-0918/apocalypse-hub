export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { generateKeyValue, getKeyExpiry } from '@/lib/keygen';

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'OWNER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: existing } = await supabase
    .from('daily_key_pools')
    .select('*')
    .eq('date', today)
    .single();

  if (existing?.generated) {
    return NextResponse.json(
      { error: 'Keys already generated for today' },
      { status: 409 }
    );
  }

  const keyValues = Array.from({ length: 10 }, () => generateKeyValue());

  const createdKeys = [];
  for (const value of keyValues) {
    const { data: key, error } = await supabase
      .from('keys')
      .insert({
        value,
        expires_at: getKeyExpiry(),
        is_active: false,
        is_used: false,
      })
      .select()
      .single();

    if (key) createdKeys.push(key);
  }

  const { data: pool } = await supabase
    .from('daily_key_pools')
    .upsert(
      { date: today, generated: true },
      { onConflict: 'date' }
    )
    .select()
    .single();

  if (pool) {
    for (const key of createdKeys) {
      await supabase
        .from('daily_key_pool_keys')
        .insert({ pool_id: pool.id, key_id: key.id });
    }
  }

  return NextResponse.json({
    success: true,
    count: createdKeys.length,
    date: today,
  });
}
