-- Allow only the trusted coupon-redemption RPC to update entitlement columns.
-- Direct client profile updates remain protected by the trigger.
CREATE OR REPLACE FUNCTION public.protect_privileged_user_columns()
RETURNS TRIGGER AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_is_service_role BOOLEAN;
  v_badge_update_allowed BOOLEAN;
  v_subscription_update_allowed BOOLEAN;
BEGIN
  v_is_service_role := (auth.jwt() ->> 'role') = 'service_role';
  IF v_is_service_role THEN RETURN NEW; END IF;

  SELECT is_admin INTO v_is_admin FROM public.users WHERE uid = auth.uid()::text;
  IF COALESCE(v_is_admin, false) THEN
    NEW.is_admin := OLD.is_admin;
    RETURN NEW;
  END IF;

  v_badge_update_allowed := COALESCE(current_setting('app.allow_badge_update', true), '') = 'on';
  v_subscription_update_allowed := COALESCE(current_setting('app.allow_subscription_update', true), '') = 'on';

  IF NOT v_subscription_update_allowed THEN
    NEW.is_premium := OLD.is_premium;
    NEW.plan_id := OLD.plan_id;
    NEW.plan_name := OLD.plan_name;
    NEW.is_lifetime := OLD.is_lifetime;
    NEW.is_founder := OLD.is_founder;
    NEW.is_suspended := OLD.is_suspended;
    NEW.category_id := OLD.category_id;
    NEW.renewal_date := OLD.renewal_date;
  END IF;

  NEW.is_admin := OLD.is_admin;
  IF NOT v_badge_update_allowed THEN
    NEW.badge_tier := OLD.badge_tier;
    NEW.name_color := OLD.name_color;
    NEW.badge_color := OLD.badge_color;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  IF auth.uid()::text <> p_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  PERFORM set_config('app.allow_subscription_update', 'on', true);
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
  IF v_rows <> 1 THEN RAISE EXCEPTION 'User profile not found'; END IF;
  RETURN v_usage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.redeem_coupon_for_user(TEXT,TEXT,INTEGER,TEXT,TEXT,TEXT,TIMESTAMPTZ) TO authenticated;
NOTIFY pgrst, 'reload schema';
