import { cache } from 'react';
import { createServerClient } from '@/lib/supabase/server';
import { selectAll } from '@/lib/paginate';
import { SITE_URL } from '@/lib/seo';
import { slugify } from '@/lib/utils';
import { IMPORT_SOURCE } from '@/lib/import-scripts';
import type { HubScript } from '@/components/script-hub-card';

// Server-only detail shape used for SSR + metadata on the script page.
// Deliberately excludes original_content and does NOT increment views
// (the client fetch to /api/scripts/public/[slug] handles the view count).
export interface PublicScript {
  id: string;
  name: string;
  slug: string;
  description: string;
  game: string;
  games: string[];
  thumbnail_url: string | null;
  view_count: number;
  is_protected: boolean;
  created_at: string;
  updated_at: string;
  owner_username: string;
  loadstring: string;
}

const RICH =
  'id, name, slug, description, game, games, thumbnail_url, view_count, is_protected, is_published, created_at, updated_at, owner_id, users!scripts_owner_id_fkey(username)';
const LEGACY =
  'id, name, description, game, is_protected, is_published, created_at, updated_at, owner_id, users!scripts_owner_id_fkey(username)';

// Cached per request so generateMetadata() and the page component share one DB hit.
export const getPublicScript = cache(async (slugOrId: string): Promise<PublicScript | null> => {
  const supabase = createServerClient();
  const key = decodeURIComponent(slugOrId);

  const lookup = async (columns: string) => {
    try {
      let { data } = await supabase.from('scripts').select(columns).eq('slug', key).maybeSingle();
      if (!data) {
        ({ data } = await supabase.from('scripts').select(columns).eq('id', key).maybeSingle());
      }
      return data as any;
    } catch {
      return null;
    }
  };

  let s = await lookup(RICH);
  if (!s) s = await lookup(LEGACY);
  if (!s || !s.is_published) return null;

  const games =
    Array.isArray(s.games) && s.games.length ? s.games : [s.game || 'Universal'];

  return {
    id: s.id,
    name: s.name,
    slug: s.slug || s.id,
    description: s.description || '',
    game: s.game || games[0],
    games,
    thumbnail_url: s.thumbnail_url ?? null,
    view_count: s.view_count ?? 0,
    is_protected: !!s.is_protected,
    created_at: s.created_at,
    updated_at: s.updated_at || s.created_at,
    owner_username: s.users?.username || 'Unknown',
    loadstring: `loadstring(game:HttpGet("${SITE_URL}/api/scripts/serve/${s.id}?key=YOUR_KEY_HERE"))()`,
  };
});

// ---------------------------------------------------------------------------
// Per-game landing pages
// ---------------------------------------------------------------------------

const CATALOG_RICH =
  'id, name, slug, game, games, thumbnail_url, view_count, is_protected, created_at, owner_id, users!scripts_owner_id_fkey(username)';
const CATALOG_LEGACY =
  'id, name, game, is_protected, created_at, owner_id, users!scripts_owner_id_fkey(username)';

// One cached fetch of the published catalog, reused by every game helper/page
// in a single request.
const getPublishedCatalog = cache(async (): Promise<any[]> => {
  const supabase = createServerClient();
  // Page through the whole published catalog (PostgREST caps one call at ~1000).
  try {
    const rows = await selectAll((from, to) =>
      supabase
        .from('scripts')
        .select(CATALOG_RICH)
        .eq('is_published', true)
        .order('view_count', { ascending: false })
        .range(from, to)
    );
    if (rows.length) return rows;
  } catch {
    /* fall through to legacy */
  }
  try {
    return await selectAll((from, to) =>
      supabase
        .from('scripts')
        .select(CATALOG_LEGACY)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .range(from, to)
    );
  } catch {
    return [];
  }
});

function scriptGameLabels(s: any): string[] {
  const arr = Array.isArray(s.games) && s.games.length ? s.games : [s.game || 'Universal'];
  return arr.map((g: any) => (typeof g === 'string' ? g.trim() : '')).filter(Boolean);
}

function toHubScript(s: any): HubScript {
  const games = scriptGameLabels(s);
  return {
    id: s.id,
    name: s.name,
    slug: s.slug || s.id,
    game: s.game || games[0] || 'Universal',
    games,
    thumbnail_url: s.thumbnail_url ?? null,
    view_count: s.view_count ?? 0,
    is_protected: !!s.is_protected,
    created_at: s.created_at,
    owner_username: s.users?.username || undefined,
  };
}

// Newest published scripts. Mirrors GET /api/scripts/catalog (default sort +
// default limit) so the homepage can server-render the same first page the
// client would have fetched, then skip that fetch on mount.
export const getRecentScripts = cache(async (limit = 100): Promise<HubScript[]> => {
  const supabase = createServerClient();
  try {
    const { data, error } = await supabase
      .from('scripts')
      .select(CATALOG_RICH)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(toHubScript);
  } catch {
    return [];
  }
});

// Most-viewed imported scripts. Mirrors GET /api/discover?sort=popular.
// Degrades to [] if migration 024 (external_source) hasn't been applied.
export const getPopularImported = cache(async (limit = 8): Promise<HubScript[]> => {
  const supabase = createServerClient();
  try {
    const { data, error } = await supabase
      .from('scripts')
      .select(CATALOG_RICH)
      .eq('is_published', true)
      .eq('external_source', IMPORT_SOURCE)
      .order('view_count', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(toHubScript);
  } catch {
    return [];
  }
});

export interface GameSummary {
  slug: string;
  name: string;
  count: number;
  lastModified: string;
}

// Every distinct game (from a script's primary game + its supported games),
// with how many scripts it has — used for the sitemap and internal links.
export const getGameSummaries = cache(async (): Promise<GameSummary[]> => {
  const rows = await getPublishedCatalog();
  const map = new Map<string, GameSummary>();
  for (const s of rows) {
    const when = s.created_at || new Date().toISOString();
    for (const label of scriptGameLabels(s)) {
      const slug = slugify(label);
      if (!slug) continue;
      const existing = map.get(slug);
      if (existing) {
        existing.count += 1;
        if (when > existing.lastModified) existing.lastModified = when;
      } else {
        map.set(slug, { slug, name: label, count: 1, lastModified: when });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
});

// All published scripts for one game slug, plus the game's display name.
// Returns null when no scripts match (page should 404 / noindex).
export const getScriptsByGameSlug = cache(
  async (slug: string): Promise<{ name: string; scripts: HubScript[] } | null> => {
    const target = decodeURIComponent(slug);
    const rows = await getPublishedCatalog();
    let name = '';
    const scripts: HubScript[] = [];
    for (const s of rows) {
      const match = scriptGameLabels(s).find((l) => slugify(l) === target);
      if (match) {
        if (!name) name = match;
        scripts.push(toHubScript(s));
      }
    }
    return name ? { name, scripts } : null;
  }
);
