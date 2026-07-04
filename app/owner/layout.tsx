'use client';

import { AuthProvider, useAuth } from '@/components/auth-provider';
import { OwnerSidebar } from '@/components/owner-sidebar';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

function OwnerGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && user.role !== 'OWNER') router.push('/dashboard');
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!user || user.role !== 'OWNER') return null;

  return (
    <div className="min-h-screen bg-background flex">
      <OwnerSidebar />
      <main className="flex-1 ml-60 overflow-auto">{children}</main>
    </div>
  );
}

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <OwnerGuard>{children}</OwnerGuard>
    </AuthProvider>
  );
}
