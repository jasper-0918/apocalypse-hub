-- ============================================================
-- 026: Composite/partial indexes for the public catalog & discover
--      filter+sort paths. As the imported catalog grows past a few
--      thousand rows, these let Postgres satisfy the WHERE filter and
--      the ORDER BY from a single index instead of scanning + sorting.
--
-- Query shapes served:
--   * Catalog "recent":   WHERE is_published ORDER BY created_at DESC
--   * Catalog "trending": WHERE is_published ORDER BY view_count DESC
--   * Discover:           WHERE is_published AND external_source = ?
--                         ORDER BY view_count DESC | created_at DESC
--
-- All partial on is_published = true (the only rows these public queries
-- ever read), so the indexes stay small. Idempotent + additive: safe to
-- re-run and safe to apply while the app is live. The table is small, so
-- plain CREATE INDEX is instant; on a very large table prefer CONCURRENTLY.
-- ============================================================

-- Catalog, recent (homepage default).
CREATE INDEX IF NOT EXISTS idx_scripts_pub_created
  ON public.scripts (created_at DESC)
  WHERE is_published = true;

-- Catalog, trending (homepage/trending sort).
CREATE INDEX IF NOT EXISTS idx_scripts_pub_views
  ON public.scripts (view_count DESC)
  WHERE is_published = true;

-- Discover, popular (imported catalog, sorted by views).
CREATE INDEX IF NOT EXISTS idx_scripts_source_pub_views
  ON public.scripts (external_source, view_count DESC)
  WHERE is_published = true;

-- Discover, latest (imported catalog, sorted by recency).
CREATE INDEX IF NOT EXISTS idx_scripts_source_pub_created
  ON public.scripts (external_source, created_at DESC)
  WHERE is_published = true;
