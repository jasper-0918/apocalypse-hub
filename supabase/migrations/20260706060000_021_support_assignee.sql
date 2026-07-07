-- ============================================================
-- 021  Support ticket assignee ("claim")
-- Lets a staff member claim a ticket so two people don't work
-- the same one.
-- ============================================================

ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS assigned_username TEXT;

-- Refresh PostgREST's schema cache so the new columns are usable immediately.
NOTIFY pgrst, 'reload schema';
