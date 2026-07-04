export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerClient();
  const { data: row } = await supabase
    .from('users')
    .select('key_expiry_hours')
    .eq('id', user.id)
    .maybeSingle();

  return NextResponse.json({ user: { ...user, key_expiry_hours: row?.key_expiry_hours ?? 12 } });
}

export async function PATCH(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.plan !== 'SCRIPTER' && user.plan !== 'DEVELOPER') {
    return NextResponse.json(
      { error: 'Key expiry adjustment requires Scripter or Developer plan' },
      { status: 403 }
    );
  }

  const body = await req.json();
  const hours = Number(body.key_expiry_hours);
  const maxHours = user.plan === 'DEVELOPER' ? 168 : 48;

  if (!Number.isInteger(hours) || hours < 6 || hours > maxHours) {
    return NextResponse.json(
      { error: `key_expiry_hours must be an integer between 6 and ${maxHours}` },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  await supabase.from('users').update({ key_expiry_hours: hours }).eq('id', user.id);

  return NextResponse.json({ key_expiry_hours: hours });
}
