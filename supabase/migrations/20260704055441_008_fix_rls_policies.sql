-- Fix roblox_games: restrict write policies to service role only
-- (backend API uses service role which bypasses RLS; direct client writes should be blocked)
DROP POLICY IF EXISTS "insert_games" ON public.roblox_games;
DROP POLICY IF EXISTS "update_games" ON public.roblox_games;
DROP POLICY IF EXISTS "delete_games" ON public.roblox_games;

CREATE POLICY "insert_games" ON public.roblox_games
  FOR INSERT TO authenticated WITH CHECK (false);

CREATE POLICY "update_games" ON public.roblox_games
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "delete_games" ON public.roblox_games
  FOR DELETE TO authenticated USING (false);

-- Fix support_tickets: restrict all write policies to service role only
DROP POLICY IF EXISTS "insert_tickets_anon" ON public.support_tickets;
DROP POLICY IF EXISTS "insert_tickets_auth" ON public.support_tickets;
DROP POLICY IF EXISTS "update_tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "delete_tickets" ON public.support_tickets;

CREATE POLICY "insert_tickets_auth" ON public.support_tickets
  FOR INSERT TO authenticated WITH CHECK (false);

CREATE POLICY "insert_tickets_anon" ON public.support_tickets
  FOR INSERT TO anon WITH CHECK (false);

CREATE POLICY "update_tickets" ON public.support_tickets
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "delete_tickets" ON public.support_tickets
  FOR DELETE TO authenticated USING (false);
