import { useEffect, useMemo, useState } from 'react';

/**
 * Search + client-side pagination for long admin/dashboard lists.
 *
 * - Renders one page at a time (`pageSize`, user-adjustable); search filters the
 *   full list and resets to page 1.
 * - Syncs `q` / `page` / `size` to the URL (via the History API) so views are
 *   shareable and browser back/forward work. Page changes push a history entry;
 *   search/size use replace. Disable with `{ syncUrl: false }`.
 *
 * Pair with <ListPager {...list} />.
 */
export function useListSearch<T>(
  items: T[],
  matcher: (item: T, q: string) => boolean,
  opts?: { pageSize?: number; syncUrl?: boolean }
) {
  const defaultSize = opts?.pageSize ?? 24;
  const syncUrl = opts?.syncUrl ?? true;

  const [search, _setSearch] = useState('');
  const [page, _setPage] = useState(0);
  const [pageSize, _setPageSize] = useState(defaultSize);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => (q ? items.filter((it) => matcher(it, q)) : items), [items, q, matcher]);
  const matchCount = filtered.length;
  const pageCount = Math.max(1, Math.ceil(matchCount / pageSize));
  const safePage = Math.min(page, pageCount - 1); // clamp if the list shrank
  const start = safePage * pageSize;
  const shown = filtered.slice(start, start + pageSize);

  // --- URL <-> state ---
  const writeUrl = (patch: { q?: string; page?: number; size?: number }, mode: 'push' | 'replace') => {
    if (!syncUrl || typeof window === 'undefined') return;
    const usp = new URLSearchParams(window.location.search);
    if ('q' in patch) patch.q ? usp.set('q', patch.q) : usp.delete('q');
    if ('page' in patch) (patch.page ?? 0) > 0 ? usp.set('page', String((patch.page ?? 0) + 1)) : usp.delete('page');
    if ('size' in patch) patch.size && patch.size !== defaultSize ? usp.set('size', String(patch.size)) : usp.delete('size');
    const qs = usp.toString();
    const url = window.location.pathname + (qs ? `?${qs}` : '');
    window.history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', url);
  };

  const setSearch = (v: string) => {
    _setSearch(v);
    _setPage(0);
    writeUrl({ q: v, page: 0 }, 'replace');
  };
  const setPage = (p: number) => {
    const np = Math.max(0, p);
    _setPage(np);
    writeUrl({ page: np }, 'push');
  };
  const setPageSize = (s: number) => {
    const keepIdx = safePage * pageSize; // keep the first visible row in view
    const np = Math.floor(keepIdx / s);
    _setPageSize(s);
    _setPage(np);
    writeUrl({ size: s, page: np }, 'replace');
  };

  // Hydrate from the URL on mount, and follow back/forward.
  useEffect(() => {
    if (!syncUrl || typeof window === 'undefined') return;
    const read = () => {
      const usp = new URLSearchParams(window.location.search);
      _setSearch(usp.get('q') || '');
      _setPage(Math.max(0, (Number(usp.get('page')) || 1) - 1));
      const s = Number(usp.get('size'));
      _setPageSize(s > 0 ? s : defaultSize);
    };
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    pageSize,
    setPageSize,
  };
}
