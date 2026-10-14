-- Harden premium payment records without changing or backfilling legacy values.
-- Apply this migration after reviewing it on the target Supabase project.

ALTER TABLE public.premium_requests
  ADD COLUMN IF NOT EXISTS plan_id TEXT,
  ADD COLUMN IF NOT EXISTS plan_price NUMERIC(12, 2);

CREATE INDEX IF NOT EXISTS idx_premium_requests_plan_id
  ON public.premium_requests(plan_id);

ALTER TABLE public.premium_requests
  DROP CONSTRAINT IF EXISTS premium_requests_amount_nonnegative,
  DROP CONSTRAINT IF EXISTS premium_requests_plan_price_nonnegative;

ALTER TABLE public.premium_requests
  ADD CONSTRAINT premium_requests_amount_nonnegative
    CHECK (amount IS NULL OR amount >= 0),
  ADD CONSTRAINT premium_requests_plan_price_nonnegative
    CHECK (plan_price IS NULL OR plan_price >= 0);

CREATE OR REPLACE FUNCTION public.validate_premium_request_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trusted_price NUMERIC(12, 2);
BEGIN
  -- Existing trial requests are not paid orders and intentionally have no price.
  IF COALESCE(NEW.payment_screenshot, '') LIKE 'TRIAL_OFFER_%' THEN
    NEW.plan_id := NULL;
    NEW.plan_price := NULL;
    NEW.amount := 0;
    NEW.payment_method := COALESCE(NEW.payment_method, 'request');
    RETURN NEW;
  END IF;

  IF NULLIF(trim(COALESCE(NEW.plan_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'A paid premium request must include plan_id';
  END IF;

  -- Prefer the admin-controlled catalog. The fallback preserves the existing
  -- three paid plans if the catalog has not been seeded in an environment yet.
  SELECT sp.price
    INTO trusted_price
  FROM public.subscription_plans AS sp
  WHERE sp.id = NEW.plan_id AND COALESCE(sp.is_active, true) = true
  LIMIT 1;

  IF trusted_price IS NULL THEN
    trusted_price := CASE lower(NEW.plan_id)
      WHEN 'silver' THEN 150
      WHEN 'gold' THEN 300
      WHEN 'diamond' THEN 1500
      ELSE NULL
    END;
  END IF;

  IF trusted_price IS NULL THEN
    RAISE EXCEPTION 'Unknown or inactive subscription plan';
  END IF;

  -- plan_price is always server-owned; clients cannot overwrite the catalog price.
  NEW.plan_price := trusted_price;
  IF NEW.amount IS NULL THEN
    NEW.amount := trusted_price;
  END IF;

  -- Coupons may reduce the amount, but a client cannot submit a negative or
  -- greater-than-list-price amount. Coupon redemption remains its own server RPC.
  IF NEW.amount < 0 OR NEW.amount > trusted_price THEN
    RAISE EXCEPTION 'Invalid payment amount for subscription plan';
  END IF;

  IF COALESCE(NULLIF(trim(NEW.payment_method), ''), '') NOT IN ('instapay', 'vodafone', 'vodafone_cash', 'bank_transfer', 'request') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_premium_request_payment() FROM PUBLIC;

DROP TRIGGER IF EXISTS validate_premium_request_payment_before_write ON public.premium_requests;
CREATE TRIGGER validate_premium_request_payment_before_write
BEFORE INSERT OR UPDATE OF plan_id, plan_price, amount, payment_method, payment_screenshot
ON public.premium_requests
FOR EACH ROW
EXECUTE FUNCTION public.validate_premium_request_payment();

-- Keep the existing RLS boundary: users read only their own rows; admins read
-- the queue; users insert only rows whose user_id equals auth.uid().
ALTER TABLE public.premium_requests ENABLE ROW LEVEL SECURITY;
