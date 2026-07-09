'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, FileCode2, Shield, Search, Trash2, ExternalLink } from 'lucide-react';
import { ScriptbloxSyncPanel } from '@/components/scriptblox-sync-panel';
import { useListSearch } from '@/hooks/use-list-search';
import { ListPager } from '@/components/list-pager';

export default function AdminScriptsPage() {
  const [scripts, setScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const fetchScripts = async () => {
      const token = localStorage.getItem('ah_session');
      if (!token) return;
      try {
        const res = await fetch('/api/admin/scripts', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setScripts(await res.json());
      } catch {
        // Silently fail
      }
      setLoading(false);
    };
    fetchScripts();
  }, []);

  const deleteScript = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This permanently removes the script. This cannot be undone.`)) return;
    const token = localStorage.getItem('ah_session');
    if (!token) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/scripts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setScripts((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // Silently fail
    }
    setBusyId(null);
  };

  const list = useListSearch(
    scripts,
    (s, query) =>
      (s.name || '').toLowerCase().includes(query) ||
      (s.owner_username || '').toLowerCase().includes(query) ||
      (s.game || '').toLowerCase().includes(query),
    { pageSize: 20 }
  );
  const { search, setSearch, shown } = list;

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-3xl font-bold text-foreground mb-2">All Scripts</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Review uploads and remove anything inappropriate. {scripts.length} total.
      </p>

      <ScriptbloxSyncPanel />

      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, author, or game…"
          className="pl-9 bg-secondary border-border"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-red-500" />
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((script) => (
            <Card key={script.id} className="bg-card border-border transition-colors hover:border-red-900/40">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20 shrink-0">
                    <FileCode2 className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{script.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      by {script.owner_username} &middot; {new Date(script.created_at).toLocaleDateString()}
                      {script.game ? ` · ${script.game}` : ''} · {script.view_count} views
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {script.is_protected && (
                    <Badge className="bg-red-600/20 text-red-400 border-0">
                      <Shield className="h-3 w-3 mr-1" />
                      Protected
                    </Badge>
                  )}
                  <Badge className={`border-0 ${script.is_published ? 'bg-emerald-600/20 text-emerald-400' : 'bg-secondary text-muted-foreground'}`}>
                    {script.is_published ? 'Published' : 'Draft'}
                  </Badge>
                  <Link href={`/script/${script.slug}`} target="_blank">
                    <Button variant="outline" size="sm" className="text-muted-foreground hover:text-foreground">
                      <ExternalLink className="h-3.5 w-3.5 mr-1" /> View
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === script.id}
                    onClick={() => deleteScript(script.id, script.name)}
                    className="text-red-400 hover:text-red-300 border-red-500/30"
                  >
                    {busyId === script.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {shown.length === 0 && (
            <Card className="bg-card border-border">
              <CardContent className="flex items-center justify-center py-16">
                <p className="text-muted-foreground">
                  {search ? 'No scripts match your search.' : 'No scripts uploaded yet'}
                </p>
              </CardContent>
            </Card>
          )}

          <ListPager {...list} noun="scripts" />
        </div>
      )}
    </div>
  );
}
