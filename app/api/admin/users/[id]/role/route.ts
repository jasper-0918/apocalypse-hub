export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, bumpTokenVersion } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { isStaff } from '@/lib/plans';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const actor = await getUserFromRequest(req);
  if (!actor || !isStaff(actor.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { role } = await req.json();
  if (!['USER', 'ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }
  if (actor.id === params.id) {
    return NextResponse.json({ error: 'You cannot change your own role.' }, { status: 400 });
  }

  const supabase = createServerClient();

  // Only an OWNER may change the role of another staff (admin/owner) account —
  // this stops an admin from demoting the owner or a fellow admin.
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
    .update({ role })
    .eq('id', params.id)
    .select('id, role')
    .single();

  if (!updated) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // The role lives in the session JWT, so invalidate the target's existing
  // sessions — otherwise the change wouldn't take effect until the token expires.
  await bumpTokenVersion(params.id);

  return NextResponse.json(updated);
}
