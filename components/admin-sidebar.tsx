'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './auth-provider';
import {
  LayoutDashboard,
  Users,
  FileCode2,
  Key,
  ArrowLeft,
  Shield,
  Flame,
  HeadphonesIcon,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/scripts', label: 'Scripts', icon: FileCode2 },
  { href: '/admin/keys', label: 'Keys', icon: Key },
  { href: '/admin/support', label: 'Support', icon: HeadphonesIcon },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex flex-col z-40">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <Flame className="h-7 w-7 text-red-500" />
          <span className="text-xl font-bold text-foreground">Apocalypse Hub</span>
        </div>
        <div className="flex items-center gap-1.5 text-amber-500 text-xs font-semibold px-1">
          <Shield className="h-3 w-3" />
          ADMIN PANEL
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
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
      </nav>

      <div className="p-4 border-t border-border">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="px-3 py-2 mt-3">
          <p className="text-sm font-medium text-foreground">{user?.username}</p>
          <p className="text-xs text-amber-500">Administrator</p>
        </div>
      </div>
    </aside>
  );
}
