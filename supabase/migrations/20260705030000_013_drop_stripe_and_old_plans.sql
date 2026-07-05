-- ============================================================
-- 013: Remove Stripe columns and old plan values from the database
-- Migrates any Pro/Developer users to Scripter, drops the Stripe columns,
-- and rebuilds the Plan enum to FREE + SCRIPTER only.
-- ============================================================

-- 1. Migrate leftover plan values.
UPDATE public.users SET plan = 'SCRIPTER' WHERE plan::text IN ('PRO', 'DEVELOPER');

-- 2. Drop Stripe columns (no longer used — payments are manual).
ALTER TABLE public.users DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE public.users DROP COLUMN IF EXISTS stripe_subscription_id;

-- 3. Rebuild the Plan enum with only FREE + SCRIPTER.
ALTER TABLE public.users ALTER COLUMN plan DROP DEFAULT;
ALTER TABLE public.users ALTER COLUMN plan TYPE TEXT;
DROP TYPE IF EXISTS public."Plan";
CREATE TYPE public."Plan" AS ENUM ('FREE', 'SCRIPTER');
ALTER TABLE public.users ALTER COLUMN plan TYPE public."Plan" USING plan::public."Plan";
ALTER TABLE public.users ALTER COLUMN plan SET DEFAULT 'FREE';

NOTIFY pgrst, 'reload schema';
