export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { effectiveScriptLimit, hasUnlimitedPerks } from '@/lib/plans';

// GET /api/dashboard/stats — real counts for the dashboard cards.
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerClient();

  const { count: scripts } = await supabase
    .from('scripts')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', user.id);

  const { count: activeKeys } = await supabase
    .from('keys')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_to', user.id)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString());

  const { data: dbUser } = await supabase
    .from('users')
    .select('plan, extra_slot_packs, role')
    .eq('id', user.id)
    .maybeSingle();

  const role = dbUser?.role || user.role;
  const unlimited = hasUnlimitedPerks(role);
  const scriptLimit = unlimited
    ? null
    : effectiveScriptLimit(dbUser?.plan || user.plan, dbUser?.extra_slot_packs ?? 0);

  return NextResponse.json({
    scripts: scripts ?? 0,
    activeKeys: activeKeys ?? 0,
    scriptLimit,
    unlimited,
  });
}
