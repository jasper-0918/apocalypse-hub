export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// TEMP diagnostic — remove after use.
function jwtRole(t?: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from((t || '').split('.')[1], 'base64').toString());
    return payload.role ?? null;
  } catch {
    return null;
  }
}

export async function GET() {
  const s = createServerClient();
  const out: Record<string, unknown> = {
    hasUrl: !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
    urlSource: process.env.SUPABASE_URL ? 'SUPABASE_URL' : process.env.NEXT_PUBLIC_SUPABASE_URL ? 'NEXT_PUBLIC_SUPABASE_URL' : 'none',
    serviceKeyRole: jwtRole(process.env.SUPABASE_SERVICE_ROLE_KEY),
    serviceKeyLen: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').length,
  };

  const sel = await s.from('key_unlocks').select('id', { count: 'exact', head: true });
  out.key_unlocks_selectError = sel.error?.message ?? null;

  const ins = await s
    .from('key_unlocks')
    .insert({ token: 'diag_' + Date.now(), provider: 'workink', status: 'pending' })
    .select('id')
    .maybeSingle();
  out.key_unlocks_insertError = ins.error?.message ?? null;
  out.key_unlocks_inserted = !!ins.data;

  const usersProbe = await s.from('users').select('balance_usd', { count: 'exact', head: true });
  out.users_balance_col_error = usersProbe.error?.message ?? null;

  // Probe an actual user insert (then clean it up) to surface the real error.
  const diagEmail = 'diag_' + Date.now() + '@example.com';
  const ui = await s
    .from('users')
    .insert({ email: diagEmail, username: 'diag' + Date.now().toString().slice(-8), password_hash: 'x' })
    .select('id, role, plan')
    .maybeSingle();
  out.users_insertError = ui.error?.message ?? null;
  out.users_inserted = ui.data ?? null;
  if (ui.data?.id) await s.from('users').delete().eq('id', ui.data.id);

  return NextResponse.json(out);
}
