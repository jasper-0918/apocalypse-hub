-- ============================================================
-- 019  Login tracking (for "new sign-in" alerts)
-- Remembers the last sign-in IP/time so we only email an alert
-- when a login comes from a new IP, not on every routine login.
-- ============================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_ip TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Refresh PostgREST's schema cache so the new columns are usable immediately.
NOTIFY pgrst, 'reload schema';
