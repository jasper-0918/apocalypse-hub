'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Shield, Loader2, ExternalLink } from 'lucide-react';

const PROVIDERS = [
  { id: 'workink', name: 'Work.ink', color: 'bg-emerald-600 hover:bg-emerald-700', desc: 'Complete a short task' },
  { id: 'linkvertise', name: 'Linkvertise', color: 'bg-blue-600 hover:bg-blue-700', desc: 'View a link' },
  { id: 'lootlabs', name: 'Lootlabs', color: 'bg-purple-600 hover:bg-purple-700', desc: 'Complete tasks to unlock' },
];

function getSessionId(): string {
  let id = localStorage.getItem('ah_device_id');
  if (!id) {
    id = 'device_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('ah_device_id', id);
  }
  return id;
}

export function KeySystemGate() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startUnlock = async (provider: string) => {
    setLoading(provider);
    setError(null);
    try {
      const sessionId = getSessionId();
      const scriptId = new URLSearchParams(window.location.search).get('scriptId');
      const res = await fetch('/api/keys/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
        credentials: 'include',
        body: JSON.stringify({ provider, scriptId, sessionId }),
      });
      const data = await res.json();
      if (!res.ok || !data.gateUrl) {
        setError(data.error || `${provider} isn't available right now.`);
        setLoading(null);
        return;
      }
      // Persist so /get-key/return can finish the claim after the ads.
      localStorage.setItem(
        'ah_unlock',
        JSON.stringify({ token: data.token, provider, scriptId, sessionId })
      );
      window.location.href = data.gateUrl;
    } catch {
      setError('Could not start. Please try again.');
      setLoading(null);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto glow-red border-red-900/30">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
          <Shield className="h-7 w-7 text-red-500" />
        </div>
        <CardTitle className="text-xl text-foreground">Key System</CardTitle>
        <CardDescription className="text-muted-foreground">
          Complete one task below to unlock your free key. Keys expire after 12 hours.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
        <div className="space-y-2.5">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => startUnlock(p.id)}
              disabled={loading !== null}
              className={`flex items-center justify-between w-full ${p.color} text-white font-medium py-3 px-4 rounded-lg transition-colors cursor-pointer disabled:opacity-60`}
            >
              <div className="flex items-center gap-2">
                {loading === p.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4 opacity-70" />
                )}
                <div className="text-left">
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-white/70 text-xs ml-2">{p.desc}</span>
                </div>
              </div>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded">FREE KEY</span>
            </button>
          ))}
        </div>
        <p className="mt-5 pt-4 border-t border-border text-xs text-muted-foreground text-center">
          You&apos;ll be redirected to complete the task, then brought back here to receive your key
          automatically. Skipping the task won&apos;t work — completion is verified on our server.
        </p>
      </CardContent>
    </Card>
  );
}
