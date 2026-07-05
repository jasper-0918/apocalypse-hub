'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, FileCode2, KeyRound, Zap, Ticket, Code2, Star } from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalScripts: number;
  totalKeys: number;
  activeKeys: number;
  openTickets: number;
  planBreakdown: { FREE: number; SCRIPTER: number };
  recentUsers: any[];
}

const PLAN_COLOR: Record<string, string> = {
  FREE: 'bg-zinc-600/20 text-zinc-400',
  SCRIPTER: 'bg-emerald-600/20 text-emerald-400',
  OWNER: 'bg-amber-600/20 text-amber-400',
  ADMIN: 'bg-red-600/20 text-red-400',
};

export default function OwnerPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('ah_session');
    fetch('/api/owner/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  if (!stats) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-sky-400', bg: 'bg-sky-500/10' },
    { label: 'Total Scripts', value: stats.totalScripts, icon: FileCode2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Total Keys', value: stats.totalKeys, icon: KeyRound, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Active Keys', value: stats.activeKeys, icon: Zap, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Open Tickets', value: stats.openTickets, icon: Ticket, color: 'text-red-400', bg: 'bg-red-500/10' },
  ];

  const planCards = [
    { plan: 'FREE', count: stats.planBreakdown.FREE, icon: Star, color: 'text-zinc-400' },
    { plan: 'SCRIPTER', count: stats.planBreakdown.SCRIPTER, icon: Code2, color: 'text-emerald-400' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-1">Owner Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and analytics</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="pt-5 pb-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg} mb-3`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-base">Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {planCards.map(({ plan, count, icon: Icon, color }) => (
                <div key={plan} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${color}`} />
                    <span className="text-sm font-medium text-foreground">{plan}</span>
                  </div>
                  <span className="text-lg font-bold text-foreground">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-base">Recent Users</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentUsers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No users yet.</p>
            ) : (
              <div className="space-y-2">
                {stats.recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{u.username}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <Badge className={`text-xs border-0 ${PLAN_COLOR[u.plan] || PLAN_COLOR.FREE}`}>
                      {u.plan}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
