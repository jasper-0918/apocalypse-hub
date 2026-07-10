'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Code2 } from 'lucide-react';
import { useListSearch } from '@/hooks/use-list-search';
import { ListPager } from '@/components/list-pager';
import { ExportCsvButton } from '@/components/export-csv-button';

interface Subscriber {
  id: string;
  username: string;
  email: string;
  plan: string;
  role: string;
  created_at: string;
}

const PLAN_STYLE: Record<string, { color: string; icon: any }> = {
  SCRIPTER: { color: 'bg-emerald-600/20 text-emerald-400', icon: Code2 },
};

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ah_session');
    fetch('/api/owner/subscribers', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setSubscribers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const list = useListSearch(
    subscribers,
    (s, q) => s.username.toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
    { pageSize: 25 }
  );
  const { search, setSearch, shown } = list;

  const planCount = (plan: string) => subscribers.filter((s) => s.plan === plan).length;

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-1">Subscribers</h1>
        <p className="text-muted-foreground">Users on paid plans</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="bg-card border-border">
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <Code2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{planCount('SCRIPTER')}</p>
              <p className="text-xs text-muted-foreground">Scripter Subscribers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-foreground">All Subscribers</CardTitle>
            <div className="flex items-center gap-2">
              <ExportCsvButton
                filename="subscribers"
                rows={subscribers}
                columns={[
                  { header: 'Username', value: (s) => s.username },
                  { header: 'Email', value: (s) => s.email },
                  { header: 'Plan', value: (s) => s.plan },
                  { header: 'Role', value: (s) => s.role },
                  { header: 'Joined', value: (s) => new Date(s.created_at).toISOString() },
                ]}
              />
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="pl-9 bg-secondary border-border h-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
            </div>
          ) : shown.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              {search ? 'No results found.' : 'No paid subscribers yet.'}
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 pr-4 font-medium">User</th>
                      <th className="text-left py-2 pr-4 font-medium">Plan</th>
                      <th className="text-left py-2 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {shown.map((s) => {
                      const style = PLAN_STYLE[s.plan];
                      return (
                        <tr key={s.id} className="hover:bg-secondary/50 transition-colors">
                          <td className="py-3 pr-4">
                            <p className="font-medium text-foreground">{s.username}</p>
                            <p className="text-xs text-muted-foreground">{s.email}</p>
                          </td>
                          <td className="py-3 pr-4">
                            <Badge className={`border-0 text-xs ${style?.color || 'bg-zinc-600/20 text-zinc-400'}`}>
                              {s.plan}
                            </Badge>
                          </td>
                          <td className="py-3 text-xs text-muted-foreground">
                            {new Date(s.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <ListPager {...list} noun="subscribers" scrollTop={false} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
