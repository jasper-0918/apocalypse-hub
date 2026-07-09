import { createHash } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildScriptSlug, slugify } from '@/lib/utils';
import { fetchScriptbloxList, type ScriptbloxMode, type ScriptbloxScript } from '@/lib/scriptblox';
import { pingIndexNow } from '@/lib/indexnow';

export const IMPORT_SOURCE = 'scriptblox';

// Build an owned `scripts` row from a scraped ScriptBlox script. Returns null for
// entries we can't monetize (paid = body is locked, or empty body).
export function buildImportedRow(s: ScriptbloxScript, ownerId: string) {
  const content = (s.script || '').trim();
  if (s.scriptType === 'paid' || !content) return null;

  return {
    name: s.title.slice(0, 200),
    description: `${s.gameName} script.`,
    original_content: content,
    obfuscated_hash: createHash('sha256').update(content).digest('hex'),
    is_protected: true, // key-gated → completions credit the owner
    is_published: true,
    game: s.gameName,
    games: [s.gameName],
    slug: buildScriptSlug(s.title, s.externalId),
    thumbnail_url: s.image || s.gameImage || null,
    view_count: s.views, // seed with the source's view count so trending/sort looks real
    external_source: IMPORT_SOURCE,
    external_id: s.externalId,
    owner_id: ownerId,
  };
}

export interface ImportResult {
  imported: number;
  pagesFetched: number;
}

/**
 * Scrape ScriptBlox (popular/latest) and upsert the results as scripts owned by
 * `ownerId`. De-dupes on (external_source, external_id) so re-runs refresh views
 * instead of duplicating. Also links currently-active keys so existing key
 * holders can run the new scripts immediately.
 */
export async function importScriptblox(
  supabase: SupabaseClient,
  opts: { ownerId: string; modes: ScriptbloxMode[]; pages: number }
): Promise<ImportResult> {
  const byId = new Map<string, ScriptbloxScript>();
  let pagesFetched = 0;

  for (const mode of opts.modes) {
    for (let page = 1; page <= opts.pages; page++) {
      try {
        const res = await fetchScriptbloxList(mode, page);
        pagesFetched++;
        for (const s of res.scripts) byId.set(s.externalId, s);
        if (res.nextPage == null || page >= res.totalPages) break;
      } catch {
        break; // partial import is still useful
      }
    }
  }

  const rows = Array.from(byId.values())
    .map((s) => buildImportedRow(s, opts.ownerId))
    .filter((r): r is NonNullable<typeof r> => !!r);

  if (rows.length === 0) return { imported: 0, pagesFetched };

  const importedIds: string[] = [];
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { data, error } = await supabase
      .from('scripts')
      .upsert(chunk, { onConflict: 'external_source,external_id' })
      .select('id');
    if (error) throw new Error(error.message);
    for (const r of data || []) importedIds.push(r.id);
  }

  await linkActiveKeys(supabase, importedIds);

  // Tell IndexNow (Bing/Yandex/…) about the new/updated pages so they get crawled
  // within minutes — the main lever for driving search traffic to these scripts.
  const paths = new Set<string>(['/', '/discover', '/trending']);
  for (const r of rows) {
    if (r.slug) paths.add(`/script/${r.slug}`);
    for (const g of r.games) {
      const gs = slugify(g);
      if (gs) paths.add(`/game/${gs}`);
    }
  }
  await pingIndexNow(Array.from(paths));

  return { imported: importedIds.length, pagesFetched };
}

// Link every currently-active key to the given scripts (bounded) so people who
// already hold a key don't hit "key not authorized" on freshly imported scripts.
async function linkActiveKeys(supabase: SupabaseClient, scriptIds: string[]) {
  if (scriptIds.length === 0) return;
  const { data: keys } = await supabase
    .from('keys')
    .select('id')
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .limit(200);
  if (!keys || keys.length === 0) return;

  const pairs: { script_id: string; key_id: string }[] = [];
  for (const sid of scriptIds) for (const k of keys) pairs.push({ script_id: sid, key_id: k.id });

  for (let i = 0; i < pairs.length; i += 500) {
    await supabase
      .from('script_keys')
      .upsert(pairs.slice(i, i + 500), { onConflict: 'script_id,key_id' });
  }
}
