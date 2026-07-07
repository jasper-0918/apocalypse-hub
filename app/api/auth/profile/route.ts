export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { profileSchema } from '@/lib/validators';

// PATCH /api/auth/profile { displayName } — update the signed-in user's display
// name (username stays fixed). Empty clears it.
export async function PATCH(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = profileSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const displayName = (parsed.data.displayName ?? '').trim();
  const supabase = createServerClient();
  const { error } = await supabase
    .from('users')
    .update({ display_name: displayName || null })
    .eq('id', user.id);
  if (error) {
    return NextResponse.json({ error: 'Could not update your profile.' }, { status: 500 });
  }

  return NextResponse.json({ display_name: displayName || null });
}
