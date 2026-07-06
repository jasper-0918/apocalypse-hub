'use client';

import { useAuth } from '@/components/auth-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileCode2, Key, Crown, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { PLAN_BASE_LIMITS } from '@/lib/plans';

export default function DashboardPage() {
  const { user } = useAuth();
  const plan = user?.plan || 'FREE';
  const limit = PLAN_BASE_LIMITS[plan] ?? PLAN_BASE_LIMITS.FREE;

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-1">
          Welcome back, {user?.username}
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
                  0 <span className="text-muted-foreground text-sm font-normal">/ {limit === 0 ? '0' : limit}</span>
                </p>
              </div>
            </div>
            {limit > 0 && (
              <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: '0%' }} />
              </div>
            )}
            {limit === 0 && (
              <p className="text-xs text-red-400 mt-2">Upgrade to store scripts</p>
            )}
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
                <p className="text-2xl font-bold text-foreground">0</p>
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
