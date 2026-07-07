export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { generateKeyValue } from '@/lib/keygen';
import { PAID_PLANS } from '@/lib/plans';

function thirtyDaysFromNow() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString();
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!PAID_PLANS.includes(user.plan)) {
    return NextResponse.json({ error: 'Paid plan required' }, { status: 403 });
  }

  const supabase = createServerClient();
  const { data: key } = await supabase
    .from('keys')
    .select('*')
    .eq('assigned_to', user.id)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ key: key ?? null });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!PAID_PLANS.includes(user.plan)) {
    return NextResponse.json({ error: 'Paid plan required' }, { status: 403 });
  }

  const supabase = createServerClient();
  const now = new Date().toISOString();

  // Deactivate any existing paid keys for this user
  await supabase
    .from('keys')
    .update({ is_active: false })
    .eq('assigned_to', user.id)
    .eq('is_active', true);

  // Create a fresh 30-day key bound to this account
  const { data: newKey, error } = await supabase
    .from('keys')
    .insert({
      value: generateKeyValue(),
      expires_at: thirtyDaysFromNow(),
      is_active: true,
      is_used: false,
      is_paid_key: true,
      assigned_to: user.id,
      activated_at: now,
    })
    .select()
    .single();

  if (error || !newKey) {
    return NextResponse.json({ error: 'Failed to generate key' }, { status: 500 });
  }

  // Link to all published scripts
  const { data: scripts } = await supabase
    .from('scripts')
    .select('id')
    .eq('is_published', true);

  if (scripts) {
    for (const script of scripts) {
      await supabase
        .from('script_keys')
        .insert({ script_id: script.id, key_id: newKey.id })
        .select();
    }
  }

  return NextResponse.json({ key: newKey });
}
