-- Atomic 100% coupon redemption: usage count, usage row and entitlement
-- either all succeed or none of them is committed.
CREATE OR REPLACE FUNCTION public.redeem_coupon_for_user(
  p_coupon_id TEXT,
  p_user_id TEXT,
  p_discount_percent INTEGER,
  p_plan_id TEXT,
  p_plan_name TEXT,
  p_order_id TEXT,
  p_renewal_date TIMESTAMPTZ
) RETURNS TEXT AS $$
DECLARE
  v_usage_id TEXT;
  v_rows INTEGER;
BEGIN
  IF auth.uid()::text <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_usage_id := public.record_coupon_usage(
    p_coupon_id, p_user_id, p_discount_percent, p_plan_id, p_order_id
  );

  UPDATE public.users
     SET is_premium = true,
         plan_name = p_plan_name,
         plan_id = p_plan_id,
         is_lifetime = false,
         is_founder = false,
         renewal_date = p_renewal_date,
         updated_at = now()
   WHERE uid = p_user_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  RETURN v_usage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.redeem_coupon_for_user(TEXT,TEXT,INTEGER,TEXT,TEXT,TEXT,TIMESTAMPTZ) TO authenticated;
NOTIFY pgrst, 'reload schema';
