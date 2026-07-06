import { cache } from 'react';
import { createServerClient } from '@/lib/supabase/server';
import { SITE_URL } from '@/lib/seo';

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
