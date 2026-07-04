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