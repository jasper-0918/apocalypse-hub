'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, FileCode2, Key, Activity, Loader2, Zap, CheckCircle, AlertTriangle } from 'lucide-react';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ users: 0, scripts: 0, keys: 0, activeKeys: 0 });
  const [pool, setPool] = useState<{ generated: boolean; date: string; keyCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('ah_session');
      if (!token) return;
      try {
        const [statsRes, poolRes, usersRes] = await Promise.all([
          fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/admin/pool', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/admin/users?limit=10', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (poolRes.ok) setPool(await poolRes.json());
        if (usersRes.ok) setRecentUsers((await usersRes.json()));
      } catch {
        // Silently fail
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleGenerateKeys = async () => {
    const token = localStorage.getItem('ah_session');
    if (!token) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/keys/generate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPool({ generated: true, date: new Date().toISOString().split('T')[0], keyCount: 10 });
      }
    } catch {
      // Silently fail
    }
    setGenerating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-3xl font-bold text-foreground mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Users', value: stats.users, icon: Users, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
          { label: 'Total Scripts', value: stats.scripts, icon: FileCode2, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
          { label: 'Total Keys', value: stats.keys, icon: Key, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Active Keys', value: stats.activeKeys, icon: Activity, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
        ].map((stat) => (
          <Card key={stat.label} className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg} border`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card border-border mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground">Daily Key Pool</CardTitle>
            {!pool?.generated && (
              <Button onClick={handleGenerateKeys} disabled={generating} className="bg-red-600 hover:bg-red-700 text-white" size="sm">
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                Generate 10 Keys
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {pool?.generated ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="text-green-400 text-sm">{pool.keyCount} keys generated for {pool.date}</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                <span className="text-amber-400 text-sm">No keys generated yet for today</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Recent Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-left py-3 pr-4 font-medium">Username</th>
                  <th className="text-left py-3 pr-4 font-medium">Email</th>
                  <th className="text-left py-3 pr-4 font-medium">Plan</th>
                  <th className="text-left py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 text-foreground">
                    <td className="py-3 pr-4 font-medium">{u.username}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{u.email}</td>
                    <td className="py-3 pr-4">
                      <Badge className={`border-0 ${
                        u.plan === 'DEVELOPER' ? 'bg-red-600/20 text-red-400' :
                        u.plan === 'SCRIPTER' ? 'bg-emerald-600/20 text-emerald-400' :
                        u.plan === 'PRO' ? 'bg-sky-600/20 text-sky-400' :
                        'bg-secondary text-muted-foreground'
                      }`}>{u.plan}</Badge>
                    </td>
                    <td className="py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
