export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { isStaff } from '@/lib/plans';

// GET /api/admin/analytics — platform overview numbers for the admin dashboard.
// (Detailed visitor traffic lives in Vercel Web Analytics.)
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerClient();
  const now = Date.now();
  const weekAgo = new Date(now - 7 * 24 * 3600 * 1000).toISOString();

  const head = { count: 'exact' as const, head: true };

  const [{ count: users }, { count: newUsers7d }, { count: scripts }, { count: publishedScripts }, { count: activeKeys }, { count: completions }] =
    await Promise.all([
      supabase.from('users').select('*', head),
      supabase.from('users').select('*', head).gte('created_at', weekAgo),
      supabase.from('scripts').select('*', head),
      supabase.from('scripts').select('*', head).eq('is_published', true),
      supabase.from('keys').select('*', head).eq('is_active', true).gt('expires_at', new Date().toISOString()),
      supabase.from('script_completions').select('*', head),
    ]);

  // Total script views (sum of view_count). Summed client-side with a high cap so
  // it doesn't silently undercount as the catalog grows; move to a DB sum() (rpc)
  // if the catalog ever approaches this many scripts.
  let totalViews = 0;
  try {
    const { data } = await supabase.from('scripts').select('view_count').limit(100000);
    totalViews = (data || []).reduce((sum: number, s: any) => sum + (s.view_count ?? 0), 0);
  } catch {
    /* leave 0 */
  }

  return NextResponse.json({
    users: users ?? 0,
    newUsers7d: newUsers7d ?? 0,
    scripts: scripts ?? 0,
    publishedScripts: publishedScripts ?? 0,
    activeKeys: activeKeys ?? 0,
    completions: completions ?? 0,
    totalViews,
  });
}
