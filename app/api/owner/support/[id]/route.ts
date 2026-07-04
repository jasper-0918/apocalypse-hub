export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const supabase = createServerClient();

  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  if (body.status) update.status = body.status;
  if (body.response !== undefined) { update.response = body.response; update.responded_by = user.id; }
  if (body.priority) update.priority = body.priority;

  const { data, error } = await supabase
    .from('support_tickets')
    .update(update)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
