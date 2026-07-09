export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, verifyPassword } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { changeEmailSchema } from '@/lib/validators';
import { isEmailConfigured, generateCode, sendVerificationEmail } from '@/lib/email';

// POST /api/auth/change-email { currentPassword, newEmail } — change the signed-in
// user's email. When email is configured the new address must be re-verified.
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = changeEmailSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }
  const { currentPassword } = parsed.data;
  const newEmail = parsed.data.newEmail.trim().toLowerCase();

  const supabase = createServerClient();
  const { data: row } = await supabase
    .from('users')
    .select('password_hash, email')
    .eq('id', user.id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  const ok = await verifyPassword(currentPassword, row.password_hash);
  if (!ok) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
  }
  if (newEmail === row.email.toLowerCase()) {
    return NextResponse.json({ error: 'That is already your email.' }, { status: 400 });
  }

  // Reject if another account already uses the new email (as its address or a
  // pending change).
  const { data: taken } = await supabase
    .from('users')
    .select('id')
    .or(`email.eq.${newEmail},pending_email.eq.${newEmail}`)
    .neq('id', user.id)
    .maybeSingle();
  if (taken) {
    return NextResponse.json({ error: 'That email is already in use.' }, { status: 409 });
  }

  if (isEmailConfigured()) {
    // Store the new address as PENDING and send a code to it. The account's real
    // email doesn't change until the code is verified, so an unverified/typo'd
    // address can never take over the account or hijack password recovery.
    const code = generateCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from('users')
      .update({ pending_email: newEmail, verification_code: code, verification_expires: expires })
      .eq('id', user.id);
    if (error) {
      return NextResponse.json({ error: 'Could not update your email.' }, { status: 500 });
    }
    await sendVerificationEmail(newEmail, code);
    return NextResponse.json({ ok: true, needsVerification: true, email: newEmail });
  }

  // No email service configured — nothing to verify against, so change directly.
  const { error } = await supabase.from('users').update({ email: newEmail }).eq('id', user.id);
  if (error) {
    return NextResponse.json({ error: 'Could not update your email.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, needsVerification: false, email: newEmail });
}
