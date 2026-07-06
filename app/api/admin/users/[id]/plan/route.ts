export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

const ALLOWED_PLANS = ['FREE', 'SCRIPTER'];

// PATCH /api/admin/users/[id]/plan { plan: 'FREE' | 'SCRIPTER' } — manually set a
// user's plan after verifying their payment out-of-band. Owner/admin only.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const actor = await getUserFromRequest(req);
  if (!actor || (actor.role !== 'ADMIN' && actor.role !== 'OWNER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const plan = (body.plan || '').toString().toUpperCase();
  if (!ALLOWED_PLANS.includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: updated } = await supabase
    .from('users')
    .update({ plan })
    .eq('id', params.id)
    .select('id, plan')
    .single();

  if (!updated) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
