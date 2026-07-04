export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  const { data: games } = await supabase
    .from('roblox_games')
    .select('*')
    .order('display_order', { ascending: true });
  return NextResponse.json(games || []);
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const name = (body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const supabase = createServerClient();

  const { count: maxOrder } = await supabase
    .from('roblox_games')
    .select('display_order', { count: 'exact', head: true });

  const { data: game, error } = await supabase
    .from('roblox_games')
    .insert({ name, display_order: (maxOrder ?? 0) + 1 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(game, { status: 201 });
}
