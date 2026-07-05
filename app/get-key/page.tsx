'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { KeySystemGate } from '@/components/key-system-gate';
import { Flame, ArrowLeft, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { siteBaseUrl } from '@/lib/utils';
import Link from 'next/link';

const PAID_PLANS = ['SCRIPTER'];

export default function GetKeyPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('ah_session');
    if (!token) return;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.user && PAID_PLANS.includes(data.user.plan)) {
          router.replace('/dashboard/keys');
        }
      })
      .catch(() => {});
  }, [router]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Flame className="h-7 w-7 text-red-500" />
            <span className="text-xl font-bold text-foreground">Apocalypse Hub</span>
          </Link>
          <Link href="/">
            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Scripts
            </button>
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Get Your Key</h1>
          <p className="text-muted-foreground">
            Complete a task below to claim your free key. Keys unlock all protected scripts for 12 hours.
          </p>
        </div>

        <KeySystemGate />

        <Card className="mt-8 bg-card border-border">
          <CardContent className="p-5">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <span className="text-foreground font-medium">How to use your key:</span> After claiming your key, go to the{' '}
                  <Link href="/" className="text-red-400 hover:underline">script catalog</Link>, click
                  &quot;Copy Loadstring&quot; on any script, and replace <code className="text-green-400 font-mono bg-secondary px-1.5 py-0.5 rounded">YOUR_KEY_HERE</code> with
                  your actual key.
                </p>
                <p>
                  <span className="text-foreground font-medium">Loadstring format:</span>{' '}
                  <code className="text-green-400 font-mono text-xs bg-secondary px-2 py-1 rounded block mt-1 break-all">
                    {`loadstring(game:HttpGet("${siteBaseUrl()}/api/scripts/serve/SCRIPT_ID?key=YOUR_KEY"))()`}
                  </code>
                </p>
                <p>
                  <span className="text-foreground font-medium">Key expiry:</span> Keys are valid for 12 hours from activation. You can claim one key per day.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
