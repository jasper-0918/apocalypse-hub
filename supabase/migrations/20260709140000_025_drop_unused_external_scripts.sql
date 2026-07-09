-- ============================================================
-- 025 (OPTIONAL cleanup): drop the unused external_scripts table.
--
-- Migration 023 created external_scripts for a standalone "Discover" catalog,
-- but the feature was reworked to import ScriptBlox scripts directly into the
-- real `scripts` table (owned + key-gated), so external_scripts is now dead.
-- It's empty and referenced by nothing in the app — safe to drop. Optional:
-- leaving it costs nothing; running this just tidies the schema.
-- ============================================================

DROP TABLE IF EXISTS public.external_scripts;

NOTIFY pgrst, 'reload schema';
