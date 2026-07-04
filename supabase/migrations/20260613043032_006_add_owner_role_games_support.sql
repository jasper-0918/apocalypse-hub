-- Add OWNER to Role enum (note: capitalized "Role")
ALTER TYPE public."Role" ADD VALUE IF NOT EXISTS 'OWNER';

-- Roblox games catalog (editable by owner/admin)
CREATE TABLE IF NOT EXISTS public.roblox_games (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.roblox_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_games_anon" ON public.roblox_games
  FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "select_games_auth" ON public.roblox_games
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_games" ON public.roblox_games
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_games" ON public.roblox_games
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_games" ON public.roblox_games
  FOR DELETE TO authenticated USING (true);

INSERT INTO public.roblox_games (name, display_order) VALUES
  ('Universal',        0),
  ('Blox Fruits',      1),
  ('Pet Simulator X',  2),
  ('Murder Mystery 2', 3),
  ('Da Hood',          4),
  ('Arsenal',          5),
  ('Adopt Me!',        6),
  ('Doors',            7),
  ('Brookhaven',       8)
ON CONFLICT (name) DO NOTHING;

-- Support tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  username text,
  email text,
  subject text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  response text,
  responded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_tickets_anon" ON public.support_tickets
  FOR SELECT TO anon USING (false);
CREATE POLICY "select_tickets_auth" ON public.support_tickets
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_tickets_anon" ON public.support_tickets
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "insert_tickets_auth" ON public.support_tickets
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_tickets" ON public.support_tickets
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_tickets" ON public.support_tickets
  FOR DELETE TO authenticated USING (true);
