'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { getToken } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, KeyRound, Mail, UserCircle, Camera } from 'lucide-react';
import { PasswordStrength } from '@/components/password-strength';
import { isPasswordValid } from '@/lib/password';

type Msg = { text: string; kind: 'ok' | 'err' } | null;

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const router = useRouter();

  // Profile (display name + avatar)
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<Msg>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '');
      setAvatarUrl(user.avatar_url || null);
    }
  }, [user]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setProfileLoading(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ displayName }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        await refresh();
        setProfileMsg({ text: 'Profile updated.', kind: 'ok' });
      } else {
        setProfileMsg({ text: data.error || 'Could not update profile.', kind: 'err' });
      }
    } catch {
      setProfileMsg({ text: 'Could not update profile.', kind: 'err' });
    }
    setProfileLoading(false);
  };

  const uploadAvatar = async (file: File) => {
    setProfileMsg(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/auth/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        setAvatarUrl(data.url);
        await refresh();
        setProfileMsg({ text: 'Profile picture updated.', kind: 'ok' });
      } else {
        setProfileMsg({ text: data.error || 'Could not upload picture.', kind: 'err' });
      }
    } catch {
      setProfileMsg({ text: 'Could not upload picture.', kind: 'err' });
    }
    setUploading(false);
  };

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
            <UserCircle className="h-5 w-5 text-red-400" />
            <CardTitle className="text-foreground">Profile</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground">
            Your public display name and picture. Your username stays the same.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative h-20 w-20 shrink-0">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Avatar" className="h-20 w-20 rounded-full object-cover border border-border" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary border border-border text-2xl font-bold text-muted-foreground">
                  {(user?.display_name || user?.username || '?').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAvatar(f);
                  e.target.value = '';
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="border-border text-foreground hover:bg-secondary"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" /> Change picture
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-1.5">PNG, JPG, WebP or GIF, up to 2 MB.</p>
            </div>
          </div>

          <form onSubmit={saveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Username</Label>
              <Input value={user?.username || ''} disabled className="bg-secondary border-border opacity-70" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Display name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={40}
                placeholder={user?.username || 'Your display name'}
                className="bg-secondary border-border"
              />
            </div>
            {profileMsg && <p className={`text-sm ${noticeClass(profileMsg.kind)}`}>{profileMsg.text}</p>}
            <Button
              type="submit"
              disabled={profileLoading}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {profileLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save profile'}
            </Button>
          </form>
        </CardContent>
      </Card>

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
