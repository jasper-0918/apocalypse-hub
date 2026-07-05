-- ============================================================
-- Apocalypse Hub — full reset + setup (run once in the REAL Supabase SQL Editor)
-- Safe: there is no real data yet. Drops our objects, then rebuilds everything.
-- ============================================================

DROP TABLE IF EXISTS
  public.key_unlocks, public.payout_requests, public.script_completions,
  public.script_keys, public.daily_key_pool_keys, public.daily_key_pools,
  public.key_requests, public.sessions, public.accounts, public.keys,
  public.support_tickets, public.roblox_games, public.scripts, public.users
  CASCADE;
DROP TYPE IF EXISTS public."Role" CASCADE;
DROP TYPE IF EXISTS public."Plan" CASCADE;



-- === 20260611102709_001_create_apocalypse_hub_schema.sql ===

-- Apocalypse Hub Schema

-- Enums
CREATE TYPE public."Role" AS ENUM ('USER', 'ADMIN');
CREATE TYPE public."Plan" AS ENUM ('FREE', 'PRO', 'SCRIPTER', 'DEVELOPER');

-- Users table
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role public."Role" NOT NULL DEFAULT 'USER',
  plan public."Plan" NOT NULL DEFAULT 'FREE',
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Scripts table
CREATE TABLE public.scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  original_content TEXT NOT NULL,
  obfuscated_hash TEXT NOT NULL,
  is_protected BOOLEAN NOT NULL DEFAULT true,
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Keys table
CREATE TABLE public.keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_used BOOLEAN NOT NULL DEFAULT false,
  assigned_to UUID REFERENCES public.users(id),
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Script-Keys junction table
CREATE TABLE public.script_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  key_id UUID NOT NULL REFERENCES public.keys(id) ON DELETE CASCADE,
  UNIQUE(script_id, key_id)
);

-- Key Requests table
CREATE TABLE public.key_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fulfilled BOOLEAN NOT NULL DEFAULT false,
  key_id UUID
);

-- Daily Key Pool table
CREATE TABLE public.daily_key_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT UNIQUE NOT NULL,
  generated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily key pool keys junction
CREATE TABLE public.daily_key_pool_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES public.daily_key_pools(id) ON DELETE CASCADE,
  key_id UUID NOT NULL REFERENCES public.keys(id) ON DELETE CASCADE,
  UNIQUE(pool_id, key_id)
);

-- Sessions table for NextAuth
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Accounts table for NextAuth
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  UNIQUE(provider, provider_account_id)
);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_key_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_key_pool_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "select_own_user" ON public.users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "insert_own_user" ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "update_own_user" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "delete_own_user" ON public.users FOR DELETE TO authenticated USING (auth.uid() = id);

-- Scripts policies
CREATE POLICY "select_own_scripts" ON public.scripts FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "insert_own_scripts" ON public.scripts FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "update_own_scripts" ON public.scripts FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "delete_own_scripts" ON public.scripts FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- Keys policies
CREATE POLICY "select_own_keys" ON public.keys FOR SELECT TO authenticated USING (assigned_to = auth.uid());
CREATE POLICY "insert_own_keys" ON public.keys FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_keys" ON public.keys FOR UPDATE TO authenticated USING (assigned_to = auth.uid());
CREATE POLICY "delete_own_keys" ON public.keys FOR DELETE TO authenticated USING (assigned_to = auth.uid());

-- Script keys policies
CREATE POLICY "select_own_script_keys" ON public.script_keys FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.scripts WHERE scripts.id = script_keys.script_id AND scripts.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.keys WHERE keys.id = script_keys.key_id AND keys.assigned_to = auth.uid())
);
CREATE POLICY "insert_own_script_keys" ON public.script_keys FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.scripts WHERE scripts.id = script_keys.script_id AND scripts.owner_id = auth.uid())
);
CREATE POLICY "delete_own_script_keys" ON public.script_keys FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.scripts WHERE scripts.id = script_keys.script_id AND scripts.owner_id = auth.uid())
);

-- Key requests policies
CREATE POLICY "select_own_key_requests" ON public.key_requests FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "insert_own_key_requests" ON public.key_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Daily key pools - admin only (broad read for serve endpoint, strict write)
CREATE POLICY "select_daily_key_pools" ON public.daily_key_pools FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_daily_key_pools" ON public.daily_key_pools FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_daily_key_pools" ON public.daily_key_pools FOR UPDATE TO authenticated USING (true);

-- Daily key pool keys
CREATE POLICY "select_daily_key_pool_keys" ON public.daily_key_pool_keys FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_daily_key_pool_keys" ON public.daily_key_pool_keys FOR INSERT TO authenticated WITH CHECK (true);

-- Sessions policies
CREATE POLICY "select_own_sessions" ON public.sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "insert_own_sessions" ON public.sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "delete_own_sessions" ON public.sessions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Accounts policies
CREATE POLICY "select_own_accounts" ON public.accounts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "insert_own_accounts" ON public.accounts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "delete_own_accounts" ON public.accounts FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Index for performance
CREATE INDEX idx_scripts_owner ON public.scripts(owner_id);
CREATE INDEX idx_keys_assigned_to ON public.keys(assigned_to);
CREATE INDEX idx_keys_value ON public.keys(value);
CREATE INDEX idx_key_requests_user ON public.key_requests(user_id);
CREATE INDEX idx_sessions_token ON public.sessions(session_token);
CREATE INDEX idx_accounts_provider ON public.accounts(provider, provider_account_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_scripts_updated_at BEFORE UPDATE ON public.scripts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- === 20260611112437_002_add_script_catalog_and_anon_keys.sql ===

-- Add catalog fields to scripts
ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS game TEXT DEFAULT '';
ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false;

-- Allow keys to be claimed by anonymous users (no account needed)
-- Add a session_id field to track anonymous key claims
ALTER TABLE public.keys ADD COLUMN IF NOT EXISTS claimed_by_session TEXT;

-- Add index for published scripts
CREATE INDEX IF NOT EXISTS idx_scripts_published ON public.scripts(is_published) WHERE is_published = true;

-- Allow public read of published scripts
CREATE POLICY "select_published_scripts" ON public.scripts FOR SELECT TO anon USING (is_published = true);

-- Allow anon role to validate keys
CREATE POLICY "select_keys_for_validation" ON public.keys FOR SELECT TO anon USING (true);

-- Allow anon to read daily key pools
CREATE POLICY "select_daily_key_pools_anon" ON public.daily_key_pools FOR SELECT TO anon USING (true);
CREATE POLICY "select_daily_key_pool_keys_anon" ON public.daily_key_pool_keys FOR SELECT TO anon USING (true);

-- Allow anon to insert key requests
CREATE POLICY "insert_key_requests_anon" ON public.key_requests FOR INSERT TO anon WITH CHECK (true);

-- Allow anon to update keys (for activation)
CREATE POLICY "update_keys_anon" ON public.keys FOR UPDATE TO anon USING (true);

-- Grant anon role usage
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.scripts TO anon;
GRANT SELECT ON public.keys TO anon;
GRANT SELECT ON public.daily_key_pools TO anon;
GRANT SELECT ON public.daily_key_pool_keys TO anon;
GRANT INSERT ON public.key_requests TO anon;
GRANT UPDATE ON public.keys TO anon;
GRANT INSERT ON public.daily_key_pools TO anon;
GRANT INSERT ON public.daily_key_pool_keys TO anon;
GRANT SELECT ON public.script_keys TO anon;

-- === 20260612035550_004_security_fixes.sql ===

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


-- === 20260613040311_005_revoke_trigger_fn_public_execute.sql ===

-- Revoke the default PUBLIC execute grant on the trigger function.
-- PostgreSQL grants EXECUTE to PUBLIC for all new functions, which means
-- anon and authenticated can call it via /rest/v1/rpc even after per-role
-- revokes. Revoking from PUBLIC closes that gap entirely.
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM authenticated;


-- === 20260613043032_006_add_owner_role_games_support.sql ===

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


-- === 20260614110115_007_add_is_paid_key.sql ===

ALTER TABLE public.keys ADD COLUMN IF NOT EXISTS is_paid_key boolean DEFAULT false;


-- === 20260704055441_008_fix_rls_policies.sql ===

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


-- === 20260704120000_009_marketplace_earnings_plans.sql ===

-- ============================================================
-- 009: Two-plan model, script slots, creator earnings & payouts
-- Combines ScriptBlox-style marketplace with per-completion payouts.
-- Idempotent: safe to re-run.
-- ============================================================

-- ---------- Plan model: collapse to FREE + SCRIPTER ----------
-- The Plan enum still contains PRO/DEVELOPER (Postgres can't easily drop enum
-- values); we simply migrate anyone on them to SCRIPTER and stop offering them.
UPDATE public.users SET plan = 'SCRIPTER' WHERE plan IN ('PRO', 'DEVELOPER');

-- ---------- Users: slots, balances, custom key expiry ----------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS extra_slot_packs INT NOT NULL DEFAULT 0;      -- each pack = +50 script slots ($10)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS balance_usd NUMERIC(12,4) NOT NULL DEFAULT 0; -- withdrawable, net of commission
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS lifetime_earnings_usd NUMERIC(12,4) NOT NULL DEFAULT 0; -- drives seller tier
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS key_expiry_hours INT; -- Scripter-configurable free-key lifetime

-- ---------- Scripts: marketplace counters ----------
ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS completion_count INT NOT NULL DEFAULT 0; -- key-system completions (traffic → earnings)
ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS view_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE INDEX IF NOT EXISTS idx_scripts_completion_count ON public.scripts(completion_count DESC);

-- ---------- Completions: one row per key-system unlock of a script ----------
CREATE TABLE IF NOT EXISTS public.script_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, -- credited creator
  claimer_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,  -- null for anonymous
  claimer_session TEXT,
  provider TEXT,                          -- 'workink' | 'linkvertise' | etc.
  gross_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
  commission_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
  net_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_completions_owner ON public.script_completions(owner_id);
CREATE INDEX IF NOT EXISTS idx_completions_script ON public.script_completions(script_id);
CREATE INDEX IF NOT EXISTS idx_completions_created ON public.script_completions(created_at DESC);

-- ---------- Payout requests (USD or Robux withdrawals) ----------
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'ROBUX')),
  amount_usd NUMERIC(12,4) NOT NULL,        -- gross debited from balance
  fee_usd NUMERIC(12,4) NOT NULL DEFAULT 0, -- withdrawal fee
  net_usd NUMERIC(12,4) NOT NULL,           -- what the creator effectively receives (USD value)
  robux_amount INT,                         -- populated when currency = ROBUX
  destination TEXT,                         -- PayPal email / Roblox username
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_payouts_user ON public.payout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payout_requests(status);

-- ---------- RLS ----------
ALTER TABLE public.script_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- Creators can read completions/payouts that belong to them. Writes go through
-- the API using the service role (which bypasses RLS), so no INSERT policy needed.
DROP POLICY IF EXISTS "select_own_completions" ON public.script_completions;
CREATE POLICY "select_own_completions" ON public.script_completions
  FOR SELECT TO authenticated USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "select_own_payouts" ON public.payout_requests;
CREATE POLICY "select_own_payouts" ON public.payout_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "insert_own_payouts" ON public.payout_requests;
CREATE POLICY "insert_own_payouts" ON public.payout_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ---------- Atomic balance credit helper ----------
-- Credits a creator's balance and lifetime earnings in one shot (called by the
-- service role from the key-claim route). SECURITY DEFINER so it runs as owner.
CREATE OR REPLACE FUNCTION public.credit_creator_earnings(p_user_id UUID, p_net NUMERIC)
RETURNS void AS $$
BEGIN
  UPDATE public.users
     SET balance_usd = balance_usd + p_net,
         lifetime_earnings_usd = lifetime_earnings_usd + p_net
   WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.credit_creator_earnings(UUID, NUMERIC) FROM PUBLIC, anon, authenticated;

-- Atomically debit a balance for a withdrawal. Returns TRUE only if the user
-- had sufficient funds (prevents double-spend / negative balances).
CREATE OR REPLACE FUNCTION public.debit_creator_balance(p_user_id UUID, p_amount NUMERIC)
RETURNS BOOLEAN AS $$
DECLARE
  ok BOOLEAN;
BEGIN
  UPDATE public.users
     SET balance_usd = balance_usd - p_amount
   WHERE id = p_user_id AND balance_usd >= p_amount
  RETURNING TRUE INTO ok;
  RETURN COALESCE(ok, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.debit_creator_balance(UUID, NUMERIC) FROM PUBLIC, anon, authenticated;


-- === 20260704130000_010_key_gate_antibypass.sql ===

-- ============================================================
-- 010: Anti-bypass key gate
-- A key is only issued after a provider (Linkvertise / Work.ink / Lootlabs)
-- confirms completion via server-side postback against a single-use token.
-- Idempotent.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.key_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,               -- unguessable single-use nonce (passed to provider as subid)
  script_id UUID REFERENCES public.scripts(id) ON DELETE CASCADE, -- which script is being unlocked (for earnings)
  provider TEXT NOT NULL,                    -- 'linkvertise' | 'workink' | 'lootlabs'
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  session_id TEXT,                           -- anonymous claimer identity
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'claimed')),
  verified_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_key_unlocks_token ON public.key_unlocks(token);
CREATE INDEX IF NOT EXISTS idx_key_unlocks_status ON public.key_unlocks(status);
CREATE INDEX IF NOT EXISTS idx_key_unlocks_created ON public.key_unlocks(created_at DESC);

-- All access is via the service role (start / callback / claim routes), so RLS
-- stays on with no public policies — clients can never read or forge tokens.
ALTER TABLE public.key_unlocks ENABLE ROW LEVEL SECURITY;


-- Refresh PostgREST schema cache so the API sees the new tables immediately
NOTIFY pgrst, 'reload schema';
