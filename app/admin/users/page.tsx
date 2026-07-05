'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Shield } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
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
                  <th className="text-left py-3 px-4 font-medium">Joined</th>
                  <th className="text-left py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 text-foreground">
                    <td className="py-3 px-4 font-medium">{u.username}</td>
                    <td className="py-3 px-4 text-muted-foreground">{u.email}</td>
                    <td className="py-3 px-4">
                      <Badge className={`border-0 ${
                        u.plan === 'SCRIPTER' ? 'bg-emerald-600/20 text-emerald-400' :
                        'bg-secondary text-muted-foreground'
                      }`}>{u.plan}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      {u.role === 'ADMIN' ? (
                        <span className="text-amber-500 font-semibold">ADMIN</span>
                      ) : (
                        <span className="text-muted-foreground">USER</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleAdmin(u.id, u.role)}
                        className={u.role === 'ADMIN' ? 'text-amber-400 hover:text-amber-300' : 'text-muted-foreground'}
                      >
                        <Shield className="h-3.5 w-3.5 mr-1" />
                        {u.role === 'ADMIN' ? 'Remove Admin' : 'Make Admin'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
