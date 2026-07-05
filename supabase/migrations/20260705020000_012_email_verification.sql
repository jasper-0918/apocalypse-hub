-- ============================================================
-- 012: Email verification columns
-- Default TRUE so existing accounts stay verified; new signups get set to FALSE
-- by the register route when email is configured. Idempotent.
-- ============================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS verification_code TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS verification_expires TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';
