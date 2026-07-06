'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, KeyRound, Mail } from 'lucide-react';
import { PasswordStrength } from '@/components/password-strength';
import { isPasswordValid } from '@/lib/password';

type Msg = { text: string; kind: 'ok' | 'err' } | null;

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Change password
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<Msg>(null);

  // Change email
  const [emailPw, setEmailPw] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState<Msg>(null);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (!isPasswordValid(newPw)) {
      setPwMsg({ text: 'New password must be at least 8 characters with a letter and a number.', kind: 'err' });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg({ text: 'New passwords do not match.', kind: 'err' });
      return;
    }
    setPwLoading(true);
    try {
      const token = localStorage.getItem('ah_session');
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (data.token) localStorage.setItem('ah_session', data.token);
        setPwMsg({ text: 'Password changed. Other devices have been signed out.', kind: 'ok' });
        setCurPw('');
        setNewPw('');
        setConfirmPw('');
      } else {
        setPwMsg({ text: data.error || 'Could not change password.', kind: 'err' });
      }
    } catch {
      setPwMsg({ text: 'Could not change password.', kind: 'err' });
    }
    setPwLoading(false);
  };

  const changeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailMsg(null);
    setEmailLoading(true);
    try {
      const token = localStorage.getItem('ah_session');
      const res = await fetch('/api/auth/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: emailPw, newEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (data.needsVerification) {
          router.push(`/verify?email=${encodeURIComponent(data.email || newEmail)}`);
          return;
        }
        setEmailMsg({ text: 'Email updated.', kind: 'ok' });
        setEmailPw('');
        setNewEmail('');
      } else {
        setEmailMsg({ text: data.error || 'Could not change email.', kind: 'err' });
      }
    } catch {
      setEmailMsg({ text: 'Could not change email.', kind: 'err' });
    }
    setEmailLoading(false);
  };

  const noticeClass = (kind: 'ok' | 'err') =>
    kind === 'ok' ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-3xl font-bold text-foreground mb-2">Account Settings</h1>
      <p className="text-muted-foreground mb-8">
        Signed in as <span className="text-foreground">{user?.email}</span>
      </p>

      <Card className="bg-card border-border mb-8">
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-red-400" />
            <CardTitle className="text-foreground">Change password</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground">
            Changing your password signs out all your other devices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Current password</Label>
              <Input
                type="password"
                value={curPw}
                onChange={(e) => setCurPw(e.target.value)}
                required
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">New password</Label>
              <Input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
                minLength={8}
                className="bg-secondary border-border"
                placeholder="At least 8 chars, with a letter & number"
              />
              <PasswordStrength password={newPw} />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Confirm new password</Label>
              <Input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                required
                minLength={8}
                className="bg-secondary border-border"
              />
            </div>
            {pwMsg && <p className={`text-sm ${noticeClass(pwMsg.kind)}`}>{pwMsg.text}</p>}
            <Button
              type="submit"
              disabled={pwLoading || !isPasswordValid(newPw) || newPw !== confirmPw}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {pwLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-red-400" />
            <CardTitle className="text-foreground">Change email</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground">
            We&apos;ll send a verification code to your new address before it takes effect.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={changeEmail} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">New email</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                className="bg-secondary border-border"
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Current password</Label>
              <Input
                type="password"
                value={emailPw}
                onChange={(e) => setEmailPw(e.target.value)}
                required
                className="bg-secondary border-border"
              />
            </div>
            {emailMsg && <p className={`text-sm ${noticeClass(emailMsg.kind)}`}>{emailMsg.text}</p>}
            <Button
              type="submit"
              disabled={emailLoading || !newEmail}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {emailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update email'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
