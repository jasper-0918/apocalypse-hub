-- ============================================================
-- 018  Session token versioning ("log out everywhere")
-- Each session JWT embeds the user's token_version. Bumping this
-- column invalidates every previously-issued token for that user.
-- ============================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

-- Refresh PostgREST's schema cache so the new column is usable immediately.
NOTIFY pgrst, 'reload schema';
