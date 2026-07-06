-- ============================================================
-- 015: Script thumbnails
--   * scripts.thumbnail_url -> optional cover image per script
--   * public 'script-thumbnails' Storage bucket for uploads
-- The upload API also self-creates the bucket on first use, so this bucket
-- insert is just a convenience. Idempotent: safe to re-run.
-- ============================================================

ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Public bucket so uploaded covers can be served directly via getPublicUrl.
-- (No storage.objects policy needed: public buckets are served without RLS.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('script-thumbnails', 'script-thumbnails', true)
ON CONFLICT (id) DO UPDATE SET public = true;

NOTIFY pgrst, 'reload schema';
