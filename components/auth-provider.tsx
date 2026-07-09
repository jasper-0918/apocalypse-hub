'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, storeSession, clearSession } from '@/lib/session';

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  plan: string;
  display_name?: string | null;
  avatar_url?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  logoutAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.user) setUser(data.user);
          else clearSession();
        })
        .catch(() => clearSession())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string, remember = true) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, remember }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.needsVerification) {
        router.push(`/verify?email=${encodeURIComponent(data.email)}`);
        return;
      }
      throw new Error(data.error || 'Login failed');
    }
    storeSession(data.token, remember);
    setUser(data.user);
    if (data.user?.role === 'OWNER') router.push('/owner');
    else if (data.user?.role === 'ADMIN') router.push('/admin');
    else router.push('/dashboard');
  };

  const register = async (email: string, username: string, password: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    if (data.needsVerification) {
      router.push(`/verify?email=${encodeURIComponent(data.email)}`);
      return;
    }
    storeSession(data.token, true);
    setUser(data.user);
    router.push('/dashboard');
  };

  // Re-pull the current user (e.g. after a profile/avatar change) so the header,
  // sidebar and anything reading useAuth reflect it immediately.
  const refresh = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        if (data?.user) setUser(data.user);
      }
    } catch {
      /* keep the current user on a transient failure */
    }
  };

  const logout = () => {
    clearSession();
    setUser(null);
    router.push('/');
  };

  const logoutAll = async () => {
    const token = getToken();
    try {
      await fetch('/api/auth/logout-all', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      // Best-effort; we clear locally regardless.
    }
    clearSession();
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, logoutAll, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
