'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Shield, Trash2, Send } from 'lucide-react';
import { useListSearch } from '@/hooks/use-list-search';

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; kind: 'ok' | 'err' } | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      const token = localStorage.getItem('ah_session');
      if (!token) return;
      try {
        const res = await fetch('/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setUsers(await res.json());
      } catch {
        // Silently fail
      }
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const handleToggleAdmin = async (userId: string, currentRole: string) => {
    const token = localStorage.getItem('ah_session');
    if (!token) return;
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
      }
    } catch {
      // Silently fail
    }
  };

  const handleResend = async (u: any) => {
    const token = localStorage.getItem('ah_session');
    if (!token) return;
    setBusyId(u.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/users/${u.id}/resend-verification`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setNotice({ text: `Verification email resent to ${u.email}.`, kind: 'ok' });
      else setNotice({ text: data.error || 'Could not resend verification.', kind: 'err' });
    } catch {
      setNotice({ text: 'Could not resend verification.', kind: 'err' });
    }
    setBusyId(null);
  };

  const handleDelete = async (u: any) => {
    if (
      !window.confirm(
        `Delete ${u.username} (${u.email})? This permanently removes their account and scripts. This cannot be undone.`
      )
    )
      return;
    const token = localStorage.getItem('ah_session');
    if (!token) return;
    setBusyId(u.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setUsers((prev) => prev.filter((x) => x.id !== u.id));
        setNotice({ text: `Deleted ${u.username}.`, kind: 'ok' });
      } else {
        setNotice({ text: data.error || 'Could not delete user.', kind: 'err' });
      }
    } catch {
      setNotice({ text: 'Could not delete user.', kind: 'err' });
    }
    setBusyId(null);
  };

  const handleSetPlan = async (u: any, plan: string) => {
    if (plan === u.plan) return;
    const token = localStorage.getItem('ah_session');
    if (!token) return;
    setBusyId(u.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/users/${u.id}/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, plan: data.plan || plan } : x)));
        setNotice({ text: `${u.username} is now on the ${data.plan || plan} plan.`, kind: 'ok' });
      } else {
        setNotice({ text: data.error || 'Could not update plan.', kind: 'err' });
      }
    } catch {
      setNotice({ text: 'Could not update plan.', kind: 'err' });
    }
    setBusyId(null);
  };

  const { search, setSearch, shown, total, matchCount, hiddenCount, q } = useListSearch(
    users,
    (u, query) => u.username.toLowerCase().includes(query) || u.email.toLowerCase().includes(query),
    { limit: 25, searchLimit: 100 }
  );

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-3xl font-bold text-foreground mb-8">User Management</h1>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="pl-9 bg-secondary border-border"
          />
        </div>
      </div>

      {notice && (
        <div
          className={`mb-4 rounded-md border px-4 py-2 text-sm ${
            notice.kind === 'ok'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/30 bg-red-500/10 text-red-300'
          }`}
        >
          {notice.text}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-red-500" />
        </div>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-left py-3 px-4 font-medium">Username</th>
                  <th className="text-left py-3 px-4 font-medium">Email</th>
                  <th className="text-left py-3 px-4 font-medium">Plan</th>
                  <th className="text-left py-3 px-4 font-medium">Role</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-left py-3 px-4 font-medium">Joined</th>
                  <th className="text-left py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((u) => (
                  <tr
                    key={u.id}
                    className={`border-b border-border/50 text-foreground ${
                      u.email_verified === false ? 'opacity-60' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-medium">{u.username}</td>
                    <td className="py-3 px-4 text-muted-foreground">{u.email}</td>
                    <td className="py-3 px-4">
                      <select
                        value={u.plan === 'SCRIPTER' ? 'SCRIPTER' : 'FREE'}
                        disabled={busyId === u.id || u.role === 'OWNER'}
                        onChange={(e) => handleSetPlan(u, e.target.value)}
                        title="Set the user's plan after verifying their payment"
                        className={`rounded-md border border-border bg-secondary px-2 py-1 text-sm disabled:opacity-60 ${
                          u.plan === 'SCRIPTER' ? 'text-emerald-400' : 'text-muted-foreground'
                        }`}
                      >
                        <option value="FREE">FREE</option>
                        <option value="SCRIPTER">SCRIPTER</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      {u.role === 'ADMIN' ? (
                        <span className="text-amber-500 font-semibold">ADMIN</span>
                      ) : u.role === 'OWNER' ? (
                        <span className="text-red-400 font-semibold">OWNER</span>
                      ) : (
                        <span className="text-muted-foreground">USER</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {u.email_verified === false ? (
                        <Badge className="border-0 bg-amber-500/15 text-amber-400">Pending</Badge>
                      ) : (
                        <Badge className="border-0 bg-emerald-600/20 text-emerald-400">Verified</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {u.role !== 'OWNER' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busyId === u.id}
                            onClick={() => handleToggleAdmin(u.id, u.role)}
                            className={u.role === 'ADMIN' ? 'text-amber-400 hover:text-amber-300' : 'text-muted-foreground'}
                          >
                            <Shield className="h-3.5 w-3.5 mr-1" />
                            {u.role === 'ADMIN' ? 'Remove Admin' : 'Make Admin'}
                          </Button>
                        )}
                        {u.email_verified === false && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busyId === u.id}
                            onClick={() => handleResend(u)}
                            className="text-sky-400 hover:text-sky-300 border-sky-500/30"
                          >
                            <Send className="h-3.5 w-3.5 mr-1" />
                            Resend
                          </Button>
                        )}
                        {me?.id !== u.id && u.role !== 'OWNER' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busyId === u.id}
                            onClick={() => handleDelete(u)}
                            className="text-red-400 hover:text-red-300 border-red-500/30"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shown.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-10">
                {q ? `No users match “${search}”.` : 'No users yet.'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {!loading && (
        <p className="mt-4 text-xs text-muted-foreground">
          {q
            ? `${matchCount} match${matchCount === 1 ? '' : 'es'}${hiddenCount ? ` (showing first ${shown.length})` : ''}`
            : `Showing ${shown.length} of ${total} user${total === 1 ? '' : 's'}. Use search to find anyone.`}
        </p>
      )}
    </div>
  );
}
