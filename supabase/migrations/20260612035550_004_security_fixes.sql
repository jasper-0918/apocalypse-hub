-- Fix 1: Mutable search_path on trigger function
ALTER FUNCTION public.update_updated_at() SET search_path = public, pg_temp;

-- Fix 2: Revoke direct execution of SECURITY DEFINER trigger function
-- It is a trigger function and should only fire via trigger, not via RPC
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM authenticated;

-- Fix 3: daily_key_pool_keys — drop unrestricted INSERT policy for authenticated
-- The server uses service_role (bypasses RLS), so regular authenticated users
-- have no legitimate reason to insert directly into this table.
DROP POLICY IF EXISTS "insert_daily_key_pool_keys" ON public.daily_key_pool_keys;

-- Fix 4: daily_key_pools — drop unrestricted INSERT policy for authenticated
DROP POLICY IF EXISTS "insert_daily_key_pools" ON public.daily_key_pools;

-- Fix 5: daily_key_pools — drop unrestricted UPDATE policy for authenticated
DROP POLICY IF EXISTS "update_daily_key_pools" ON public.daily_key_pools;

-- Fix 6: key_requests — tighten anon INSERT: only allow rows where user_id is NULL
-- (prevents anonymous clients from spoofing an authenticated user_id)
DROP POLICY IF EXISTS "insert_key_requests_anon" ON public.key_requests;
CREATE POLICY "insert_key_requests_anon" ON public.key_requests
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

-- Fix 7: keys — drop unrestricted INSERT for authenticated
-- Keys are only ever created by the admin pool-generation API (service_role).
DROP POLICY IF EXISTS "insert_own_keys" ON public.keys;

-- Fix 8: keys — drop unrestricted UPDATE for anon
-- Key activation is performed server-side via service_role; anon clients
-- must never directly update key rows.
DROP POLICY IF EXISTS "update_keys_anon" ON public.keys;
