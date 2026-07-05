'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Check, Loader2, Code2, Gift, Plus, X, Wallet } from 'lucide-react';

const plans = [
  {
    id: 'FREE',
    name: 'Free',
    price: '$0',
    period: 'forever',
    icon: Gift,
    features: ['Upload up to 10 scripts', 'Earn from your scripts', 'Key-system protected access', 'Obfuscated delivery', 'Community support'],
    color: 'border-border',
    iconColor: 'text-muted-foreground',
    buttonColor: 'bg-secondary hover:bg-secondary/80',
    cta: 'Start Free',
    kind: 'free' as const,
  },
  {
    id: 'SCRIPTER',
    name: 'Scripter',
    price: '$5',
    period: '/month',
    icon: Code2,
    features: ['Upload up to 50 scripts', 'Universal key (1 account)', 'Skip the key system', 'Earn from your scripts', '+50 more slots anytime for $10', 'Priority support'],
    color: 'border-primary/40',
    iconColor: 'text-primary',
    buttonColor: 'bg-primary hover:bg-primary/90',
    cta: 'Get Scripter',
    kind: 'scripter' as const,
    popular: true,
  },
];

// Payment options are configured via NEXT_PUBLIC_PAY_* env vars (owner-controlled).
const METHODS = [
  { key: 'gcash', label: 'GCash', detail: process.env.NEXT_PUBLIC_PAY_GCASH },
  { key: 'paypal', label: 'PayPal', detail: process.env.NEXT_PUBLIC_PAY_PAYPAL },
  { key: 'wise', label: 'Wise', detail: process.env.NEXT_PUBLIC_PAY_WISE },
  { key: 'bank', label: 'Bank Transfer', detail: process.env.NEXT_PUBLIC_PAY_BANK },
].filter((m) => !!m.detail);

const KIND_LABEL: Record<string, { label: string; amount: string }> = {
  scripter: { label: 'Scripter Plan (30 days)', amount: '$5' },
  slots: { label: '+50 Script Slots', amount: '$10' },
};

export function PricingTable() {
  const router = useRouter();
  const [buying, setBuying] = useState<'scripter' | 'slots' | null>(null);
  const [method, setMethod] = useState<string>(METHODS[0]?.key ?? '');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const startBuy = (kind: 'free' | 'scripter' | 'slots') => {
    if (kind === 'free') {
      router.push('/register');
      return;
    }
    const token = localStorage.getItem('ah_session');
    if (!token) {
      router.push('/login');
      return;
    }
    setResult(null);
    setReference('');
    setNote('');
    setBuying(kind);
  };

  const submit = async () => {
    setSubmitting(true);
    setResult(null);
    try {
      const token = localStorage.getItem('ah_session');
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ kind: buying, method, reference, note }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ ok: true, text: data.message || 'Submitted for review.' });
        setReference('');
        setNote('');
      } else {
        setResult({ ok: false, text: data.error || 'Could not submit.' });
      }
    } catch {
      setResult({ ok: false, text: 'Something went wrong. Try again.' });
    }
    setSubmitting(false);
  };

  const selectedMethod = METHODS.find((m) => m.key === method);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((plan) => {
          const Icon = plan.icon;
          return (
            <Card key={plan.id} className={`relative bg-card border-2 ${plan.color} transition-shadow hover:shadow-lg`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-white border-0 px-3 py-0.5 text-xs font-bold">MOST POPULAR</Badge>
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3 mb-2">
                  <Icon className={`h-6 w-6 ${plan.iconColor}`} />
                  <CardTitle className="text-xl text-foreground">{plan.name}</CardTitle>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-green-400 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button onClick={() => startBuy(plan.kind)} className={`w-full ${plan.buttonColor} text-white font-semibold h-11`}>
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* +50 slot add-on */}
      <Card className="mt-6 bg-card border border-border">
        <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">+50 Script Slots</p>
              <p className="text-sm text-muted-foreground">One-time add-on for Scripter accounts.</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => startBuy('slots')} className="h-11 min-w-[140px]">
            Buy for $10
          </Button>
        </CardContent>
      </Card>

      {/* Manual payment panel */}
      {buying && (
        <Card className="mt-6 bg-card border-2 border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Pay for {KIND_LABEL[buying].label} — {KIND_LABEL[buying].amount}
            </CardTitle>
            <button onClick={() => setBuying(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </CardHeader>
          <CardContent className="space-y-4">
            {METHODS.length === 0 ? (
              <p className="text-sm text-amber-400">
                No payment methods are configured yet. The owner needs to set them up.
              </p>
            ) : (
              <>
                <div>
                  <Label className="text-muted-foreground">1. Send {KIND_LABEL[buying].amount} via one of these</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {METHODS.map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setMethod(m.key)}
                        className={`text-left rounded-lg border p-3 text-sm transition-colors ${
                          method === m.key ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                        }`}
                      >
                        <p className="font-semibold text-foreground">{m.label}</p>
                        <p className="text-xs text-muted-foreground break-all">{m.detail}</p>
                      </button>
                    ))}
                  </div>
                  {selectedMethod && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Send exactly {KIND_LABEL[buying].amount} to your selected {selectedMethod.label}, then enter the reference below.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">2. Payment reference / transaction number</Label>
                  <Input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g. GCash ref no. 1234567890"
                    className="bg-secondary border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Note (optional)</Label>
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Anything the owner should know"
                    className="bg-secondary border-border"
                  />
                </div>

                {result && (
                  <div className={`text-sm rounded-lg p-3 border ${result.ok ? 'text-green-400 bg-green-500/5 border-green-500/20' : 'text-red-400 bg-red-500/5 border-red-500/20'}`}>
                    {result.text}
                  </div>
                )}

                <Button
                  onClick={submit}
                  disabled={submitting || !reference.trim() || !method}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-semibold h-11"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Payment for Review'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Your plan activates once the owner confirms the payment. Track it under Billing.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
