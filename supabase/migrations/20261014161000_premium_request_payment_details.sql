-- Store the exact amount and selected transfer method with every premium request.
-- Existing rows remain valid and can be backfilled by administrators when needed.
ALTER TABLE public.premium_requests
  ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS payment_method TEXT;

ALTER TABLE public.premium_requests
  DROP CONSTRAINT IF EXISTS premium_requests_payment_method_check;

ALTER TABLE public.premium_requests
  ADD CONSTRAINT premium_requests_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('instapay', 'vodafone', 'vodafone_cash', 'bank_transfer', 'request'));

CREATE INDEX IF NOT EXISTS idx_premium_requests_status_created_at
  ON public.premium_requests(status, created_at DESC);
