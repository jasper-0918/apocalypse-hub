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
