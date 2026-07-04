export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { subject, message, email } = body;

  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
  }

  const user = await getUserFromRequest(req);
  const supabase = createServerClient();

  await supabase.from('support_tickets').insert({
    user_id: user?.id ?? null,
    username: user?.username ?? null,
    email: user?.email ?? email ?? null,
    subject: subject.trim(),
    message: message.trim(),
  });

  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerClient();
  const { data } = await supabase
    .from('support_tickets')
    .select('id, subject, status, priority, created_at, response')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return NextResponse.json(data || []);
}
