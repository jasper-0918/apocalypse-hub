'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SiteHeader } from '@/components/site-header';
import { ScriptHubCard, HubScript } from '@/components/script-hub-card';
import { Compass, Search, Loader2, TrendingUp, Clock, Eye } from 'lucide-react';

export default function DiscoverPage() {
  const [scripts, setScripts] = useState<HubScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sort, setSort] = useState<'popular' | 'latest'>('popular');

  // Debounce the search box so we don't fire on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ sort, limit: '48' });
    if (debounced) params.set('search', debounced);
    fetch(`/api/discover?${params}`)
      .then((r) => (r.ok ? r.json() : { scripts: [] }))
      .then((data) => setScripts(data.scripts || []))
      .catch(() => setScripts([]))
      .finally(() => setLoading(false));
  }, [sort, debounced]);

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
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search scripts or games — e.g. "Blox Fruits"'
              className="pl-12 h-12 bg-card border-border"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={sort === 'popular' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSort('popular')}
              className={sort === 'popular' ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-border text-muted-foreground'}
            >
              <TrendingUp className="h-3.5 w-3.5 mr-1.5" /> Popular
            </Button>
            <Button
              variant={sort === 'latest' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSort('latest')}
              className={sort === 'latest' ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-border text-muted-foreground'}
            >
              <Clock className="h-3.5 w-3.5 mr-1.5" /> Latest
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-red-500" />
          </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {scripts.map((s) => (
              <ScriptHubCard key={s.id} script={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
