CREATE OR REPLACE FUNCTION public.admin_save_coupon(p_coupon jsonb)
RETURNS public.coupon_codes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.coupon_codes;
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF p_coupon IS NULL
     OR COALESCE(trim(p_coupon->>'id'), '') = ''
     OR COALESCE(trim(p_coupon->>'code'), '') = '' THEN
    RAISE EXCEPTION 'Coupon id and code are required';
  END IF;

  INSERT INTO public.coupon_codes
    (id, code, discount_percent, max_uses, used_count, expiry_date,
     is_active, created_at, applicable_plans)
  VALUES
    (trim(p_coupon->>'id'),
     upper(trim(p_coupon->>'code')),
     COALESCE((p_coupon->>'discount_percent')::integer, 0),
     COALESCE((p_coupon->>'max_uses')::integer, 0),
     COALESCE((p_coupon->>'used_count')::integer, 0),
     NULLIF(p_coupon->>'expiry_date', '')::timestamptz,
     COALESCE((p_coupon->>'is_active')::boolean, true),
     COALESCE(NULLIF(p_coupon->>'created_at', '')::timestamptz, now()),
     COALESCE(NULLIF(trim(p_coupon->>'applicable_plans'), ''), 'silver,gold,diamond'))
  ON CONFLICT (id) DO UPDATE SET
    code = EXCLUDED.code,
    discount_percent = EXCLUDED.discount_percent,
    max_uses = EXCLUDED.max_uses,
    used_count = EXCLUDED.used_count,
    expiry_date = EXCLUDED.expiry_date,
    is_active = EXCLUDED.is_active,
    applicable_plans = EXCLUDED.applicable_plans
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_coupon(p_coupon_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  DELETE FROM public.coupon_codes WHERE id = p_coupon_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_coupon(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_coupon(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_save_coupon(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_coupon(text) TO authenticated;
NOTIFY pgrst, 'reload schema';
