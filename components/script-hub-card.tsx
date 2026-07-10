'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { Eye, Key, Gamepad2 } from 'lucide-react';
import { timeAgo, formatCount } from '@/lib/utils';
import { gameTheme } from '@/lib/games';

export interface HubScript {
  id: string;
  name: string;
  slug: string;
  game: string;
  games?: string[];
  thumbnail_url?: string | null;
  view_count?: number;
  is_protected?: boolean;
  created_at: string;
  owner_username?: string;
}

// Fallback gradients keyed off the script name so covers vary like ScriptBlox.
const GRADIENTS = [
  'from-red-900/60 via-zinc-900 to-black',
  'from-purple-900/60 via-zinc-900 to-black',
  'from-emerald-900/50 via-zinc-900 to-black',
  'from-blue-900/60 via-zinc-900 to-black',
  'from-amber-900/50 via-zinc-900 to-black',
  'from-fuchsia-900/50 via-zinc-900 to-black',
];

function hashGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length];
}

/** The universal default cover: a Roblox-style tilted emblem over a themed
 *  gradient, with the script name. Used when no thumbnail is uploaded. */
export function ThumbnailFallback({ name, game, big }: { name: string; game?: string; big?: boolean }) {
  const theme = gameTheme(game);
  const gradient = theme?.gradient ?? hashGradient(name);
  return (
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} flex flex-col items-center justify-center gap-2`}>
      <RobloxEmblem className={big ? 'h-16 w-16' : 'h-9 w-9'} />
      <span className={`px-4 text-center font-extrabold uppercase tracking-wide text-white/85 drop-shadow ${big ? 'text-2xl line-clamp-3' : 'text-sm line-clamp-2'}`}>
        {name}
      </span>
    </div>
  );
}

/** Roblox-style tilted rounded-square emblem (original, brand-evoking). */
export function RobloxEmblem({ className = 'h-9 w-9' }: { className?: string }) {
  // Unique gradient id per instance so many cards don't emit duplicate DOM ids.
  const gid = `roblox-emblem-${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff4b4b" />
          <stop offset="100%" stopColor="#c81e1e" />
        </linearGradient>
      </defs>
      <g transform="rotate(12 24 24)">
        <rect x="8" y="8" width="32" height="32" rx="7" fill={`url(#${gid})`} />
        <rect x="20" y="20" width="8" height="8" rx="2" fill="#0b0b0f" />
      </g>
    </svg>
  );
}

/** Placeholder card matching ScriptHubCard's footprint. Rendered while the grid
 *  loads so the layout doesn't shift when real cards arrive (better CLS). */
export function ScriptCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="aspect-video w-full animate-pulse bg-secondary" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-20 animate-pulse rounded bg-secondary" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-secondary" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-secondary" />
      </div>
    </div>
  );
}

/** A full grid of skeleton cards, same columns/gap as the real script grids. */
export function ScriptGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ScriptCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ScriptHubCard({ script }: { script: HubScript }) {
  const [imgOk, setImgOk] = useState(true);
  const showImage = !!script.thumbnail_url && imgOk;

  return (
    <Link
      href={`/script/${script.slug}`}
      className="group block overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-red-900/40"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={script.thumbnail_url as string}
            alt={script.name}
            loading="lazy"
            onError={() => setImgOk(false)}
            className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <ThumbnailFallback name={script.name} game={script.game} />
        )}

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
