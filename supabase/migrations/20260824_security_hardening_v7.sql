-- Harden legacy reward/coupon/season RPCs that accept user IDs.

CREATE OR REPLACE FUNCTION public.record_coupon_usage(
  p_coupon_id text,
  p_user_id text,
  p_discount_percent integer,
  p_plan_id text DEFAULT NULL,
  p_order_id text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usage_id text;
  v_coupon public.coupon_codes%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS NULL OR auth.uid()::text <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_coupon_id IS NULL OR p_discount_percent IS NULL OR p_discount_percent < 0 OR p_discount_percent > 100 THEN
    RAISE EXCEPTION 'Invalid coupon request';
  END IF;
  SELECT * INTO v_coupon FROM public.coupon_codes WHERE id = p_coupon_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Coupon not found'; END IF;
  IF NOT v_coupon.is_active THEN RAISE EXCEPTION 'Coupon is inactive'; END IF;
  IF v_coupon.expiry_date IS NOT NULL AND v_coupon.expiry_date < now() THEN RAISE EXCEPTION 'Coupon has expired'; END IF;
  IF v_coupon.used_count >= v_coupon.max_uses THEN RAISE EXCEPTION 'Coupon usage limit reached'; END IF;
  IF EXISTS (SELECT 1 FROM public.coupon_usages WHERE coupon_id = p_coupon_id AND user_id = p_user_id) THEN RAISE EXCEPTION 'User has already used this coupon'; END IF;
  v_usage_id := 'cu_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 8);
  INSERT INTO public.coupon_usages (id, coupon_id, user_id, discount_percent, plan_id, order_id)
  VALUES (v_usage_id, p_coupon_id, p_user_id, p_discount_percent, p_plan_id, p_order_id);
  UPDATE public.coupon_codes SET used_count = used_count + 1 WHERE id = p_coupon_id;
  RETURN v_usage_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_season_member_score(
  p_season_id text,
  p_user_id text,
  p_score_delta integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS NULL OR auth.uid()::text <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_season_id IS NULL OR p_score_delta IS NULL OR p_score_delta < 0 OR p_score_delta > 100 THEN
    RAISE EXCEPTION 'Invalid season score';
  END IF;
  UPDATE public.season_members sm
     SET total_score = COALESCE(sm.total_score, 0) + p_score_delta,
         quizzes_completed = COALESCE(sm.quizzes_completed, 0) + 1,
         updated_at = now()
   WHERE sm.season_id = p_season_id AND sm.user_id = p_user_id
     AND EXISTS (SELECT 1 FROM public.seasons s WHERE s.id = p_season_id AND s.is_active IS TRUE);
END;
$$;

REVOKE ALL ON FUNCTION public.grant_reward_points(text, integer, text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_reward_coins(text, integer, text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_exam_completion_reward(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vip_multiplier_for_user(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_learning_class_member(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_season_member_score(text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_coupon_usage(text, text, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_season_member_score(text, text, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
