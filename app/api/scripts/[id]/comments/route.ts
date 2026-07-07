export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

// GET: public list of comments for a script (newest first).
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('script_comments')
    .select('id, user_id, username, body, created_at')
    .eq('script_id', params.id)
    .order('created_at', { ascending: false })
    .limit(200);
  return NextResponse.json(data || []);
}

// POST: add a comment (login required) { body }.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Please log in to comment.' }, { status: 401 });

  const payload = await req.json().catch(() => ({}));
  const body = (payload.body || '').toString().trim();
  if (!body) return NextResponse.json({ error: 'Comment cannot be empty.' }, { status: 400 });
  if (body.length > 1000) return NextResponse.json({ error: 'Comment is too long.' }, { status: 400 });

  const supabase = createServerClient();

  // Confirm the script exists and is published before accepting a comment.
  const { data: script } = await supabase
    .from('scripts')
    .select('id, is_published')
    .eq('id', params.id)
    .maybeSingle();
  if (!script || !script.is_published) {
    return NextResponse.json({ error: 'Script not found' }, { status: 404 });
  }

  const { data: comment, error } = await supabase
    .from('script_comments')
    .insert({ script_id: params.id, user_id: user.id, username: user.username, body })
    .select('id, username, body, created_at')
    .single();

  if (error) return NextResponse.json({ error: 'Failed to post comment.' }, { status: 500 });
  return NextResponse.json(comment, { status: 201 });
}
