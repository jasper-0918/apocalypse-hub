'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Flame, Loader2, KeyRound, CheckCircle2 } from 'lucide-react';
import { PasswordStrength } from '@/components/password-strength';
import { isPasswordValid } from '@/lib/password';

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token');
    if (t) setToken(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not reset your password.');
        setLoading(false);
        return;
      }
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch {
      setError('Something went wrong. Try again.');
      setLoading(false);
    }
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
              {done ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              ) : (
                <KeyRound className="h-6 w-6 text-red-500" />
              )}
            </div>
            <CardTitle className="text-foreground">
              {done ? 'Password updated' : 'Choose a new password'}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {done
                ? 'You can now sign in with your new password. Redirecting…'
                : 'Enter a new password for your account below.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!done && !token && (
              <p className="text-sm text-red-400 text-center">
                This reset link is missing its token. Please use the link from your email.
              </p>
            )}
            {!done && token && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password (min 8, letter & number)"
                  className="bg-secondary border-border"
                  minLength={8}
                  required
                />
                <PasswordStrength password={password} />
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm new password"
                  className="bg-secondary border-border"
                  minLength={8}
                  required
                />
                {error && <p className="text-sm text-red-400">{error}</p>}
                <Button
                  type="submit"
                  disabled={loading || !isPasswordValid(password) || password !== confirm}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold h-11"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset password'}
                </Button>
                <div className="text-center text-xs text-muted-foreground">
                  <Link href="/login" className="hover:underline">Back to sign in</Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
