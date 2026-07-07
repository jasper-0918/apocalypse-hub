'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './auth-provider';
import {
  LayoutDashboard,
  FileCode2,
  Key,
  CreditCard,
  LogOut,
  Shield,
  Flame,
  HeadphonesIcon,
  Crown,
  Wallet,
  Power,
  Settings,
  Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/scripts', label: 'Scripts', icon: FileCode2 },
  { href: '/dashboard/keys', label: 'Keys', icon: Key },
  { href: '/dashboard/earnings', label: 'Earnings', icon: Wallet },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
  { href: '/dashboard/support', label: 'Support', icon: HeadphonesIcon },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user, logout, logoutAll } = useAuth();

  const handleLogoutAll = async () => {
    if (
      window.confirm(
        'Log out of all devices? You will need to sign in again everywhere, including here.'
      )
    ) {
      await logoutAll();
    }
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex flex-col z-40">
      <div className="p-6 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <Flame className="h-7 w-7 text-red-500" />
          <span className="text-xl font-bold text-foreground">Apocalypse Hub</span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sky-400 hover:bg-sky-500/10 transition-colors"
        >
          <Home className="h-4 w-4" />
          Browse Scripts
        </Link>
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-red-500/10 text-red-400'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}

        {user?.role === 'ADMIN' && (
          <Link
            href="/admin"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith('/admin')
                ? 'bg-red-500/10 text-red-400'
                : 'text-amber-500 hover:text-amber-400 hover:bg-secondary'
            )}
          >
            <Shield className="h-4 w-4" />
            Admin Panel
          </Link>
        )}
        {user?.role === 'OWNER' && (
          <Link
            href="/owner"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith('/owner')
                ? 'bg-amber-500/10 text-amber-400'
                : 'text-amber-500 hover:text-amber-400 hover:bg-secondary'
            )}
          >
            <Crown className="h-4 w-4" />
            Owner Panel
          </Link>
        )}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="px-3 py-2 mb-3">
          <p className="text-sm font-medium text-foreground">{user?.username}</p>
          <p className="text-xs text-muted-foreground">{user?.plan} Plan</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
        <button
          onClick={handleLogoutAll}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 transition-colors w-full"
        >
          <Power className="h-4 w-4" />
          Log out all devices
        </button>
      </div>
    </aside>
  );
}
