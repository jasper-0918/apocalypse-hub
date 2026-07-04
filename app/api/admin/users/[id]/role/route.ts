export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(req);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'OWNER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { role } = await req.json();
  if (!['USER', 'ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: updated } = await supabase
    .from('users')
    .update({ role })
    .eq('id', params.id)
    .select('id, role')
    .single();

  if (!updated) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
