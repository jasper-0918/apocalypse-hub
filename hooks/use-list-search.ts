import { useEffect, useMemo, useState } from 'react';

/**
 * Search + client-side pagination for long admin/dashboard lists. Keeps the page
 * short by rendering one page at a time (`pageSize`); Next/Prev walk the list and
 * search filters it (resetting to the first page). Pair with <ListPager>.
 */
export function useListSearch<T>(
  items: T[],
  matcher: (item: T, q: string) => boolean,
  opts?: { pageSize?: number }
) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const q = search.trim().toLowerCase();
  const pageSize = opts?.pageSize ?? 24;

  const filtered = useMemo(() => (q ? items.filter((it) => matcher(it, q)) : items), [items, q, matcher]);

  const matchCount = filtered.length;
  const pageCount = Math.max(1, Math.ceil(matchCount / pageSize));
  const safePage = Math.min(page, pageCount - 1); // clamp if the list shrank

  // Jump back to the first page whenever the query changes.
  useEffect(() => {
    setPage(0);
  }, [q]);

  const start = safePage * pageSize;
  const shown = filtered.slice(start, start + pageSize);

  return {
    search,
    setSearch,
    q,
    shown,
    page: safePage,
    setPage,
    pageCount,
    total: items.length,
    matchCount,
    rangeStart: matchCount === 0 ? 0 : start + 1,
    rangeEnd: Math.min(matchCount, start + pageSize),
  };
}
