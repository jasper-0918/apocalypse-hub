export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { isEmailConfigured, generateCode, sendVerificationEmail } from '@/lib/email';

// POST /api/admin/users/[id]/resend-verification — admin/owner re-sends a fresh
// verification code + link to a pending user's email.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const actor = await getUserFromRequest(req);
  if (!actor || (actor.role !== 'ADMIN' && actor.role !== 'OWNER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isEmailConfigured()) {
    return NextResponse.json({ error: 'Email is not configured on this server.' }, { status: 503 });
  }

  const supabase = createServerClient();
  const { data: target } = await supabase
    .from('users')
    .select('id, email, email_verified')
    .eq('id', params.id)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  if (target.email_verified) {
    return NextResponse.json({ error: 'This user is already verified.' }, { status: 400 });
  }

  const code = generateCode();
  const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  await supabase
    .from('users')
    .update({ verification_code: code, verification_expires: expires })
    .eq('id', target.id);

  const sent = await sendVerificationEmail(target.email, code);
  if (!sent) {
    return NextResponse.json({ error: 'Failed to send the email. Try again.' }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
