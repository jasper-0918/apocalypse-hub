export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

// POST: report a script for moderation { reason }.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Please log in to report.' }, { status: 401 });

  const payload = await req.json().catch(() => ({}));
  const reason = (payload.reason || '').toString().trim();
  if (!reason) return NextResponse.json({ error: 'A reason is required.' }, { status: 400 });
  if (reason.length > 500) return NextResponse.json({ error: 'Reason is too long.' }, { status: 400 });

  const supabase = createServerClient();
  const { error } = await supabase
    .from('script_reports')
    .insert({ script_id: params.id, reporter_id: user.id, reason });

  if (error) return NextResponse.json({ error: 'Failed to submit report.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
