import { useMemo, useState } from 'react';

/**
 * Shared "search + cap" behaviour for long admin/dashboard lists: keep the page
 * short by rendering only the first `limit` items, and reveal the rest by
 * searching (matches are capped at `searchLimit`). Filtering is client-side over
 * the already-loaded list.
 */
export function useListSearch<T>(
  items: T[],
  matcher: (item: T, q: string) => boolean,
  opts?: { limit?: number; searchLimit?: number }
) {
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();
  const limit = opts?.limit ?? 24;
  const searchLimit = opts?.searchLimit ?? 100;

  const filtered = useMemo(() => (q ? items.filter((it) => matcher(it, q)) : items), [items, q, matcher]);
  const shown = q ? filtered.slice(0, searchLimit) : filtered.slice(0, limit);

  return {
    search,
    setSearch,
    q,
    shown,
    total: items.length,
    matchCount: filtered.length,
    hiddenCount: Math.max(0, filtered.length - shown.length),
  };
}
