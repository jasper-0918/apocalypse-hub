'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Key, Zap, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function AdminKeysPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchKeys = async () => {
      const token = localStorage.getItem('ah_session');
      if (!token) return;
      try {
        const res = await fetch('/api/admin/keys', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setKeys(await res.json());
      } catch {
        // Silently fail
      }
      setLoading(false);
    };
    fetchKeys();
  }, []);

  const handleGenerate = async () => {
    const token = localStorage.getItem('ah_session');
    if (!token) return;
    setGenerating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/keys/generate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Generated ${data.count} keys for ${data.date}`);
      } else {
        setMessage(data.error || 'Failed to generate keys');
      }
    } catch {
      setMessage('Failed to generate keys');
    }
    setGenerating(false);
  };

  const getKeyStatus = (key: any) => {
    const expired = new Date(key.expires_at) < new Date();
    if (key.is_used) return { label: 'Used', color: 'bg-gray-600/20 text-gray-400', icon: XCircle };
    if (expired) return { label: 'Expired', color: 'bg-red-600/20 text-red-400', icon: XCircle };
    if (key.is_active) return { label: 'Active', color: 'bg-green-600/20 text-green-400', icon: CheckCircle };
    return { label: 'Available', color: 'bg-amber-600/20 text-amber-400', icon: Clock };
  };

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground">Key Management</h1>
        <Button onClick={handleGenerate} disabled={generating} className="bg-red-600 hover:bg-red-700 text-white">
          {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
          Generate Daily Keys
        </Button>
      </div>

      {message && (
        <div className="mb-4 text-sm text-green-400">{message}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-red-500" />
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => {
            const status = getKeyStatus(key);
            const StatusIcon = status.icon;
            return (
              <Card key={key.id} className="bg-card border-border">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Key className="h-4 w-4 text-red-400" />
                    <span className="font-mono text-sm text-foreground">{key.value}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {key.assigned_username || 'Unassigned'}
                    </span>
                    <Badge className={`${status.color} border-0`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {status.label}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {keys.length === 0 && (
            <Card className="bg-card border-border">
              <CardContent className="flex items-center justify-center py-16">
                <p className="text-muted-foreground">No keys generated yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
