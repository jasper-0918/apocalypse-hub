-- ============================================================
-- 020  Profile fields (display name + avatar)
-- Lets users set a friendly display name and profile picture,
-- separate from their immutable username.
-- ============================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Refresh PostgREST's schema cache so the new columns are usable immediately.
NOTIFY pgrst, 'reload schema';
