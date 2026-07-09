export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { isStaff } from '@/lib/plans';
import { createServerClient } from '@/lib/supabase/server';
import { importScriptblox, IMPORT_SOURCE } from '@/lib/import-scripts';
import type { ScriptbloxMode } from '@/lib/scriptblox';

const MAX_PAGES = 40; // safety cap per mode (each page ≈ 20 scripts)

// GET — how many imported scripts this account owns + last import time.
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerClient();
  const { count } = await supabase
    .from('scripts')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', user.id)
    .eq('external_source', IMPORT_SOURCE);
  const { data: latest } = await supabase
    .from('scripts')
    .select('updated_at')
    .eq('owner_id', user.id)
    .eq('external_source', IMPORT_SOURCE)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ count: count ?? 0, lastSynced: latest?.updated_at ?? null });
}

// POST { mode?, pages? } — scrape ScriptBlox and import as scripts OWNED by the
// requester (published + key-gated, so completions earn). Admin/owner only.
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || !isStaff(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const requested = (body.mode || 'both').toString();
  const modes: ScriptbloxMode[] =
    requested === 'popular' ? ['popular'] : requested === 'latest' ? ['latest'] : ['popular', 'latest'];
  const pages = Math.min(Math.max(Number(body.pages) || 10, 1), MAX_PAGES);

  const supabase = createServerClient();
  try {
    const { imported, pagesFetched } = await importScriptblox(supabase, {
      ownerId: user.id,
      modes,
      pages,
    });
    if (imported === 0) {
      return NextResponse.json(
        { error: 'Nothing imported. ScriptBlox returned no usable scripts — try again.' },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, modes, pagesFetched, synced: imported });
  } catch (e: any) {
    return NextResponse.json(
      { error: `Import failed: ${e?.message || 'unknown error'}. Did you run migration 024?` },
      { status: 500 }
    );
  }
}
