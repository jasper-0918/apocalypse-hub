-- ============================================================
-- 024: Tag scripts imported from an external source (ScriptBlox).
--   * external_source / external_id let us de-dupe on re-import and
--     tell imported scripts apart from a creator's own uploads.
--   * A partial unique index keys the upsert (only imported rows are
--     constrained; normal uploads keep external_id = NULL).
-- Idempotent: safe to re-run.
-- ============================================================

ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS external_source TEXT;
ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS external_id TEXT;

-- One row per (source, external_id) — the upsert conflict target for re-imports.
-- Normal uploads leave both columns NULL; Postgres treats NULLs as DISTINCT, so
-- any number of NULL/NULL upload rows are allowed (they never conflict here).
CREATE UNIQUE INDEX IF NOT EXISTS idx_scripts_external
  ON public.scripts(external_source, external_id);

-- Fast "show me the imported catalog" lookups (Discover page).
CREATE INDEX IF NOT EXISTS idx_scripts_external_source
  ON public.scripts(external_source)
  WHERE external_source IS NOT NULL;

NOTIFY pgrst, 'reload schema';
