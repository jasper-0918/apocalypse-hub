export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

// DELETE /api/admin/users/[id] — remove a user account (admin/owner only).
// Scripts, sessions, key_requests, earnings, orders, etc. all cascade or
// set-null on the users FK; only keys.assigned_to has no cascade, so we clear
// those first. Guards prevent deleting yourself, an OWNER, or (for a plain
// admin) another admin.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const actor = await getUserFromRequest(req);
  if (!actor || (actor.role !== 'ADMIN' && actor.role !== 'OWNER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (actor.id === params.id) {
    return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: target } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', params.id)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  if (target.role === 'OWNER') {
    return NextResponse.json({ error: 'Owner accounts cannot be deleted.' }, { status: 403 });
  }
  // Only an owner can delete an admin — one admin can't wipe another.
  if (target.role === 'ADMIN' && actor.role !== 'OWNER') {
    return NextResponse.json({ error: 'Only the owner can delete an admin account.' }, { status: 403 });
  }

  // Clear keys assigned to this user (the one FK to users that doesn't cascade).
  await supabase.from('keys').delete().eq('assigned_to', params.id);

  const { error } = await supabase.from('users').delete().eq('id', params.id);
  if (error) {
    return NextResponse.json(
      { error: 'Could not delete this user (they may still have linked records).' },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true });
}
