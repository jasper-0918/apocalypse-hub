import type { SupabaseClient } from '@supabase/supabase-js';
import { selectAll } from '@/lib/paginate';

// Free keys are "universal" — a key authorizes every published script via the
// script_keys junction (read by the serve gate). These helpers keep that link
// table in sync WITHOUT the two bugs the old per-row loops had:
//   1. an uncapped SELECT silently stopped at PostgREST's 1000-row limit, so a
//      key never linked to scripts ranked past 1000 (they'd 403 on serve);
//   2. one awaited INSERT per script/key = a write storm (1000+ round-trips)
//      that could blow the serverless function's time budget.
// We page past the cap with selectAll and upsert in bulk chunks instead.
const SCRIPT_KEYS_CHUNK = 500;

async function bulkUpsertScriptKeys(
  supabase: SupabaseClient,
  pairs: { script_id: string; key_id: string }[]
): Promise<void> {
  for (let i = 0; i < pairs.length; i += SCRIPT_KEYS_CHUNK) {
    await supabase
      .from('script_keys')
      .upsert(pairs.slice(i, i + SCRIPT_KEYS_CHUNK), { onConflict: 'script_id,key_id' });
  }
}

/** Authorize one key for EVERY published script (used when a key is claimed). */
export async function linkKeyToPublishedScripts(
  supabase: SupabaseClient,
  keyId: string
): Promise<void> {
  const scripts = await selectAll<{ id: string }>((from, to) =>
    supabase.from('scripts').select('id').eq('is_published', true).range(from, to)
  );
  if (!scripts.length) return;
  await bulkUpsertScriptKeys(supabase, scripts.map((s) => ({ script_id: s.id, key_id: keyId })));
}

/** Authorize every currently-active key for one script (used when publishing). */
export async function linkScriptToActiveKeys(
  supabase: SupabaseClient,
  scriptId: string
): Promise<void> {
  const now = new Date().toISOString();
  const keys = await selectAll<{ id: string }>((from, to) =>
    supabase.from('keys').select('id').eq('is_active', true).gt('expires_at', now).range(from, to)
  );
  if (!keys.length) return;
  await bulkUpsertScriptKeys(supabase, keys.map((k) => ({ script_id: scriptId, key_id: k.id })));
}

/**
 * Delete every key whose expiry has already passed.
 *
 * Junction rows in `script_keys` and `daily_key_pool_keys` are removed
 * automatically via ON DELETE CASCADE, and `key_requests.key_id` has no FK,
 * so this is always safe to call. Cheap and idempotent — meant to be run on
 * hot paths (key claim, admin keys view) so expired keys never linger.
 *
 * Returns the number of keys deleted (0 on error — cleanup is best-effort and
 * must never block the caller).
 */
export async function deleteExpiredKeys(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase
    .from('keys')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id');

  if (error || !data) return 0;
  return data.length;
}
