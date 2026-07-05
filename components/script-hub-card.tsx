'use client';

import Link from 'next/link';
import { Eye, Key, Gamepad2 } from 'lucide-react';
import { timeAgo, formatCount } from '@/lib/utils';

export interface HubScript {
  id: string;
  name: string;
  slug: string;
  game: string;
  games?: string[];
  view_count?: number;
  is_protected?: boolean;
  created_at: string;
  owner_username?: string;
}

// A few tasteful gradients keyed off the script name so cards vary like ScriptBlox.
const GRADIENTS = [
  'from-red-900/60 via-zinc-900 to-black',
  'from-purple-900/60 via-zinc-900 to-black',
  'from-emerald-900/50 via-zinc-900 to-black',
  'from-blue-900/60 via-zinc-900 to-black',
  'from-amber-900/50 via-zinc-900 to-black',
  'from-fuchsia-900/50 via-zinc-900 to-black',
];

function gradientFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length];
}

export function ScriptHubCard({ script }: { script: HubScript }) {
  const gradient = gradientFor(script.name);

  return (
    <Link
      href={`/script/${script.slug}`}
      className="group block overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-red-900/40"
    >
      {/* Thumbnail */}
      <div className={`relative aspect-video w-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
        <span className="px-4 text-center text-lg font-extrabold uppercase tracking-wide text-white/85 line-clamp-2 drop-shadow">
          {script.name}
        </span>

        {/* Views (top-left) */}
        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white backdrop-blur">
          <Eye className="h-3 w-3" />
          {formatCount(script.view_count ?? 0)}
        </div>

        {/* Time (top-right) */}
        <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white/90 backdrop-blur">
          {timeAgo(script.created_at)}
        </div>

        {/* Key System badge (bottom-left) */}
        {script.is_protected && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-amber-500 px-2 py-0.5 text-xs font-semibold text-black">
            <Key className="h-3 w-3" />
            Key System
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="p-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-red-400">
          <Gamepad2 className="h-3.5 w-3.5" />
          <span className="truncate">{script.game || 'Universal'}</span>
          {script.games && script.games.length > 1 && (
            <span className="text-muted-foreground">+{script.games.length - 1}</span>
          )}
        </div>
        <h3 className="mt-1 truncate text-sm font-semibold text-foreground group-hover:text-red-300">
          {script.name}
        </h3>
        {script.owner_username && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">by {script.owner_username}</p>
        )}
      </div>
    </Link>
  );
}
