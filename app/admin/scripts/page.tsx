'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileCode2, Shield } from 'lucide-react';

export default function AdminScriptsPage() {
  const [scripts, setScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScripts = async () => {
      const token = localStorage.getItem('ah_session');
      if (!token) return;
      try {
        const res = await fetch('/api/admin/scripts', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setScripts(await res.json());
      } catch {
        // Silently fail
      }
      setLoading(false);
    };
    fetchScripts();
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
      <h1 className="text-3xl font-bold text-foreground mb-8">All Scripts</h1>

      <div className="space-y-3">
        {scripts.map((script) => (
          <Card key={script.id} className="bg-card border-border">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
                  <FileCode2 className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{script.name}</p>
                  <p className="text-xs text-muted-foreground">
                    by {script.owner_username} &middot; {new Date(script.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {script.is_protected && (
                  <Badge className="bg-red-600/20 text-red-400 border-0">
                    <Shield className="h-3 w-3 mr-1" />
                    Protected
                  </Badge>
                )}
                <Badge variant="secondary" className="text-muted-foreground">
                  {script.description || 'No description'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}

        {scripts.length === 0 && (
          <Card className="bg-card border-border">
            <CardContent className="flex items-center justify-center py-16">
              <p className="text-muted-foreground">No scripts uploaded yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
