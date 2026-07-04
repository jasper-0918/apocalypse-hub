'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './auth-provider';
import {
  LayoutDashboard,
  Gamepad2,
  CreditCard,
  HeadphonesIcon,
  Users,
  KeyRound,
  FileCode2,
  LogOut,
  Shield,
  Crown,
} from 'lucide-react';

const OWNER_LINKS = [
  { href: '/owner', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/owner/games', label: 'Game Tags', icon: Gamepad2 },
  { href: '/owner/subscribers', label: 'Subscribers', icon: CreditCard },
  { href: '/owner/support', label: 'Support', icon: HeadphonesIcon },
];

const ADMIN_LINKS = [
  { href: '/admin', label: 'Admin Stats', icon: Shield },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/scripts', label: 'Scripts', icon: FileCode2 },
  { href: '/admin/keys', label: 'Keys', icon: KeyRound },
];

export function OwnerSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  const isActive = (href: string) =>
    href === '/owner' ? pathname === '/owner' : pathname.startsWith(href);

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-card border-r border-border flex flex-col z-50">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Crown className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Owner Panel</p>
            <p className="text-xs text-amber-400">Apocalypse Hub</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
          Owner
        </p>
        {OWNER_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive(href)
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}

        <div className="pt-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
            Admin Access
          </p>
          {ADMIN_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive(href)
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="p-3 border-t border-border">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
