'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Key, CheckCircle, XCircle, Clock, Trash2, Search } from 'lucide-react';
import { useListSearch } from '@/hooks/use-list-search';

export default function AdminKeysPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const fetchKeys = async () => {
      const token = localStorage.getItem('ah_session');
      if (!token) return;
      try {
        const res = await fetch('/api/admin/keys', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setKeys(await res.json());
      } catch {
        // Silently fail
      }
      setLoading(false);
    };
    fetchKeys();
  }, []);

  const revokeKey = async (id: string, value: string) => {
    if (!window.confirm(`Revoke key ${value}? The user will need to claim a new one.`)) return;
    const token = localStorage.getItem('ah_session');
    if (!token) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/keys/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch {
      // Silently fail
    }
    setBusyId(null);
  };

  const getKeyStatus = (key: any) => {
    const expired = new Date(key.expires_at) < new Date();
    if (key.is_used) return { label: 'Used', color: 'bg-gray-600/20 text-gray-400', icon: XCircle };
    if (expired) return { label: 'Expired', color: 'bg-red-600/20 text-red-400', icon: XCircle };
    if (key.is_active) return { label: 'Active', color: 'bg-green-600/20 text-green-400', icon: CheckCircle };
    return { label: 'Available', color: 'bg-amber-600/20 text-amber-400', icon: Clock };
  };

  const { search, setSearch, shown, total, matchCount, hiddenCount, q } = useListSearch(
    keys,
    (k, query) => `${k.value} ${k.assigned_username || ''}`.toLowerCase().includes(query),
    { limit: 25, searchLimit: 100 }
  );

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-3xl font-bold text-foreground mb-2">Key Management</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Keys are generated automatically when a user completes the key system, and expired keys are
        removed automatically — nothing to generate or clean up here.
      </p>

      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by key or username…"
          className="pl-9 bg-secondary border-border"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-red-500" />
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((key) => {
            const status = getKeyStatus(key);
            const StatusIcon = status.icon;
            return (
              <Card key={key.id} className="bg-card border-border">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Key className="h-4 w-4 text-red-400" />
                    <span className="font-mono text-sm text-foreground">{key.value}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {key.assigned_username || 'Unassigned'}
                    </span>
                    <Badge className={`${status.color} border-0`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {status.label}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyId === key.id}
                      onClick={() => revokeKey(key.id, key.value)}
                      className="text-red-400 hover:text-red-300 border-red-500/30"
                    >
                      {busyId === key.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Revoke
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {shown.length === 0 && (
            <Card className="bg-card border-border">
              <CardContent className="flex items-center justify-center py-16">
                <p className="text-muted-foreground">
                  {search ? 'No keys match your search.' : 'No active keys right now'}
                </p>
              </CardContent>
            </Card>
          )}

          {shown.length > 0 && (
            <p className="pt-1 text-xs text-muted-foreground">
              {q
                ? `${matchCount} match${matchCount === 1 ? '' : 'es'}${hiddenCount ? ` (showing first ${shown.length})` : ''}`
                : `Showing ${shown.length} of ${total} key${total === 1 ? '' : 's'}. Use search to find one.`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
