'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { ScriptCard } from '@/components/script-card';
import { Button } from '@/components/ui/button';
import { Plus, FileCode2, Loader2 } from 'lucide-react';
import Link from 'next/link';

const PAID_PLANS = ['SCRIPTER'];

export default function ScriptsPage() {
  const { user } = useAuth();
  const [scripts, setScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyParam, setKeyParam] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    if (PAID_PLANS.includes(user.plan) || user.role === 'OWNER') {
      const token = localStorage.getItem('ah_session');
      if (!token) return;
      fetch('/api/keys/paid', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.key?.value) setKeyParam(`${data.key.value}&uid=${user.id}`);
        })
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    const fetchScripts = async () => {
      const token = localStorage.getItem('ah_session');
      if (!token) return;
      try {
        const res = await fetch('/api/scripts', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setScripts(data);
        }
      } catch {
        // Silently fail
      }
      setLoading(false);
    };
    fetchScripts();
  }, []);

  const handleDelete = async (id: string) => {
    const token = localStorage.getItem('ah_session');
    if (!token) return;
    try {
      const res = await fetch(`/api/scripts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setScripts((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      // Silently fail
    }
  };

  const handleTogglePublish = async (id: string, published: boolean) => {
    const token = localStorage.getItem('ah_session');
    if (!token) return;
    try {
      const res = await fetch(`/api/scripts/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPublished: published }),
      });
      if (res.ok) {
        setScripts((prev) =>
          prev.map((s) => (s.id === id ? { ...s, is_published: published } : s))
        );
      }
    } catch {
      // Silently fail
    }
  };

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">My Scripts</h1>
          <p className="text-muted-foreground">{scripts.length} scripts stored</p>
        </div>
        <Link href="/dashboard/scripts/upload">
          <Button className="bg-red-600 hover:bg-red-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Upload Script
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-red-500" />
        </div>
      ) : scripts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary mb-4">
            <FileCode2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">No scripts yet</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Upload your first Lua script to protect it with the Apocalypse Hub key system.
          </p>
          <Link href="/dashboard/scripts/upload">
            <Button className="bg-red-600 hover:bg-red-700 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Upload Your First Script
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scripts.map((script) => (
            <ScriptCard
              key={script.id}
              script={script}
              onDelete={handleDelete}
              onTogglePublish={handleTogglePublish}
              baseUrl={typeof window !== 'undefined' ? window.location.origin : ''}
              keyParam={keyParam}
            />
          ))}
        </div>
      )}
    </div>
  );
}
