import type { SupabaseClient } from '@supabase/supabase-js';

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
