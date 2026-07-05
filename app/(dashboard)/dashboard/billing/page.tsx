'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { PricingTable } from '@/components/pricing-table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Crown, Clock, CheckCircle } from 'lucide-react';

const SCRIPTER_HOURS = [6, 12, 18, 24, 36, 48];

function labelHours(h: number) {
  if (h < 24) return `${h} hours`;
  if (h === 24) return '24 hours (1 day)';
  if (h === 48) return '48 hours (2 days)';
  if (h === 72) return '72 hours (3 days)';
  if (h === 168) return '168 hours (7 days)';
  return `${h} hours`;
}

export default function BillingPage() {
  const { user } = useAuth();
  const plan = user?.plan || 'FREE';
  const canAdjust = plan === 'SCRIPTER';

  const [expiryHours, setExpiryHours] = useState(12);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!canAdjust) return;
    const token = localStorage.getItem('ah_session');
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.user?.key_expiry_hours) setExpiryHours(d.user.key_expiry_hours); })
      .catch(() => {});
  }, [canAdjust]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    const token = localStorage.getItem('ah_session');
    const res = await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ key_expiry_hours: expiryHours }),
    }).catch(() => null);
    if (res?.ok) setSaved(true);
    setSaving(false);
  };

  const options = SCRIPTER_HOURS;

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-1">Billing</h1>
        <p className="text-muted-foreground">Manage your subscription and plan</p>
      </div>

      <Card className="bg-card border-border mb-6">
        <CardHeader>
          <CardTitle className="text-foreground">Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
              <Crown className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold text-foreground">{plan}</p>
                {plan !== 'FREE' && (
                  <Badge className="bg-green-600/20 text-green-400 border-0">Active</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {plan === 'FREE'
                  ? 'Up to 10 scripts. Upgrade to Scripter for 50 + a universal key.'
                  : '50 scripts included (+50 per add-on pack)'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {canAdjust && (
        <Card className="bg-card border-border mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-foreground">Key Expiry Duration</CardTitle>
                <CardDescription className="text-muted-foreground">
                  How long claimed keys remain valid. Scripter range: 6–48 hours.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Select
                value={String(expiryHours)}
                onValueChange={(v) => { setExpiryHours(Number(v)); setSaved(false); }}
              >
                <SelectTrigger className="w-52 bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((h) => (
                    <SelectItem key={h} value={String(h)}>{labelHours(h)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={save}
                disabled={saving}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
              {saved && (
                <span className="flex items-center gap-1.5 text-green-400 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  Saved
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Currently set to <span className="text-foreground font-medium">{labelHours(expiryHours)}</span>. Applies to all new keys claimed going forward.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-6">Upgrade Your Plan</h2>
        <PricingTable />
      </div>
    </div>
  );
}
