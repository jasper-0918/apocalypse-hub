-- Backfill migrations 009 + 010 (idempotent — safe to re-run)


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
