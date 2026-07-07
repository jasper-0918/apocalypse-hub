export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

// DELETE /api/admin/keys/[id] — revoke (delete) a key. Admin/owner only. Use this
// for a defective key or when a user needs a fresh one. script_keys links cascade.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'OWNER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerClient();
  const { error } = await supabase.from('keys').delete().eq('id', params.id);
  if (error) {
    return NextResponse.json({ error: 'Could not revoke this key.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
