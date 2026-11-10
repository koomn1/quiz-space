-- Use effective membership and the canonical plan catalog for reward-store eligibility.
CREATE OR REPLACE FUNCTION public.purchase_reward_item(p_item_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_item public.reward_store_items%ROWTYPE;
  v_user public.users%ROWTYPE;
  v_plan public.subscription_plans%ROWTYPE;
  v_effective_plan_name TEXT;
  v_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT * INTO v_item
  FROM public.reward_store_items
  WHERE id = trim(p_item_id) AND is_active = TRUE
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Store item not found'; END IF;
  IF v_item.item_type NOT IN ('frame','cosmetic') THEN
    RAISE EXCEPTION 'This item requires a payment order';
  END IF;

  SELECT * INTO v_user
  FROM public.users
  WHERE uid = v_user_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User profile not found'; END IF;

  IF NOT public.effective_membership_active(
    v_user.is_premium,v_user.is_lifetime,v_user.is_founder,v_user.renewal_date
  ) THEN
    RAISE EXCEPTION 'Active membership required';
  END IF;

  IF v_user.plan_id IN ('silver','gold','diamond') THEN
    SELECT * INTO v_plan
    FROM public.subscription_plans
    WHERE id = v_user.plan_id AND is_active = TRUE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Membership plan is unavailable'; END IF;
    v_effective_plan_name := v_plan.name;
  ELSIF v_user.plan_id IS NULL THEN
    -- Legacy profiles without a canonical plan id retain their stored tier label.
    v_effective_plan_name := COALESCE(v_user.plan_name,'Free');
  ELSE
    -- Unknown or trial plan identifiers never inherit a stale premium label.
    v_effective_plan_name := 'Free';
  END IF;

  IF public.reward_plan_rank(v_effective_plan_name) < public.reward_plan_rank(v_item.min_plan) THEN
    RAISE EXCEPTION 'This item requires a higher membership plan';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.reward_inventory
    WHERE user_id = v_user_id AND item_id = v_item.id AND is_active = TRUE
  ) THEN
    RETURN jsonb_build_object('success',FALSE,'already_owned',TRUE,'item_id',v_item.id);
  END IF;

  SELECT points INTO v_balance
  FROM public.user_reward_balances
  WHERE user_id = v_user_id
  FOR UPDATE;
  v_balance := COALESCE(v_balance,0);
  IF v_item.price_points > v_balance THEN RAISE EXCEPTION 'Not enough points'; END IF;

  v_new_balance := v_balance - v_item.price_points;
  INSERT INTO public.user_reward_balances(user_id,points,level)
  VALUES (v_user_id,v_new_balance,public.reward_level_for_points(v_new_balance))
  ON CONFLICT (user_id) DO UPDATE
  SET points = EXCLUDED.points,
      level = EXCLUDED.level,
      updated_at = now();

  IF v_item.price_points > 0 THEN
    INSERT INTO public.reward_points_ledger(user_id,points,event_type,event_key,reference_id,metadata)
    VALUES (
      v_user_id,-v_item.price_points,'store_purchase','store_purchase:' || gen_random_uuid()::TEXT,
      v_item.id,jsonb_build_object('item_id',v_item.id)
    );
  END IF;

  INSERT INTO public.reward_inventory(user_id,item_id,quantity,source)
  VALUES (
    v_user_id,v_item.id,1,
    CASE WHEN v_item.price_points = 0 THEN 'membership' ELSE 'points_purchase' END
  );

  RETURN jsonb_build_object(
    'success',TRUE,'item_id',v_item.id,'points_spent',v_item.price_points,'total_points',v_new_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_reward_item(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_reward_item(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
