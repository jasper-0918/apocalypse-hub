-- ============================================================
-- 014: ScriptBlox-style interactivity + multiple supported games
--   * scripts.games[]        -> a script can support many games
--   * slug backfill + unique -> pretty /script/<slug> URLs
--   * script_reactions       -> like / dislike / favorite (per identity)
--   * script_comments        -> public comment threads
--   * script_reports         -> user reports for moderation
--   * increment_script_view  -> atomic view counter
-- Idempotent: safe to re-run.
-- ============================================================

-- ---------- Scripts: supported games + reactions counters ----------
ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS games TEXT[] NOT NULL DEFAULT '{}';

-- Backfill the array from the existing single-game column.
UPDATE public.scripts
   SET games = ARRAY[game]
 WHERE (games IS NULL OR array_length(games, 1) IS NULL)
   AND game IS NOT NULL AND game <> '';

-- ---------- Slug: generate a URL-safe slug for every script ----------
UPDATE public.scripts
   SET slug = lower(regexp_replace(regexp_replace(coalesce(name, 'script'), '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'))
              || '-' || substr(replace(id::text, '-', ''), 1, 6)
 WHERE slug IS NULL OR slug = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_scripts_slug ON public.scripts(slug);
CREATE INDEX IF NOT EXISTS idx_scripts_view_count ON public.scripts(view_count DESC);

-- ---------- Reactions: one row per (script, identity, kind) ----------
-- identity = 'u:<user_id>' for logged-in users, 'a:<anon_token>' for guests.
CREATE TABLE IF NOT EXISTS public.script_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  identity TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('like', 'dislike', 'favorite')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (script_id, identity, kind)
);
CREATE INDEX IF NOT EXISTS idx_reactions_script ON public.script_reactions(script_id);
CREATE INDEX IF NOT EXISTS idx_reactions_identity ON public.script_reactions(identity);

-- ---------- Comments ----------
CREATE TABLE IF NOT EXISTS public.script_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comments_script ON public.script_comments(script_id, created_at DESC);

-- ---------- Reports (moderation) ----------
CREATE TABLE IF NOT EXISTS public.script_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reports_script ON public.script_reports(script_id);

-- ---------- RLS ----------
ALTER TABLE public.script_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_reports ENABLE ROW LEVEL SECURITY;

-- Comments are publicly readable; all mutations flow through the service role.
DROP POLICY IF EXISTS "read_comments" ON public.script_comments;
CREATE POLICY "read_comments" ON public.script_comments
  FOR SELECT TO anon, authenticated USING (true);

-- ---------- Atomic view increment ----------
CREATE OR REPLACE FUNCTION public.increment_script_view(p_script_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.scripts SET view_count = view_count + 1 WHERE id = p_script_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.increment_script_view(UUID) FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
