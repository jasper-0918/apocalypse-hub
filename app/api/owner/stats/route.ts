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

  const [
    { count: totalUsers },
    { count: totalScripts },
    { count: totalKeys },
    { count: activeKeys },
    { count: openTickets },
    { data: planCounts },
    { data: recentUsers },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('scripts').select('*', { count: 'exact', head: true }),
    supabase.from('keys').select('*', { count: 'exact', head: true }),
    supabase
      .from('keys')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString()),
    supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open'),
    supabase.from('users').select('plan'),
    supabase
      .from('users')
      .select('id, username, email, plan, role, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const planBreakdown = { FREE: 0, PRO: 0, SCRIPTER: 0, DEVELOPER: 0 };
  (planCounts || []).forEach((u: any) => {
    if (u.plan in planBreakdown) planBreakdown[u.plan as keyof typeof planBreakdown]++;
  });

  return NextResponse.json({
    totalUsers: totalUsers ?? 0,
    totalScripts: totalScripts ?? 0,
    totalKeys: totalKeys ?? 0,
    activeKeys: activeKeys ?? 0,
    openTickets: openTickets ?? 0,
    planBreakdown,
    recentUsers: recentUsers || [],
  });
}
