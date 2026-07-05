'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, Wallet } from 'lucide-react';

interface Order {
  id: string;
  username: string;
  email: string;
  kind: string;
  label: string;
  amount_usd: number;
  method: string;
  reference: string;
  note: string | null;
  status: string;
  created_at: string;
}

export default function OwnerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('ah_session') : null;

  const load = useCallback(async () => {
    if (!token) return;
    const res = await fetch('/api/owner/orders', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setOrders(await res.json());
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, action: 'approve' | 'reject') => {
    setActing(id);
    await fetch('/api/owner/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, action }),
    });
    await load();
    setActing(null);
  };

  const pending = orders.filter((o) => o.status === 'pending');
  const processed = orders.filter((o) => o.status !== 'pending');

  return (
    <div className="p-8 max-w-4xl ml-60">
      <div className="mb-8 flex items-center gap-3">
        <Wallet className="h-7 w-7 text-amber-400" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payment Orders</h1>
          <p className="text-muted-foreground">Approve manual payments to activate plans and slot packs.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>
      ) : (
        <>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Pending ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground mb-8">No pending payments.</p>
          ) : (
            <div className="space-y-3 mb-8">
              {pending.map((o) => (
                <Card key={o.id} className="bg-card border-amber-500/20">
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-foreground font-medium">
                        {o.label} <span className="text-emerald-400">${Number(o.amount_usd).toFixed(2)}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {o.username} ({o.email}) · via <span className="uppercase">{o.method}</span>
                      </p>
                      <p className="text-sm text-foreground mt-1">
                        Ref: <span className="font-mono">{o.reference}</span>
                      </p>
                      {o.note && <p className="text-xs text-muted-foreground mt-1">“{o.note}”</p>}
                      <p className="text-xs text-muted-foreground mt-1">{new Date(o.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => act(o.id, 'approve')}
                        disabled={acting === o.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {acting === o.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1" /> Approve</>}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => act(o.id, 'reject')}
                        disabled={acting === o.id}
                        className="text-red-400 hover:bg-red-500/10"
                      >
                        <X className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">History</h2>
          {processed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No processed orders yet.</p>
          ) : (
            <div className="space-y-2">
              {processed.map((o) => (
                <div key={o.id} className="flex items-center justify-between py-2 border-b border-border text-sm">
                  <span className="text-muted-foreground">
                    {o.username} · {o.label} · ${Number(o.amount_usd).toFixed(2)} · {new Date(o.created_at).toLocaleDateString()}
                  </span>
                  <Badge className={o.status === 'approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}>
                    {o.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
