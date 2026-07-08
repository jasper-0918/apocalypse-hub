'use client';

import { useEffect, useState } from 'react';
import { getToken } from '@/lib/session';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Users, UserPlus, FileCode2, Eye, Key, CheckCircle2, BarChart3, ExternalLink } from 'lucide-react';

interface Analytics {
  users: number;
  newUsers7d: number;
  scripts: number;
  publishedScripts: number;
  activeKeys: number;
  completions: number;
  totalViews: number;
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/analytics', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cards = data
    ? [
        { label: 'Total Views', value: data.totalViews, icon: Eye, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
        { label: 'Total Users', value: data.users, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
        { label: 'New Users (7d)', value: data.newUsers7d, icon: UserPlus, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
        { label: 'Published Scripts', value: data.publishedScripts, icon: FileCode2, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
        { label: 'Active Keys', value: data.activeKeys, icon: Key, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
        { label: 'Key Completions', value: data.completions, icon: CheckCircle2, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
      ]
    : [];

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="h-6 w-6 text-red-500" />
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">Platform overview. Detailed visitor traffic is in your Vercel dashboard.</p>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-red-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
            {cards.map((c) => (
              <Card key={c.label} className="bg-card border-border">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${c.bg}`}>
                      <c.icon className={`h-5 w-5 ${c.color}`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{c.label}</p>
                      <p className={`text-2xl font-bold ${c.color}`}>{c.value.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-card border-border">
            <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-foreground font-medium">Visitor traffic &amp; page views</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Real-time visitors, page views, top pages and referrers are tracked by Vercel Web Analytics.
                </p>
              </div>
              <a
                href="https://vercel.com/jasperpaitan0918-5212s-projects/apocalypsebloxhub/analytics"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 shrink-0"
              >
                Open Vercel Analytics <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
