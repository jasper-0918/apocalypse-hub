-- ============================================================
-- 017  Password reset / account recovery
-- Adds a hashed, single-use reset token + expiry to users so a
-- "forgot password" link can be emailed and redeemed.
-- ============================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS reset_token TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMPTZ;

-- Look up a redemption by its (hashed) token quickly.
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON public.users(reset_token);

-- Refresh PostgREST's schema cache so the new columns are usable immediately.
NOTIFY pgrst, 'reload schema';
