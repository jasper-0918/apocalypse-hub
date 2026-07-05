-- ============================================================
-- 011: Manual payment orders (GCash / PayPal / Wise / bank)
-- Replaces Stripe: customers submit a payment reference, the owner approves,
-- and the plan/slots activate. Idempotent.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('scripter', 'slots')),
  label TEXT NOT NULL,
  amount_usd NUMERIC(10,2) NOT NULL,
  method TEXT NOT NULL,          -- gcash | paypal | wise | bank
  reference TEXT NOT NULL,       -- transaction / reference number the payer provides
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user ON public.payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON public.payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_created ON public.payment_orders(created_at DESC);

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- Customers can read/create their own orders; owner actions go through the
-- service role (bypasses RLS).
DROP POLICY IF EXISTS "select_own_orders" ON public.payment_orders;
CREATE POLICY "select_own_orders" ON public.payment_orders
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "insert_own_orders" ON public.payment_orders;
CREATE POLICY "insert_own_orders" ON public.payment_orders
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
