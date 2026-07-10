export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { getClientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  // This endpoint accepts tickets from logged-OUT users too, so it's an open
  // write. Rate-limit per IP and cap field lengths to blunt spam / oversized
  // payloads.
  const rl = rateLimit(`support:${getClientIp(req)}`, 5, 10 * 60 * 1000);
  if (!rl.ok) return tooManyRequests(rl.retryAfter, 'Too many tickets. Please wait a few minutes.');

  const body = await req.json().catch(() => ({}));
  const subject = (body.subject || '').toString().trim();
  const message = (body.message || '').toString().trim();
  const email = (body.email || '').toString().trim() || null;

  if (!subject || !message) {
    return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
  }
  if (subject.length > 200) {
    return NextResponse.json({ error: 'Subject is too long.' }, { status: 400 });
  }
  if (message.length > 5000) {
    return NextResponse.json({ error: 'Message is too long.' }, { status: 400 });
  }

  const user = await getUserFromRequest(req);
  const supabase = createServerClient();

  await supabase.from('support_tickets').insert({
    user_id: user?.id ?? null,
    username: user?.username ?? null,
    email: user?.email ?? email,
    subject,
    message,
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
