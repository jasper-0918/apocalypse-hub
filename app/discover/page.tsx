'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SiteHeader } from '@/components/site-header';
import { ScriptHubCard, HubScript, ScriptGridSkeleton } from '@/components/script-hub-card';
import { ListPager } from '@/components/list-pager';
import { Compass, Search, TrendingUp, Clock, Eye } from 'lucide-react';

const DEFAULT_SIZE = 48;

export default function DiscoverPage() {
  const [scripts, setScripts] = useState<HubScript[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sort, setSort] = useState<'popular' | 'latest'>('popular');
  const [page, setPage] = useState(0); // 0-based
  const [pageSize, setPageSize] = useState(DEFAULT_SIZE);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // --- URL sync (shareable links + back/forward) ---
  const writeUrl = (
    patch: { sort?: string; q?: string; page?: number; size?: number },
    mode: 'push' | 'replace'
  ) => {
    if (typeof window === 'undefined') return;
    const usp = new URLSearchParams(window.location.search);
    if ('sort' in patch) patch.sort === 'latest' ? usp.set('sort', 'latest') : usp.delete('sort');
    if ('q' in patch) patch.q ? usp.set('q', patch.q) : usp.delete('q');
    if ('page' in patch) (patch.page ?? 0) > 0 ? usp.set('page', String((patch.page ?? 0) + 1)) : usp.delete('page');
    if ('size' in patch) patch.size && patch.size !== DEFAULT_SIZE ? usp.set('size', String(patch.size)) : usp.delete('size');
    const qs = usp.toString();
    window.history[mode === 'push' ? 'pushState' : 'replaceState'](
      null,
      '',
      window.location.pathname + (qs ? `?${qs}` : '')
    );
  };

  useEffect(() => {
    const read = () => {
      const usp = new URLSearchParams(window.location.search);
      const s = usp.get('sort') === 'latest' ? 'latest' : 'popular';
      const query = usp.get('q') || '';
      const sz = Number(usp.get('size'));
      setSort(s);
      setSearch(query);
      setDebounced(query);
      setPage(Math.max(0, (Number(usp.get('page')) || 1) - 1));
      setPageSize(sz > 0 ? sz : DEFAULT_SIZE);
    };
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ sort, limit: String(pageSize), page: String(page + 1) });
    if (debounced) params.set('search', debounced);
    fetch(`/api/discover?${params}`)
      .then((r) => (r.ok ? r.json() : { scripts: [], total: 0 }))
      .then((data) => {
        setScripts(data.scripts || []);
        setTotal(Number(data.total) || 0);
      })
      .catch(() => {
        setScripts([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [sort, debounced, page, pageSize]);

  const onSearchChange = (v: string) => {
    setSearch(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setDebounced(v.trim());
      setPage(0);
      writeUrl({ q: v.trim(), page: 0 }, 'replace');
    }, 350);
  };
  const pickSort = (s: 'popular' | 'latest') => {
    setSort(s);
    setPage(0);
    writeUrl({ sort: s, page: 0 }, 'replace');
  };
  const goPage = (p: number) => {
    setPage(Math.max(0, p));
    writeUrl({ page: Math.max(0, p) }, 'push');
  };
  const changeSize = (s: number) => {
    const np = Math.floor((page * pageSize) / s);
    setPageSize(s);
    setPage(np);
    writeUrl({ size: s, page: np }, 'replace');
  };

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader active="/discover" />

      <section className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-2">
          <Compass className="h-7 w-7 text-red-500" />
          <h1 className="text-3xl font-bold text-foreground">Discover Scripts</h1>
        </div>
        <p className="text-muted-foreground mb-6">
          A huge collection of the most popular and newest Roblox scripts — unlock any of them with your free key.
        </p>

        {/* Controls */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder='Search scripts or games — e.g. "Blox Fruits"'
              aria-label="Search scripts or games"
              className="pl-12 h-12 bg-card border-border"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={sort === 'popular' ? 'default' : 'outline'}
              size="sm"
              onClick={() => pickSort('popular')}
              className={sort === 'popular' ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-border text-muted-foreground'}
            >
              <TrendingUp className="h-3.5 w-3.5 mr-1.5" /> Popular
            </Button>
            <Button
              variant={sort === 'latest' ? 'default' : 'outline'}
              size="sm"
              onClick={() => pickSort('latest')}
              className={sort === 'latest' ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-border text-muted-foreground'}
            >
              <Clock className="h-3.5 w-3.5 mr-1.5" /> Latest
            </Button>
          </div>
        </div>

        {loading ? (
          <ScriptGridSkeleton count={DEFAULT_SIZE > 12 ? 12 : DEFAULT_SIZE} />
        ) : scripts.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary mb-4">
                <Eye className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Nothing here yet</h2>
              <p className="text-muted-foreground max-w-md">
                {debounced
                  ? 'No scripts match your search. Try a different game or keyword.'
                  : 'The discovery catalog is still being imported. Check back shortly.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {scripts.map((s, i) => (
                <ScriptHubCard key={s.id} script={s} priority={i < 4} />
              ))}
            </div>

            <ListPager
              page={page}
              pageCount={pageCount}
              setPage={goPage}
              rangeStart={total ? page * pageSize + 1 : 0}
              rangeEnd={Math.min(total, (page + 1) * pageSize)}
              matchCount={total}
              q={debounced}
              noun="scripts"
              pageSize={pageSize}
              setPageSize={changeSize}
            />
          </>
        )}
      </section>
    </div>
  );
}
