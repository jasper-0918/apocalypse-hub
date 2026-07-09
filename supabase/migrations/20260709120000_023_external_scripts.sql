-- ============================================================
-- 023: external_scripts — a discovery catalog scraped from
--      public sources (currently ScriptBlox). These are NOT our
--      own uploads: they're read-only "Discover" listings that
--      link back to the source. All reads/writes go through the
--      service role (API routes), so no public RLS is required.
-- Idempotent: safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.external_scripts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source       TEXT NOT NULL DEFAULT 'scriptblox',
  external_id  TEXT NOT NULL,                 -- the source's own id (e.g. ScriptBlox _id)
  title        TEXT NOT NULL,
  slug         TEXT,                          -- source slug (used to build the source URL)
  game_name    TEXT NOT NULL DEFAULT 'Universal',
  game_image   TEXT,                          -- game thumbnail from the source
  image        TEXT,                          -- script cover image
  script       TEXT,                          -- the raw loadstring / script body
  script_url   TEXT,                          -- canonical page on the source site
  script_type  TEXT NOT NULL DEFAULT 'free'   CHECK (script_type IN ('free', 'paid')),
  is_key       BOOLEAN NOT NULL DEFAULT false, -- needs a key system
  is_universal BOOLEAN NOT NULL DEFAULT false,
  is_verified  BOOLEAN NOT NULL DEFAULT false,
  is_patched   BOOLEAN NOT NULL DEFAULT false,
  views        BIGINT  NOT NULL DEFAULT 0,
  source_created_at TIMESTAMPTZ,              -- when it was created on the source
  synced_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_external_scripts_views     ON public.external_scripts(views DESC);
CREATE INDEX IF NOT EXISTS idx_external_scripts_created   ON public.external_scripts(source_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_scripts_patched   ON public.external_scripts(is_patched);

-- Full-text-ish search helper on title + game (trigram would be nicer, but ILIKE
-- on these indexed-by-nothing columns is fine at this catalog size).
CREATE INDEX IF NOT EXISTS idx_external_scripts_title ON public.external_scripts(lower(title));

ALTER TABLE public.external_scripts ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policies on purpose: the Discover API reads with the
-- service role. RLS-on with no policy = locked to service role only.

NOTIFY pgrst, 'reload schema';
