'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Compass, Loader2, CheckCircle2 } from 'lucide-react';
import { timeAgo } from '@/lib/utils';

// Admin control to (re)populate the Discover catalog from ScriptBlox.
export function ScriptbloxSyncPanel() {
  const [count, setCount] = useState<number | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const token = () => (typeof window !== 'undefined' ? localStorage.getItem('ah_session') : null);

  const loadStatus = async () => {
    const t = token();
    if (!t) return;
    try {
      const res = await fetch('/api/admin/scriptblox/sync', { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) {
        const data = await res.json();
        setCount(data.count ?? 0);
        setLastSynced(data.lastSynced ?? null);
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const sync = async (mode: 'both' | 'popular' | 'latest', pages: number) => {
    const t = token();
    if (!t) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/scriptblox/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, pages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Import failed.');
      } else {
        setMessage(`Imported ${data.synced} scripts to your account (${data.pagesFetched} pages).`);
        await loadStatus();
      }
    } catch {
      setError('Network error during sync.');
    }
    setBusy(false);
  };

  return (
    <Card className="bg-card border-border mb-6">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20 shrink-0">
              <Compass className="h-5 w-5 text-red-500" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-foreground">Import scripts from ScriptBlox</p>
              <p className="text-xs text-muted-foreground">
                {count === null ? 'Loading…' : `${count.toLocaleString()} imported to your account`}
                {lastSynced ? ` · updated ${timeAgo(lastSynced)}` : ' · none yet'}
                {' · published & key-gated so completions earn'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Button
              size="sm"
              disabled={busy}
              onClick={() => sync('popular', 15)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
              Sync popular
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => sync('both', 8)}
              className="border-border text-muted-foreground hover:text-foreground"
            >
              Popular + latest
            </Button>
          </div>
        </div>

        {(message || error) && (
          <div className={`mt-3 flex items-center gap-2 text-sm ${error ? 'text-red-400' : 'text-emerald-400'}`}>
            {!error && <CheckCircle2 className="h-4 w-4" />}
            <span>{error || message}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
