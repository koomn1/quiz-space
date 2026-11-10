-- Seed the canonical paid plan catalog and make coupon activation server-authoritative.
INSERT INTO public.subscription_plans
(id,name,name_ar,price,currency,duration_months,features,badge_style,badge_color,priority_level,is_lifetime,is_active)
VALUES
(
  'silver','Silver Scholar','الباقة الفضية',150,'EGP',1,
  ARRAY['Cosmo AI assistant','15 AI quizzes monthly','Detailed PDF reports'],
  'pro','#6366f1',2,FALSE,TRUE
),
(
  'gold','Educator Gold','الباقة الذهبية للمعلمين',300,'EGP',1,
  ARRAY['Unlimited AI quiz generation','Class leaderboards','Detailed classroom reports'],
  'premium','#f59e0b',3,FALSE,TRUE
),
(
  'diamond','Diamond Elite VIP','الباقة الماسية للمؤسسات',1500,'EGP',1,
  ARRAY['Institution and multi-teacher access','Excel and PDF exports','Advanced learning analytics'],
  'enterprise','#06b6d4',4,FALSE,TRUE
)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.redeem_coupon_for_user_v2(
  p_coupon_id TEXT,
  p_user_id TEXT,
  p_plan_id TEXT,
  p_order_id TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_coupon public.coupon_codes%ROWTYPE;
  v_plan public.subscription_plans%ROWTYPE;
  v_user public.users%ROWTYPE;
  v_usage_id TEXT;
  v_start_at TIMESTAMPTZ;
  v_renewal_date TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS NULL OR auth.uid()::TEXT <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_coupon
  FROM public.coupon_codes
  WHERE id = trim(p_coupon_id)
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Coupon not found'; END IF;
  IF NOT v_coupon.is_active OR (v_coupon.expiry_date IS NOT NULL AND v_coupon.expiry_date <= now()) THEN
    RAISE EXCEPTION 'Coupon is inactive or expired';
  END IF;
  IF v_coupon.discount_percent <> 100 THEN
    RAISE EXCEPTION 'Only fully discounted coupons can activate a membership';
  END IF;
  IF v_coupon.used_count >= v_coupon.max_uses THEN RAISE EXCEPTION 'Coupon usage limit reached'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.coupon_usages
    WHERE coupon_id = v_coupon.id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'User has already used this coupon';
  END IF;

  SELECT * INTO v_plan
  FROM public.subscription_plans
  WHERE id = trim(p_plan_id) AND is_active = TRUE AND is_lifetime = FALSE
  FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subscription plan is unavailable'; END IF;

  IF COALESCE(NULLIF(trim(v_coupon.applicable_plans), ''), '') <> ''
     AND NOT EXISTS (
       SELECT 1
       FROM unnest(string_to_array(lower(v_coupon.applicable_plans), ',')) AS allowed(plan)
       WHERE trim(allowed.plan) = lower(v_plan.id)
     ) THEN
    RAISE EXCEPTION 'Coupon is not valid for this plan';
  END IF;

  SELECT * INTO v_user
  FROM public.users
  WHERE uid = p_user_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User profile not found'; END IF;

  IF COALESCE(v_user.is_lifetime,FALSE) OR COALESCE(v_user.is_founder,FALSE) THEN
    RAISE EXCEPTION 'Lifetime and founder memberships cannot be replaced by a coupon';
  END IF;

  IF public.effective_membership_active(
    v_user.is_premium,v_user.is_lifetime,v_user.is_founder,v_user.renewal_date
  ) AND v_user.renewal_date IS NULL THEN
    RAISE EXCEPTION 'An indefinite active membership cannot be replaced by a coupon';
  END IF;

  IF public.effective_membership_active(
    v_user.is_premium,v_user.is_lifetime,v_user.is_founder,v_user.renewal_date
  ) THEN
    v_start_at := GREATEST(now(),v_user.renewal_date);
  ELSE
    v_start_at := now();
  END IF;
  v_renewal_date := v_start_at + make_interval(months => GREATEST(1,v_plan.duration_months));

  PERFORM set_config('app.allow_subscription_update','on',TRUE);
  v_usage_id := public.record_coupon_usage(
    v_coupon.id,p_user_id,v_coupon.discount_percent,v_plan.id,NULLIF(trim(p_order_id),'')
  );

  UPDATE public.users
  SET is_premium = TRUE,
      plan_name = v_plan.name,
      plan_id = v_plan.id,
      is_lifetime = FALSE,
      is_founder = FALSE,
      renewal_date = v_renewal_date,
      updated_at = now()
  WHERE uid = p_user_id;

  RETURN v_usage_id;
END;
$$;

-- Backwards-compatible wrapper: legacy clients may still send these arguments,
-- but the server deliberately ignores their discount, plan label, and expiry.
CREATE OR REPLACE FUNCTION public.redeem_coupon_for_user(
  p_coupon_id TEXT,
  p_user_id TEXT,
  p_discount_percent INTEGER,
  p_plan_id TEXT,
  p_plan_name TEXT,
  p_order_id TEXT,
  p_renewal_date TIMESTAMPTZ
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN public.redeem_coupon_for_user_v2(p_coupon_id,p_user_id,p_plan_id,p_order_id);
END;
$$;

REVOKE ALL ON FUNCTION public.record_coupon_usage(TEXT,TEXT,INTEGER,TEXT,TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.redeem_coupon_for_user_v2(TEXT,TEXT,TEXT,TEXT)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.redeem_coupon_for_user(TEXT,TEXT,INTEGER,TEXT,TEXT,TEXT,TIMESTAMPTZ)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.redeem_coupon_for_user_v2(TEXT,TEXT,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_coupon_for_user(TEXT,TEXT,INTEGER,TEXT,TEXT,TEXT,TIMESTAMPTZ) TO authenticated;

NOTIFY pgrst, 'reload schema';
