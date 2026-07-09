export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { isStaff } from '@/lib/plans';

// DELETE /api/scripts/[id]/comments/[commentId] — remove a comment. Allowed for
// admins/owners (moderation) or the comment's own author.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerClient();
  const { data: comment } = await supabase
    .from('script_comments')
    .select('id, user_id')
    .eq('id', params.commentId)
    .maybeSingle();

  if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });

  if (!isStaff(user.role) && comment.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await supabase.from('script_comments').delete().eq('id', params.commentId);
  return NextResponse.json({ success: true });
}
