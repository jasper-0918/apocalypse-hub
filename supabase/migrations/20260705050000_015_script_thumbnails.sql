-- ============================================================
-- 015: Script thumbnails
--   * scripts.thumbnail_url -> optional cover image per script
--   * public 'script-thumbnails' Storage bucket for uploads
-- Idempotent: safe to re-run.
-- ============================================================

ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Public bucket so uploaded covers can be served directly via getPublicUrl.
INSERT INTO storage.buckets (id, name, public)
VALUES ('script-thumbnails', 'script-thumbnails', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow anyone to read objects in this bucket (covers are public anyway).
DROP POLICY IF EXISTS "Public read script thumbnails" ON storage.objects;
CREATE POLICY "Public read script thumbnails" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'script-thumbnails');

NOTIFY pgrst, 'reload schema';
