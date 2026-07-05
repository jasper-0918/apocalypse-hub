'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, Wallet, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

interface Order {
  id: string;
  username: string;
  email: string;
  label: string;
  amount_usd: number;
  method: string;
  reference: string;
  note: string | null;
  status: string;
  created_at: string;
}

interface Payout {
  id: string;
  username: string;
  email: string;
  currency: 'USD' | 'ROBUX';
  amount_usd: number;
  fee_usd: number;
  net_usd: number;
  robux_amount: number | null;
  destination: string;
  status: string;
  created_at: string;
}

export default function OwnerPaymentsPage() {
  const [tab, setTab] = useState<'incoming' | 'payouts'>('incoming');
  const [orders, setOrders] = useState<Order[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('ah_session') : null;

  const load = useCallback(async () => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    const [oRes, pRes] = await Promise.all([
      fetch('/api/owner/orders', { headers }),
      fetch('/api/owner/payouts', { headers }),
    ]);
    if (oRes.ok) setOrders(await oRes.json());
    if (pRes.ok) setPayouts(await pRes.json());
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (endpoint: string, id: string, action: 'approve' | 'reject') => {
    setActing(id);
    await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, action }),
    });
    await load();
    setActing(null);
  };

  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const pendingPayouts = payouts.filter((p) => p.status === 'pending');

  return (
    <div className="p-8 max-w-4xl ml-60">
      <div className="mb-6 flex items-center gap-3">
        <Wallet className="h-7 w-7 text-amber-400" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payments</h1>
          <p className="text-muted-foreground">Approve incoming plan payments and outgoing creator payouts.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border mb-6">
        <TabButton active={tab === 'incoming'} onClick={() => setTab('incoming')} icon={<ArrowDownToLine className="h-4 w-4" />} label={`Plan Payments${pendingOrders.length ? ` (${pendingOrders.length})` : ''}`} />
        <TabButton active={tab === 'payouts'} onClick={() => setTab('payouts')} icon={<ArrowUpFromLine className="h-4 w-4" />} label={`Creator Payouts${pendingPayouts.length ? ` (${pendingPayouts.length})` : ''}`} />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>
      ) : tab === 'incoming' ? (
        <Section
          title="Pending plan payments"
          empty="No pending payments."
          items={pendingOrders}
          renderItem={(o) => (
            <Card key={o.id} className="bg-card border-amber-500/20">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-foreground font-medium">
                    {o.label} <span className="text-emerald-400">${Number(o.amount_usd).toFixed(2)}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">{o.username} ({o.email}) · via <span className="uppercase">{o.method}</span></p>
                  <p className="text-sm text-foreground mt-1">Ref: <span className="font-mono">{o.reference}</span></p>
                  {o.note && <p className="text-xs text-muted-foreground mt-1">“{o.note}”</p>}
                  <p className="text-xs text-muted-foreground mt-1">{new Date(o.created_at).toLocaleString()}</p>
                </div>
                <ApproveReject id={o.id} acting={acting} onApprove={() => act('/api/owner/orders', o.id, 'approve')} onReject={() => act('/api/owner/orders', o.id, 'reject')} />
              </CardContent>
            </Card>
          )}
          history={orders.filter((o) => o.status !== 'pending')}
          renderHistory={(o) => `${o.username} · ${o.label} · $${Number(o.amount_usd).toFixed(2)}`}
        />
      ) : (
        <Section
          title="Pending creator payouts"
          empty="No pending payouts."
          items={pendingPayouts}
          renderItem={(p) => (
            <Card key={p.id} className="bg-card border-amber-500/20">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-foreground font-medium">
                    {p.currency === 'ROBUX' ? `${p.robux_amount} Robux` : `$${Number(p.net_usd).toFixed(2)}`}
                    <span className="text-xs text-muted-foreground ml-2">(from ${Number(p.amount_usd).toFixed(2)} · fee ${Number(p.fee_usd).toFixed(2)})</span>
                  </p>
                  <p className="text-sm text-muted-foreground">{p.username} ({p.email})</p>
                  <p className="text-sm text-foreground mt-1">Send to: <span className="font-mono">{p.destination}</span></p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(p.created_at).toLocaleString()}</p>
                </div>
                <ApproveReject id={p.id} acting={acting} approveLabel="Mark Paid" onApprove={() => act('/api/owner/payouts', p.id, 'approve')} onReject={() => act('/api/owner/payouts', p.id, 'reject')} />
              </CardContent>
            </Card>
          )}
          history={payouts.filter((p) => p.status !== 'pending')}
          renderHistory={(p) => `${p.username} · ${p.currency === 'ROBUX' ? `${p.robux_amount} R$` : `$${Number(p.net_usd).toFixed(2)}`}`}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active ? 'border-amber-400 text-amber-400' : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ApproveReject({ id, acting, onApprove, onReject, approveLabel = 'Approve' }: { id: string; acting: string | null; onApprove: () => void; onReject: () => void; approveLabel?: string }) {
  return (
    <div className="flex gap-2 shrink-0">
      <Button size="sm" onClick={onApprove} disabled={acting === id} className="bg-emerald-600 hover:bg-emerald-700 text-white">
        {acting === id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1" /> {approveLabel}</>}
      </Button>
      <Button size="sm" variant="outline" onClick={onReject} disabled={acting === id} className="text-red-400 hover:bg-red-500/10">
        <X className="h-4 w-4 mr-1" /> Reject
      </Button>
    </div>
  );
}

function Section<T extends { id: string }>({ title, empty, items, renderItem, history, renderHistory }: {
  title: string;
  empty: string;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  history: (T & { status: string; created_at: string })[];
  renderHistory: (item: T) => string;
}) {
  return (
    <>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{title} ({items.length})</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground mb-8">{empty}</p>
      ) : (
        <div className="space-y-3 mb-8">{items.map(renderItem)}</div>
      )}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">History</h2>
      {history.length === 0 ? (
        <p className="text-sm text-muted-foreground">No processed items yet.</p>
      ) : (
        <div className="space-y-2">
          {history.map((h) => (
            <div key={h.id} className="flex items-center justify-between py-2 border-b border-border text-sm">
              <span className="text-muted-foreground">{renderHistory(h)} · {new Date(h.created_at).toLocaleDateString()}</span>
              <Badge className={h.status === 'approved' || h.status === 'paid' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}>
                {h.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
