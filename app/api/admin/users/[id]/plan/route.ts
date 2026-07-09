export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, bumpTokenVersion } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { isStaff } from '@/lib/plans';

const ALLOWED_PLANS = ['FREE', 'SCRIPTER'];

// PATCH /api/admin/users/[id]/plan { plan: 'FREE' | 'SCRIPTER' } — manually set a
// user's plan after verifying their payment out-of-band. Owner/admin only.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const actor = await getUserFromRequest(req);
  if (!actor || !isStaff(actor.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const plan = (body.plan || '').toString().toUpperCase();
  if (!ALLOWED_PLANS.includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const supabase = createServerClient();

  // Only an OWNER may change another staff account's plan.
  const { data: target } = await supabase
    .from('users')
    .select('role')
    .eq('id', params.id)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (isStaff(target.role) && actor.role !== 'OWNER') {
    return NextResponse.json({ error: 'Only the owner can change a staff account.' }, { status: 403 });
  }

  const { data: updated } = await supabase
    .from('users')
    .update({ plan })
    .eq('id', params.id)
    .select('id, plan')
    .single();

  if (!updated) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Plan is read from the session JWT (e.g. paid-key gating), so invalidate the
  // user's sessions — otherwise the new plan wouldn't apply until the token expires.
  await bumpTokenVersion(params.id);

  return NextResponse.json(updated);
}
