export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { importScriptblox } from '@/lib/import-scripts';
import type { ScriptbloxMode } from '@/lib/scriptblox';

// Daily cron: pull the newest ScriptBlox scripts into the owner account. Wired in
// vercel.json. Protected: Vercel sends `Authorization: Bearer <CRON_SECRET>` when
// CRON_SECRET is set; otherwise we require the platform's x-vercel-cron header so
// the endpoint can't be triggered by the public.
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) return req.headers.get('authorization') === `Bearer ${secret}`;
  return req.headers.get('x-vercel-cron') != null;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerClient();
  const ownerEmail = process.env.IMPORT_OWNER_EMAIL || 'jasper.paitan0918@gmail.com';
  const { data: owner } = await supabase
    .from('users')
    .select('id')
    .eq('email', ownerEmail)
    .maybeSingle();

  if (!owner) {
    return NextResponse.json({ error: `Owner ${ownerEmail} not found` }, { status: 404 });
  }

  const mode = (process.env.CRON_IMPORT_MODE || 'latest') as ScriptbloxMode | 'both';
  const modes: ScriptbloxMode[] = mode === 'both' ? ['latest', 'popular'] : [mode as ScriptbloxMode];
  const pages = Math.min(Math.max(Number(process.env.CRON_IMPORT_PAGES) || 8, 1), 20);

  try {
    const { imported, pagesFetched } = await importScriptblox(supabase, {
      ownerId: owner.id,
      modes,
      pages,
    });
    return NextResponse.json({ ok: true, imported, pagesFetched, modes });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'import failed' }, { status: 500 });
  }
}
