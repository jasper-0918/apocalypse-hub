'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth-provider';
import { Home, TrendingUp, ScrollText, BookOpen, Key, LayoutDashboard, Compass } from 'lucide-react';
import { Logo } from '@/components/logo';

const NAV = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/trending', label: 'Trending', icon: TrendingUp },
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/rules', label: 'Rules', icon: ScrollText },
  { href: '/docs/index.html', label: 'Docs', icon: BookOpen, external: true },
];

export function SiteHeader({ active }: { active?: string }) {
  const { user, loading } = useAuth();
  const dashboardHref = user?.role === 'OWNER' ? '/owner' : user?.role === 'ADMIN' ? '/admin' : '/dashboard';

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Logo className="h-7 w-7" />
          <span className="text-xl font-bold text-foreground hidden sm:inline">Apocalypse Blox Hub</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2 flex-1 justify-center">
          {NAV.map((item) => {
            const isActive = active === item.href;
            const cls = `flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isActive ? 'text-red-400' : 'text-muted-foreground hover:text-foreground'
            }`;
            return item.external ? (
              <a key={item.href} href={item.href} className={cls}>
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </a>
            ) : (
              <Link key={item.href} href={item.href} className={cls}>
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/get-key">
            <Button variant="outline" size="sm" className="border-red-900/30 text-red-400 hover:bg-red-500/10 hover:text-red-300">
              <Key className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Get Key</span>
            </Button>
          </Link>

          {/* Account slot: reflect the logged-in session (kept empty while auth
              is still resolving to avoid a Sign-In → Dashboard flicker). */}
          {loading ? null : user ? (
            <Link href={dashboardHref}>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">Sign In</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
