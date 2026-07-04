'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Shield, CheckCircle, Loader2, Key, Copy, Clock, ExternalLink } from 'lucide-react';

interface KeyClaimResult {
  key?: string;
  expiresAt?: string;
  error?: string;
}

const TASKS = [
  {
    name: 'Work.ink',
    url: 'https://work.ink/2DXT/apocalypse-hub-key',
    color: 'bg-emerald-600 hover:bg-emerald-700',
    desc: 'Complete a task to earn your key',
    provider: 'workink',
  },
  {
    name: 'Linkvertise',
    url: 'https://link-center.net/6424901/0wDmGvM0dc4D',
    color: 'bg-blue-600 hover:bg-blue-700',
    desc: 'View a link to earn your key',
    provider: 'linkvertise',
  },
];

export function KeySystemGate() {
  const [loading, setLoading] = useState(false);
  const [claimedKey, setClaimedKey] = useState<KeyClaimResult | null>(null);
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [taskProvider, setTaskProvider] = useState<string | null>(null);
  const [sessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      let id = localStorage.getItem('ah_device_id');
      if (!id) {
        id = 'device_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem('ah_device_id', id);
      }
      return id;
    }
    return '';
  });

  const claimKey = useCallback(async () => {
    setLoading(true);
    setClaimedKey(null);

    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify({ sessionId, taskProvider }),
      });
      const data = await res.json();

      if (res.ok) {
        setClaimedKey({ key: data.key, expiresAt: data.expiresAt });
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('task');
          url.searchParams.delete('provider');
          window.history.replaceState({}, '', url.pathname);
        }
      } else {
        setClaimedKey({ error: data.error });
      }
    } catch {
      setClaimedKey({ error: 'Failed to claim key. Try again.' });
    }
    setLoading(false);
  }, [sessionId, taskProvider]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const task = params.get('task');
    const provider = params.get('provider');
    if (task === 'completed' && provider) {
      setTaskCompleted(true);
      setTaskProvider(provider);
    }
  }, []);

  useEffect(() => {
    if (taskCompleted && claimedKey === null && !loading) {
      claimKey();
    }
  }, [taskCompleted, claimedKey, loading, claimKey]);

  const handleTaskClick = (task: typeof TASKS[number]) => {
    window.open(task.url, '_blank');
  };

  const copyKey = () => {
    if (claimedKey?.key) {
      navigator.clipboard.writeText(claimedKey.key);
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
          Complete one task below to claim your free key. Keys unlock all scripts and expire after 12 hours.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {claimedKey?.key ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-400 text-sm mb-3">
              <CheckCircle className="h-5 w-5 shrink-0" />
              Key claimed successfully!
            </div>
            <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Key className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium text-green-400">Your Key</span>
              </div>
              <p className="font-mono text-lg text-foreground tracking-wide break-all">{claimedKey.key}</p>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Expires: {new Date(claimedKey.expiresAt!).toLocaleString()}
              </div>
            </div>
            <Button
              onClick={copyKey}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Key
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Use this key in your Roblox script loader. Paste it where it says YOUR_KEY_HERE in the loadstring.
            </p>
          </div>
        ) : (
          <>
            {taskCompleted && !claimedKey?.key && !loading && (
              <div className="mb-4 p-3 bg-green-500/5 border border-green-500/20 rounded-lg text-green-400 text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0" />
                Task verified! Auto-claiming your key...
              </div>
            )}
            {claimedKey?.error && (
              <div className="mb-4 p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {claimedKey.error}
              </div>
            )}
            <p className="text-sm text-muted-foreground mb-4 text-center font-medium">
              Complete any task below to unlock your key:
            </p>
            <div className="space-y-2.5">
              {TASKS.map((task) => (
                <button
                  key={task.name}
                  onClick={() => handleTaskClick(task)}
                  className={`flex items-center justify-between w-full ${task.color} text-white font-medium py-3 px-4 rounded-lg transition-colors cursor-pointer`}
                >
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 opacity-70" />
                    <div className="text-left">
                      <span className="font-semibold">{task.name}</span>
                      <span className="text-white/70 text-xs ml-2">{task.desc}</span>
                    </div>
                  </div>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded">FREE KEY</span>
                </button>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground text-center mb-3">
                After completing a task, you will be redirected back and your key will be auto-claimed. You can also click below manually:
              </p>
              <Button
                onClick={claimKey}
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold h-11"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Claiming Key...
                  </>
                ) : (
                  <>
                    <Key className="mr-2 h-4 w-4" />
                    Claim My Key
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
