'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { getToken } from '@/lib/session';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileCode2, Key, Crown, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface Stats {
  scripts: number;
  activeKeys: number;
  scriptLimit: number | null;
  unlimited: boolean;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const plan = user?.plan || 'FREE';
  const [stats, setStats] = useState<Stats>({ scripts: 0, activeKeys: 0, scriptLimit: null, unlimited: false });

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch('/api/dashboard/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setStats(d); })
      .catch(() => {});
  }, []);

  const limitLabel = stats.unlimited ? '∞' : stats.scriptLimit ?? 0;
  const pct =
    stats.unlimited || !stats.scriptLimit
      ? 0
      : Math.min(100, Math.round((stats.scripts / stats.scriptLimit) * 100));

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-1">
          Welcome back, {user?.display_name || user?.username}
        </h1>
        <p className="text-muted-foreground">
          Plan: <span className="text-red-400 font-semibold">{plan}</span>
          {plan === 'FREE' && (
            <Link href="/pricing" className="ml-2 text-sky-400 hover:underline text-sm">
              Upgrade now
            </Link>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
                <FileCode2 className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Scripts Stored</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.scripts}{' '}
                  <span className="text-muted-foreground text-sm font-normal">/ {limitLabel}</span>
                </p>
              </div>
            </div>
            {stats.unlimited ? (
              <p className="text-xs text-emerald-400 mt-2">Unlimited uploads</p>
            ) : stats.scriptLimit ? (
              <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${pct}%` }} />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Key className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Keys</p>
                <p className="text-2xl font-bold text-foreground">{stats.activeKeys}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Crown className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Plan</p>
                <p className="text-2xl font-bold text-red-400">{plan}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/dashboard/scripts/upload">
          <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold h-14 text-base">
            <Plus className="mr-2 h-5 w-5" />
            Upload New Script
          </Button>
        </Link>
        <Link href="/dashboard/keys">
          <Button variant="outline" className="w-full font-semibold h-14 text-base border-border text-foreground hover:bg-secondary">
            <Key className="mr-2 h-5 w-5" />
            Manage Keys
            <ArrowRight className="ml-auto h-5 w-5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
