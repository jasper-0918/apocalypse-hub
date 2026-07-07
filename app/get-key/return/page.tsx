'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Key, Copy, Clock } from 'lucide-react';
import { Logo } from '@/components/logo';

type Phase = 'verifying' | 'claiming' | 'done' | 'error';

export default function KeyReturnPage() {
  const [phase, setPhase] = useState<Phase>('verifying');
  const [keyValue, setKeyValue] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const params = new URLSearchParams(window.location.search);
      const provider = params.get('provider');
      const wtoken = params.get('wtoken'); // Work.ink key
      const hash = params.get('hash'); // Linkvertise anti-bypass hash

      const stored = JSON.parse(localStorage.getItem('ah_unlock') || 'null');
      if (!stored?.token) {
        setError('Your unlock session was lost (different browser or cleared storage). Please start again.');
        setPhase('error');
        return;
      }
      const { token, sessionId } = stored;

      // 1) Verify completion for providers that prove it on return.
      if (provider === 'workink' || provider === 'linkvertise') {
        setPhase('verifying');
        try {
          const vr = await fetch('/api/keys/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ token, wtoken, hash }),
          });
          const vd = await vr.json();
          if (!vd.verified) {
            setError("We couldn't verify you completed the task. Please go through the link again without skipping.");
            setPhase('error');
            return;
          }
        } catch {
          setError('Verification failed. Please try again.');
          setPhase('error');
          return;
        }
      }

      // 2) Claim the key. Retry to cover Lootlabs' async postback latency.
      setPhase('claiming');
      for (let i = 0; i < 6; i++) {
        try {
          const cr = await fetch(`/api/keys?token=${encodeURIComponent(token)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId || '' },
            credentials: 'include',
            body: JSON.stringify({ sessionId }),
          });
          const cd = await cr.json();
          if (cr.ok && cd.key) {
            setKeyValue(cd.key);
            setExpiresAt(cd.expiresAt || null);
            setPhase('done');
            localStorage.removeItem('ah_unlock');
            return;
          }
          // Lootlabs postback may not have landed yet — wait and retry.
          if (cr.status === 403 && provider === 'lootlabs' && i < 5) {
            await new Promise((r) => setTimeout(r, 2500));
            continue;
          }
          setError(cd.error || 'Could not claim your key.');
          setPhase('error');
          return;
        } catch {
          setError('Network error while claiming. Please try again.');
          setPhase('error');
          return;
        }
      }
      setError('Timed out waiting for confirmation. If you finished the tasks, wait a moment and try again.');
      setPhase('error');
    })();
  }, []);

  const copyKey = () => keyValue && navigator.clipboard.writeText(keyValue);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="h-7 w-7" />
            <span className="text-xl font-bold text-foreground">Apocalypse Blox Hub</span>
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-16">
        <Card className="glow-red border-red-900/30">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-foreground">
              {phase === 'done' ? 'Key Unlocked' : phase === 'error' ? 'Something went wrong' : 'Finishing up…'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(phase === 'verifying' || phase === 'claiming') && (
              <div className="flex flex-col items-center gap-3 py-6 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-red-500" />
                <p>{phase === 'verifying' ? 'Verifying you completed the task…' : 'Claiming your key…'}</p>
              </div>
            )}

            {phase === 'done' && keyValue && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <CheckCircle className="h-5 w-5 shrink-0" /> Key claimed successfully!
                </div>
                <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-medium text-green-400">Your Key</span>
                  </div>
                  <p className="font-mono text-lg text-foreground tracking-wide break-all">{keyValue}</p>
                  {expiresAt && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> Expires: {new Date(expiresAt).toLocaleString()}
                    </div>
                  )}
                </div>
                <Button onClick={copyKey} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold">
                  <Copy className="mr-2 h-4 w-4" /> Copy Key
                </Button>
              </div>
            )}

            {phase === 'error' && (
              <div className="space-y-4">
                <div className="flex items-start gap-2 text-red-400 text-sm">
                  <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
                <Link href="/get-key">
                  <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold">
                    Back to Key System
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
