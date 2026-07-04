ALTER TABLE public.keys ADD COLUMN IF NOT EXISTS is_paid_key boolean DEFAULT false;
