'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Key, Clock, CheckCircle, XCircle, Loader2, Zap, RefreshCw,
  Copy, ExternalLink, Crown, Shield
} from 'lucide-react';
import { siteBaseUrl } from '@/lib/utils';
import { PAID_PLANS } from '@/lib/plans';
import Link from 'next/link';

function daysRemaining(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  return days > 0 ? `${days}d ${hours}h remaining` : `${hours}h remaining`;
}

function timeRemaining(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${minutes}m remaining`;
}

export default function KeysPage() {
  const { user } = useAuth();
  const isPaid = PAID_PLANS.includes(user?.plan || '');

  const [paidKey, setPaidKey] = useState<any | null>(null);
  const [freeKeys, setFreeKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const token = () => localStorage.getItem('ah_session') || '';

  const loadKeys = useCallback(async () => {
    setLoading(true);
    if (isPaid) {
      const res = await fetch('/api/keys/paid', { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) {
        const data = await res.json();
        setPaidKey(data.key);
      }
    }
    const res2 = await fetch('/api/keys', { headers: { Authorization: `Bearer ${token()}` } });
    if (res2.ok) setFreeKeys(await res2.json());
    setLoading(false);
  }, [isPaid]);

  useEffect(() => { if (user) loadKeys(); }, [user, loadKeys]);

  const generatePaidKey = async () => {
    setGenerating(true);
    setMessage(null);
    const res = await fetch('/api/keys/paid', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}` },
    });
    const data = await res.json();
    if (res.ok) {
      setPaidKey(data.key);
      setMessage({ type: 'success', text: 'New 30-day key generated!' });
    } else {
      setMessage({ type: 'error', text: data.error || 'Failed to generate key' });
    }
    setGenerating(false);
  };

  const copyKey = (value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getKeyStatus = (key: any) => {
    const expired = new Date(key.expires_at) < new Date();
    if (expired) return { label: 'Expired', color: 'bg-red-600/20 text-red-400', icon: XCircle };
    if (key.is_active) return { label: 'Active', color: 'bg-green-600/20 text-green-400', icon: CheckCircle };
    return { label: 'Inactive', color: 'bg-yellow-600/20 text-yellow-400', icon: Clock };
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-1">My Keys</h1>
        <p className="text-muted-foreground">
          {isPaid ? 'Your plan includes a 30-day renewable key' : 'Complete the key system to get a 12-hour access key'}
        </p>
      </div>

      {isPaid ? (
        /* PAID USER: monthly key section */
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Crown className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-foreground">{user?.plan} Plan Key</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Valid for 30 days — renew anytime to reset the timer
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && (
              <div className={`text-sm p-3 rounded-lg ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {message.text}
              </div>
            )}

            {paidKey ? (
              <div className="bg-secondary rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                    <span className="text-xs text-green-400 font-medium">Active · Account-Bound</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {daysRemaining(paidKey.expires_at)}
                  </div>
                </div>
                <div className="font-mono text-sm text-foreground bg-background rounded px-3 py-2 break-all">
                  {paidKey.value}
                </div>

                {/* Loadstring usage section */}
                <div className="bg-background rounded p-3 space-y-1.5">
                  <p className="text-xs text-muted-foreground font-medium">Loadstring format (use this in your executor):</p>
                  <code className="text-xs text-green-400 break-all block">
                    {`loadstring(game:HttpGet("${siteBaseUrl()}/api/scripts/serve/SCRIPT_ID?key=${paidKey.value}&uid=${user?.id}"))() `}
                  </code>
                  <p className="text-xs text-amber-400/80">
                    This key is locked to your account — the <code className="text-amber-400">uid</code> parameter is required and must match your account.
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={() => copyKey(`${paidKey.value}&uid=${user?.id}`)}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {copied ? <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                    {copied ? 'Copied!' : 'Copy Key + UID'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={generatePaidKey}
                    disabled={generating}
                    className="border-border text-muted-foreground hover:text-foreground"
                  >
                    {generating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                    Renew (reset 30 days)
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-secondary rounded-lg p-5 text-center space-y-3">
                <Key className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                <p className="text-sm text-muted-foreground">No active key yet. Generate your 30-day key below.</p>
                <Button
                  onClick={generatePaidKey}
                  disabled={generating}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                >
                  {generating ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
                  ) : (
                    <><Zap className="mr-2 h-4 w-4" />Generate My Key</>
                  )}
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              In the script catalog, click <strong className="text-foreground">Copy Loadstring</strong> and use it directly — your key + account ID are already embedded and the key will only work on your account.
            </p>
          </CardContent>
        </Card>
      ) : (
        /* FREE USER: key system link */
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
                <Shield className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <CardTitle className="text-foreground">Free Key System</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Keys last 12 hours. Complete a quick task to claim one.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/get-key">
              <Button className="bg-red-600 hover:bg-red-700 text-white font-semibold w-full h-11">
                <ExternalLink className="mr-2 h-4 w-4" />
                Get My Free Key
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground text-center">
              Upgrade to Scripter to skip the key system and get a renewable key.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Key history for free users */}
      {!isPaid && freeKeys.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Key History</h2>
          <div className="space-y-3">
            {freeKeys.map((key) => {
              const status = getKeyStatus(key);
              const StatusIcon = status.icon;
              return (
                <Card key={key.id} className="bg-card border-border">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary shrink-0">
                        <Key className="h-4 w-4 text-red-400" />
                      </div>
                      <div>
                        <p className="font-mono text-sm text-foreground">{key.value}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {key.is_active && new Date(key.expires_at) > new Date()
                            ? timeRemaining(key.expires_at)
                            : `Expired ${new Date(key.expires_at).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <Badge className={`${status.color} border-0 shrink-0`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {status.label}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
