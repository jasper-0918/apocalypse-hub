'use client';

import { useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Award, Loader2, Wallet, Coins, Search } from 'lucide-react';
import { useListSearch } from '@/hooks/use-list-search';

// Fee constants — keep in sync with lib/earnings.ts
const USD_FEE_PCT = 0.015;
const USD_FEE_FIXED = 3;
const ROBUX_FEE_PCT = 0.03;
const ROBUX_PER_USD = 80;
const MIN_PAYOUT = 5;

interface Earnings {
  balanceUsd: number;
  lifetimeUsd: number;
  tier: { name: string; commissionPercent: number };
  nextTier: { name: string; commissionPercent: number; atLifetimeUsd: number } | null;
  grossPerCompletion: number;
  totalCompletions: number;
  scripts: { id: string; name: string; completion_count: number; is_published: boolean }[];
}

interface Payout {
  id: string;
  currency: 'USD' | 'ROBUX';
  amount_usd: number;
  fee_usd: number;
  net_usd: number;
  robux_amount: number | null;
  status: string;
  destination: string;
  created_at: string;
}

export default function EarningsPage() {
  const [data, setData] = useState<Earnings | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<'USD' | 'ROBUX'>('USD');
  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('ah_session') : null;

  const load = useCallback(async () => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    const [eRes, pRes] = await Promise.all([
      fetch('/api/earnings', { headers }),
      fetch('/api/payouts', { headers }),
    ]);
    if (eRes.ok) setData(await eRes.json());
    if (pRes.ok) setPayouts(await pRes.json());
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const amt = parseFloat(amount) || 0;
  const fee =
    currency === 'ROBUX'
      ? +(amt * ROBUX_FEE_PCT).toFixed(2)
      : +(amt * USD_FEE_PCT + USD_FEE_FIXED).toFixed(2);
  const net = Math.max(0, +(amt - fee).toFixed(2));
  const robux = currency === 'ROBUX' ? Math.floor(net * ROBUX_PER_USD) : null;

  // Traffic list can get very long once many scripts are imported: show the most
  // active few by default and let the owner search for a specific one.
  const trafficSorted = useMemo(
    () => [...(data?.scripts || [])].sort((a, b) => (b.completion_count || 0) - (a.completion_count || 0)),
    [data]
  );
  const traffic = useListSearch(
    trafficSorted,
    (s, query) => (s.name || '').toLowerCase().includes(query),
    { limit: 8, searchLimit: 50 }
  );

  const submit = async () => {
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch('/api/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currency, amountUsd: amt, destination }),
      });
      const d = await res.json();
      if (res.ok) {
        setMsg({ ok: true, text: d.message || 'Payout requested.' });
        setAmount('');
        setDestination('');
        load();
      } else {
        setMsg({ ok: false, text: d.error || 'Could not request payout.' });
      }
    } catch {
      setMsg({ ok: false, text: 'Something went wrong. Try again.' });
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading earnings…
      </div>
    );
  }

  const balance = data?.balanceUsd ?? 0;

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-1">Earnings</h1>
        <p className="text-muted-foreground">
          You earn on every unique key-system completion for your published scripts.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Wallet className="h-5 w-5 text-emerald-400" />} label="Available Balance" value={`$${balance.toFixed(2)}`} />
        <StatCard icon={<DollarSign className="h-5 w-5 text-sky-400" />} label="Lifetime Earned" value={`$${(data?.lifetimeUsd ?? 0).toFixed(2)}`} />
        <StatCard icon={<TrendingUp className="h-5 w-5 text-red-400" />} label="Total Completions" value={`${data?.totalCompletions ?? 0}`} />
        <StatCard
          icon={<Award className="h-5 w-5 text-amber-400" />}
          label="Seller Tier"
          value={data?.tier.name ?? '—'}
          sub={`${((data?.tier.commissionPercent ?? 0) * 100).toFixed(1)}% fee`}
        />
      </div>

      {data?.nextTier && (
        <p className="text-xs text-muted-foreground -mt-4 mb-8">
          Reach ${data.nextTier.atLifetimeUsd} lifetime to hit{' '}
          <span className="text-amber-400 font-medium">{data.nextTier.name}</span> and drop your fee to{' '}
          {(data.nextTier.commissionPercent * 100).toFixed(1)}%.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Withdrawal */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-lg">Request a Payout</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => setCurrency('USD')}
                variant={currency === 'USD' ? 'default' : 'outline'}
                className={currency === 'USD' ? 'flex-1 bg-emerald-600 hover:bg-emerald-700 text-white' : 'flex-1'}
              >
                <DollarSign className="h-4 w-4 mr-1" /> USD (PayPal)
              </Button>
              <Button
                type="button"
                onClick={() => setCurrency('ROBUX')}
                variant={currency === 'ROBUX' ? 'default' : 'outline'}
                className={currency === 'ROBUX' ? 'flex-1 bg-amber-600 hover:bg-amber-700 text-white' : 'flex-1'}
              >
                <Coins className="h-4 w-4 mr-1" /> Robux
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Amount to withdraw (USD from balance)</Label>
              <Input
                type="number"
                min={MIN_PAYOUT}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Min $${MIN_PAYOUT.toFixed(2)}`}
                className="bg-secondary border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">
                {currency === 'ROBUX' ? 'Roblox username' : 'PayPal email'}
              </Label>
              <Input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder={currency === 'ROBUX' ? 'YourRobloxName' : 'you@example.com'}
                className="bg-secondary border-border"
              />
            </div>

            {/* Fee preview */}
            {amt > 0 && (
              <div className="rounded-lg bg-secondary border border-border p-3 text-sm space-y-1">
                <Row label="Withdraw" value={`$${amt.toFixed(2)}`} />
                <Row label="Fee" value={`-$${fee.toFixed(2)}`} muted />
                {currency === 'ROBUX' ? (
                  <Row label="You receive" value={`${robux} Robux`} strong />
                ) : (
                  <Row label="You receive" value={`$${net.toFixed(2)}`} strong />
                )}
              </div>
            )}

            {msg && (
              <div className={`text-sm rounded-lg p-3 border ${msg.ok ? 'text-green-400 bg-green-500/5 border-green-500/20' : 'text-red-400 bg-red-500/5 border-red-500/20'}`}>
                {msg.text}
              </div>
            )}

            <Button
              onClick={submit}
              disabled={submitting || amt < MIN_PAYOUT || amt > balance || !destination}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold h-11"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Request Payout'}
            </Button>
            {amt > balance && (
              <p className="text-xs text-red-400">You can't withdraw more than your ${balance.toFixed(2)} balance.</p>
            )}
            <p className="text-xs text-muted-foreground">
              Payouts are reviewed and sent manually. Robux is converted at ~{ROBUX_PER_USD} R$/$1.
            </p>
          </CardContent>
        </Card>

        {/* Per-script traffic */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-lg">Traffic by Script</CardTitle>
          </CardHeader>
          <CardContent>
            {(!data || data.scripts.length === 0) ? (
              <p className="text-sm text-muted-foreground">Upload and publish scripts to start earning.</p>
            ) : (
              <>
                {data.scripts.length > 8 && (
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={traffic.search}
                      onChange={(e) => traffic.setSearch(e.target.value)}
                      placeholder="Search a script…"
                      className="pl-9 h-9 bg-secondary border-border"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  {traffic.shown.map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">{s.name}</p>
                        {!s.is_published && <span className="text-xs text-muted-foreground">private</span>}
                      </div>
                      <Badge variant="secondary" className="bg-secondary text-muted-foreground shrink-0">
                        {s.completion_count} completions
                      </Badge>
                    </div>
                  ))}
                  {traffic.shown.length === 0 && (
                    <p className="text-sm text-muted-foreground py-2">No scripts match “{traffic.search}”.</p>
                  )}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {traffic.q
                    ? `${traffic.matchCount} match${traffic.matchCount === 1 ? '' : 'es'}`
                    : `Showing top ${traffic.shown.length} of ${traffic.total} by completions.`}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payout history */}
      <Card className="bg-card border-border mt-6">
        <CardHeader>
          <CardTitle className="text-foreground text-lg">Payout History</CardTitle>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payout requests yet.</p>
          ) : (
            <div className="space-y-2">
              {payouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
                  <div>
                    <span className="text-foreground">
                      {p.currency === 'ROBUX' ? `${p.robux_amount} Robux` : `$${p.net_usd.toFixed(2)}`}
                    </span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {new Date(p.created_at).toLocaleDateString()} · {p.destination}
                    </span>
                  </div>
                  <Badge
                    className={
                      p.status === 'paid'
                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                        : p.status === 'rejected'
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }
                  >
                    {p.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-muted-foreground">{label}</span></div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function Row({ label, value, muted, strong }: { label: string; value: string; muted?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? 'text-foreground font-semibold' : muted ? 'text-muted-foreground' : 'text-foreground'}>{value}</span>
    </div>
  );
}
