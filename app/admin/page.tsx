'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, FileCode2, Key, Activity, Loader2, Sparkles } from 'lucide-react';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ users: 0, scripts: 0, keys: 0, activeKeys: 0 });
  const [loading, setLoading] = useState(true);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('ah_session');
      if (!token) return;
      try {
        const [statsRes, usersRes] = await Promise.all([
          fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/admin/users?limit=10', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (usersRes.ok) setRecentUsers((await usersRes.json()));
      } catch {
        // Silently fail
      }
      setLoading(false);
    };
    fetchData();
  }, []);

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
          <CardTitle className="text-foreground">Key Generation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
              <Sparkles className="h-5 w-5 text-red-400" />
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="text-foreground font-medium">Fully automatic</p>
              <p className="mt-0.5">
                Keys are generated on demand the moment a user completes the key system, and expired
                keys are deleted automatically. There&apos;s nothing to generate or clean up here.
              </p>
            </div>
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
                        u.plan === 'SCRIPTER' ? 'bg-emerald-600/20 text-emerald-400' :
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
