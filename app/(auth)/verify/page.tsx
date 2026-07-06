'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Flame, Loader2, MailCheck } from 'lucide-react';

export default function VerifyPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [fromLink, setFromLink] = useState(false);
  const [autoTried, setAutoTried] = useState(false);

  const submitVerification = async () => {
    setLoading(true);
    setError('');
    setInfo('');
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Verification failed');
        setLoading(false);
        return;
      }
      localStorage.setItem('ah_session', data.token);
      // Full reload so the auth provider picks up the new session.
      const role = data.user?.role;
      window.location.href = role === 'OWNER' ? '/owner' : role === 'ADMIN' ? '/admin' : '/dashboard';
    } catch {
      setError('Something went wrong. Try again.');
      setLoading(false);
    }
  };

  const verify = (e: React.FormEvent) => {
    e.preventDefault();
    submitVerification();
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const e = params.get('email');
    const c = params.get('code');
    if (e) setEmail(e);
    if (c) {
      setCode(c.replace(/\D/g, '').slice(0, 6));
      setFromLink(true);
    }
  }, []);

  // Arriving from the email's "Verify my email" link (email + code in the URL):
  // submit once automatically so the click alone completes verification.
  useEffect(() => {
    if (fromLink && !autoTried && email && code.length === 6) {
      setAutoTried(true);
      submitVerification();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromLink, autoTried, email, code]);

  const resend = async () => {
    setResending(true);
    setError('');
    setInfo('');
    try {
      await fetch('/api/auth/verify', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setInfo('A new code has been sent to your email.');
    } catch {
      setError('Could not resend code.');
    }
    setResending(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-6">
          <Flame className="h-7 w-7 text-red-500" />
          <span className="text-xl font-bold text-foreground">Apocalypse Hub</span>
        </Link>
        <Card className="bg-card border-border">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
              <MailCheck className="h-6 w-6 text-red-500" />
            </div>
            <CardTitle className="text-foreground">Verify your email</CardTitle>
            <CardDescription className="text-muted-foreground">
              We sent a 6-digit code to {email || 'your email'}. Enter it below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={verify} className="space-y-4">
              {!email && (
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email"
                  className="bg-secondary border-border"
                  required
                />
              )}
              <Input
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="bg-secondary border-border text-center text-2xl tracking-[0.4em] font-mono"
                required
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
              {info && <p className="text-sm text-green-400">{info}</p>}
              <Button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold h-11"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify & Continue'}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Didn&apos;t get it?{' '}
              <button onClick={resend} disabled={resending} className="text-red-400 hover:underline">
                {resending ? 'Sending…' : 'Resend code'}
              </button>
            </div>
            <div className="mt-2 text-center text-xs text-muted-foreground">
              <Link href="/login" className="hover:underline">Back to sign in</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
