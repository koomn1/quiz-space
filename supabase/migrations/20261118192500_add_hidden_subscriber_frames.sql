-- Hidden subscriber-benefit frames. Admins can activate visibility later.
ALTER TABLE public.reward_store_items
  ADD COLUMN IF NOT EXISTS subscriber_free BOOLEAN NOT NULL DEFAULT false;

INSERT INTO public.reward_store_items (
  id, item_type, name, name_ar, description, description_ar,
  price_points, price_egp, reward_points, image_url, css_class,
  min_plan, is_active, sort_order, is_featured, subscriber_free, updated_at
) VALUES
  (
    'frame_waves_quiz', 'frame', 'Quiz Waves', 'موجات الاختبارات',
    'A cool academic wave ring for quiz lovers.',
    'إطار أكاديمي متحرك مستوحى من موجات الاختبارات.',
    2500, 0, 0, 'clean-assets-replacement/frame-waves-quizspace-transparent.svg',
    'frame-waves-quiz', 'free', false, 130, false, true, now()
  ),
  (
    'frame_sun_quiz', 'frame', 'Quiz Sun', 'شمس الاختبارات',
    'A warm golden sun ring celebrating bright quiz results.',
    'إطار ذهبي دافئ مستوحى من شمس النجاح في الاختبارات.',
    3000, 0, 0, 'clean-assets-replacement/frame-sun-quizspace-transparent.svg',
    'frame-sun-quiz', 'free', false, 131, false, true, now()
  )
ON CONFLICT (id) DO UPDATE SET
  item_type = EXCLUDED.item_type,
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  price_points = EXCLUDED.price_points,
  price_egp = EXCLUDED.price_egp,
  image_url = EXCLUDED.image_url,
  css_class = EXCLUDED.css_class,
  min_plan = EXCLUDED.min_plan,
  subscriber_free = EXCLUDED.subscriber_free,
  sort_order = EXCLUDED.sort_order,
  is_featured = EXCLUDED.is_featured,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.purchase_reward_item(p_item_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_item public.reward_store_items%ROWTYPE;
  v_user public.users%ROWTYPE;
  v_balance INTEGER;
  v_new_balance INTEGER;
  v_effective_price INTEGER;
  v_subscriber_free BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF p_item_id IS NULL OR length(trim(p_item_id)) = 0 OR length(p_item_id) > 100 THEN RAISE EXCEPTION 'Invalid store item' USING ERRCODE = '22023'; END IF;

  SELECT * INTO v_item
  FROM public.reward_store_items
  WHERE id = trim(p_item_id) AND is_active = true
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Store item not found' USING ERRCODE = 'P0002'; END IF;
  IF v_item.item_type NOT IN ('frame', 'cosmetic') THEN RAISE EXCEPTION 'This item requires a payment order'; END IF;

  SELECT * INTO v_user FROM public.users WHERE uid = v_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User profile not found'; END IF;
  IF public.reward_plan_rank(v_user.plan_name) < public.reward_plan_rank(v_item.min_plan)
     AND NOT (v_user.is_lifetime OR v_user.is_founder) THEN
    RAISE EXCEPTION 'This item requires a higher membership plan';
  END IF;
  IF EXISTS (SELECT 1 FROM public.reward_inventory WHERE user_id = v_user_id AND item_id = v_item.id AND is_active = true) THEN
    RETURN jsonb_build_object('success', false, 'already_owned', true, 'item_id', v_item.id);
  END IF;

  v_subscriber_free := COALESCE(v_item.subscriber_free, false)
    AND (v_user.is_lifetime OR v_user.is_founder OR (v_user.is_premium AND (v_user.renewal_date IS NULL OR v_user.renewal_date >= now())));
  v_effective_price := CASE WHEN v_subscriber_free THEN 0 ELSE COALESCE(v_item.price_points, 0) END;

  SELECT points INTO v_balance FROM public.user_reward_balances WHERE user_id = v_user_id FOR UPDATE;
  v_balance := COALESCE(v_balance, 0);
  IF v_effective_price > v_balance THEN RAISE EXCEPTION 'Not enough points'; END IF;
  v_new_balance := v_balance - v_effective_price;

  INSERT INTO public.user_reward_balances (user_id, points, level)
  VALUES (v_user_id, v_new_balance, public.reward_level_for_points(v_new_balance))
  ON CONFLICT (user_id) DO UPDATE SET points = EXCLUDED.points, level = EXCLUDED.level, updated_at = now();
  IF v_effective_price > 0 THEN
    INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id, metadata)
    VALUES (v_user_id, -v_effective_price, 'store_purchase', 'store_purchase:' || gen_random_uuid()::text, v_item.id, jsonb_build_object('item_id', v_item.id, 'item_name', v_item.name));
  END IF;
  INSERT INTO public.reward_inventory (user_id, item_id, quantity, source)
  VALUES (v_user_id, v_item.id, 1, CASE WHEN v_subscriber_free THEN 'subscriber_benefit' ELSE 'points_purchase' END);
  RETURN jsonb_build_object('success', true, 'item_id', v_item.id, 'points_spent', v_effective_price, 'subscriber_free', v_subscriber_free, 'total_points', v_new_balance);
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_reward_item(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_reward_item(TEXT) TO authenticated;
