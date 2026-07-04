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