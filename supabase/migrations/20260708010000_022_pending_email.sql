-- ============================================================
-- 022  Pending email change
-- change-email stores the requested new address here (not on
-- `email`) until it's verified, then the verify flow swaps it in.
-- ============================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pending_email TEXT;

-- Refresh PostgREST's schema cache so the new column is usable immediately.
NOTIFY pgrst, 'reload schema';
