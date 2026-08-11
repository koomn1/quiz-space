-- Backend Guard hardening for reward RPCs and payment order input.
-- Client writes are limited to RPCs; balances and approvals remain server-controlled.

DROP POLICY IF EXISTS reward_store_orders_own_insert ON public.reward_store_orders;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reward_store_orders_payment_reference_length') THEN
    ALTER TABLE public.reward_store_orders ADD CONSTRAINT reward_store_orders_payment_reference_length CHECK (payment_reference IS NULL OR length(payment_reference) <= 200);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reward_store_orders_receipt_length') THEN
    ALTER TABLE public.reward_store_orders ADD CONSTRAINT reward_store_orders_receipt_length CHECK (receipt_url IS NULL OR length(receipt_url) <= 1500000);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reward_store_orders_notes_length') THEN
    ALTER TABLE public.reward_store_orders ADD CONSTRAINT reward_store_orders_notes_length CHECK (notes IS NULL OR length(notes) <= 1000);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS mystery_box_claims_user_day_idx
  ON public.mystery_box_claims (user_id, claimed_date);

CREATE OR REPLACE FUNCTION public.purchase_reward_item(p_item_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_item public.reward_store_items%ROWTYPE;
  v_user public.users%ROWTYPE;
  v_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_item_id IS NULL OR length(trim(p_item_id)) = 0 OR length(p_item_id) > 100 THEN RAISE EXCEPTION 'Invalid store item'; END IF;
  SELECT * INTO v_item FROM public.reward_store_items WHERE id = trim(p_item_id) AND is_active = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Store item not found'; END IF;
  IF v_item.item_type <> 'frame' AND v_item.item_type <> 'cosmetic' THEN RAISE EXCEPTION 'This item requires a payment order'; END IF;
  SELECT * INTO v_user FROM public.users WHERE uid = v_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User profile not found'; END IF;
  IF public.reward_plan_rank(v_user.plan_name) < public.reward_plan_rank(v_item.min_plan) THEN RAISE EXCEPTION 'This item requires a higher membership plan'; END IF;
  IF EXISTS (SELECT 1 FROM public.reward_inventory WHERE user_id = v_user_id AND item_id = v_item.id AND is_active = true) THEN
    RETURN jsonb_build_object('success', false, 'already_owned', true, 'item_id', v_item.id);
  END IF;

  SELECT points INTO v_balance FROM public.user_reward_balances WHERE user_id = v_user_id FOR UPDATE;
  v_balance := COALESCE(v_balance, 0);
  IF v_item.price_points > v_balance THEN RAISE EXCEPTION 'Not enough points'; END IF;
  v_new_balance := v_balance - v_item.price_points;

  INSERT INTO public.user_reward_balances (user_id, points, level)
  VALUES (v_user_id, v_new_balance, public.reward_level_for_points(v_new_balance))
  ON CONFLICT (user_id) DO UPDATE SET points = EXCLUDED.points, level = EXCLUDED.level, updated_at = now();

  IF v_item.price_points > 0 THEN
    INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id, metadata)
    VALUES (v_user_id, -v_item.price_points, 'store_purchase', 'store_purchase:' || gen_random_uuid()::text, v_item.id, jsonb_build_object('item_id', v_item.id, 'item_name', v_item.name));
  END IF;

  INSERT INTO public.reward_inventory (user_id, item_id, quantity, source)
  VALUES (v_user_id, v_item.id, 1, CASE WHEN v_item.price_points = 0 THEN 'diamond_membership' ELSE 'points_purchase' END);
  RETURN jsonb_build_object('success', true, 'item_id', v_item.id, 'points_spent', v_item.price_points, 'total_points', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.create_reward_points_order(p_item_id TEXT, p_payment_method TEXT, p_payment_reference TEXT DEFAULT NULL, p_receipt_url TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_item public.reward_store_items%ROWTYPE;
  v_order public.reward_store_orders%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_item_id IS NULL OR length(trim(p_item_id)) = 0 OR length(p_item_id) > 100 THEN RAISE EXCEPTION 'Invalid store item'; END IF;
  IF p_payment_method NOT IN ('vodafone_cash', 'instapay') THEN RAISE EXCEPTION 'Unsupported payment method'; END IF;
  IF p_payment_reference IS NOT NULL AND length(trim(p_payment_reference)) > 200 THEN RAISE EXCEPTION 'Payment reference is too long'; END IF;
  IF p_receipt_url IS NOT NULL AND length(p_receipt_url) > 1500000 THEN RAISE EXCEPTION 'Receipt is too large'; END IF;
  SELECT * INTO v_item FROM public.reward_store_items WHERE id = trim(p_item_id) AND is_active = true AND item_type = 'points_bundle';
  IF NOT FOUND THEN RAISE EXCEPTION 'Points bundle not found'; END IF;
  INSERT INTO public.reward_store_orders (user_id, item_id, order_type, amount_points, amount_egp, payment_method, payment_reference, receipt_url)
  VALUES (v_user_id, v_item.id, 'points_purchase', v_item.reward_points, v_item.price_egp, p_payment_method, NULLIF(trim(p_payment_reference), ''), p_receipt_url)
  RETURNING * INTO v_order;
  RETURN jsonb_build_object('success', true, 'order_id', v_order.id, 'status', v_order.status, 'amount_egp', v_order.amount_egp, 'reward_points', v_item.reward_points);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_daily_brain_challenge()
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today TEXT := to_char(now(), 'YYYY-MM-DD');
  v_questions TEXT[] := ARRAY[
    'ما هو الجذر التربيعي لـ 144؟', 'كم عدد أضلاع المثلث؟', 'ما هو ناتج 7 × 8؟',
    'ما هو اللون الناتج من مزج الأحمر والأزرق؟', 'كم ساعة في اليوم؟', 'ما هو عكس كلمة سريع؟',
    'كم صفر في المليون؟', 'ما هو الحيوان الوطني لمصر؟'
  ];
  v_q_idx INTEGER := mod(extract(doy from now())::integer - 1, 8) + 1;
  v_attempts INTEGER;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT count(*) INTO v_attempts FROM public.brain_challenge_attempts WHERE user_id = v_user_id AND challenge_date = v_today;
  RETURN jsonb_build_object('challenge_date', v_today, 'question', v_questions[v_q_idx], 'attempts_today', v_attempts, 'attempts_remaining', greatest(0, 3 - v_attempts));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_daily_streak()
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today TEXT := to_char(now(), 'YYYY-MM-DD');
  v_yesterday TEXT := to_char(now() - interval '1 day', 'YYYY-MM-DD');
  v_current INTEGER := 0;
  v_longest INTEGER := 0;
  v_last TEXT;
  v_points INTEGER := 0;
  v_reward JSONB;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT current_streak, longest_streak, last_login_date INTO v_current, v_longest, v_last FROM public.user_streaks WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    v_current := 1; v_longest := 1; v_points := 5;
    INSERT INTO public.user_streaks (id, user_id, current_streak, longest_streak, last_login_date, streak_points) VALUES (gen_random_uuid()::text, v_user_id, v_current, v_longest, v_today, v_points);
  ELSIF v_last = v_today THEN
    RETURN jsonb_build_object('success', true, 'streak', v_current, 'points', 0, 'message', 'Already checked in today');
  ELSE
    v_current := CASE WHEN v_last = v_yesterday THEN v_current + 1 ELSE 1 END;
    v_longest := greatest(v_longest, v_current);
    v_points := CASE WHEN v_current >= 30 THEN 200 WHEN v_current >= 14 THEN 100 WHEN v_current >= 7 THEN 50 WHEN v_current >= 3 THEN 20 ELSE 5 END;
    UPDATE public.user_streaks SET current_streak = v_current, longest_streak = v_longest, last_login_date = v_today, streak_points = streak_points + v_points, updated_at = now() WHERE user_id = v_user_id;
  END IF;
  v_reward := public.grant_reward_points(v_user_id, v_points, 'daily_streak', 'daily_streak:' || v_today, v_today, jsonb_build_object('streak', v_current));
  INSERT INTO public.user_reward_balances (user_id, points, daily_streak, last_daily_claim, level)
  VALUES (v_user_id, 0, v_current, v_today::date, public.reward_level_for_points(0))
  ON CONFLICT (user_id) DO UPDATE SET daily_streak = v_current, last_daily_claim = v_today::date, updated_at = now();
  RETURN jsonb_build_object('success', true, 'streak', v_current, 'points', (v_reward->>'points_awarded')::integer, 'message', 'Streak day ' || v_current || '!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.claim_lucky_spin()
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today TEXT := to_char(now(), 'YYYY-MM-DD');
  v_points INTEGER;
  v_rows INTEGER;
  v_rewards INTEGER[] := ARRAY[1, 2, 3, 5, 10, 15, 20, 25, 30, 50];
  v_reward JSONB;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  v_points := v_rewards[floor(random() * array_length(v_rewards, 1))::integer + 1];
  INSERT INTO public.lucky_spin_claims (id, user_id, claimed_date, points_won, reward_type)
  VALUES (gen_random_uuid()::text, v_user_id, v_today, v_points, 'points') ON CONFLICT (user_id, claimed_date) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RETURN jsonb_build_object('success', false, 'message', 'Already spun today! Come back tomorrow'); END IF;
  v_reward := public.grant_reward_points(v_user_id, v_points, 'lucky_spin', 'lucky_spin:' || v_today, v_today, jsonb_build_object('points_won', v_points));
  RETURN jsonb_build_object('success', true, 'points', (v_reward->>'points_awarded')::integer, 'total_points', (v_reward->>'total_points')::integer, 'message', 'You won ' || v_points || ' points!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.claim_mystery_box()
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today TEXT := to_char(now(), 'YYYY-MM-DD');
  v_last_claim TEXT;
  v_days_since INTEGER;
  v_reward_type TEXT;
  v_reward_value INTEGER;
  v_rand FLOAT;
  v_reward JSONB;
  v_rows INTEGER;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT claimed_date INTO v_last_claim FROM public.mystery_box_claims WHERE user_id = v_user_id ORDER BY claimed_date DESC LIMIT 1;
  IF v_last_claim IS NOT NULL THEN
    v_days_since := (v_today::date - v_last_claim::date);
    IF v_days_since < 3 THEN RETURN jsonb_build_object('success', false, 'days_remaining', 3 - v_days_since, 'message', 'Come back in ' || (3 - v_days_since) || ' days!'); END IF;
  END IF;
  v_rand := random();
  IF v_rand < 0.7 THEN v_reward_type := 'points'; v_reward_value := floor(random() * 40 + 10)::integer;
  ELSIF v_rand < 0.9 THEN v_reward_type := 'coins'; v_reward_value := floor(random() * 20 + 5)::integer;
  ELSE v_reward_type := 'points'; v_reward_value := 100; END IF;
  INSERT INTO public.mystery_box_claims (id, user_id, claimed_date, reward_type, reward_value) VALUES (gen_random_uuid()::text, v_user_id, v_today, v_reward_type, v_reward_value) ON CONFLICT (user_id, claimed_date) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RETURN jsonb_build_object('success', false, 'message', 'Mystery Box already claimed'); END IF;
  IF v_reward_type = 'points' THEN
    v_reward := public.grant_reward_points(v_user_id, v_reward_value, 'mystery_box', 'mystery_box:' || v_today, v_today, jsonb_build_object('reward_type', v_reward_type));
  ELSE
    INSERT INTO public.user_reward_balances (user_id, points, coins, level) VALUES (v_user_id, 0, v_reward_value, 1)
    ON CONFLICT (user_id) DO UPDATE SET coins = public.user_reward_balances.coins + v_reward_value, updated_at = now();
    v_reward := jsonb_build_object('points_awarded', 0, 'total_points', (SELECT points FROM public.user_reward_balances WHERE user_id = v_user_id));
  END IF;
  RETURN jsonb_build_object('success', true, 'reward_type', v_reward_type, 'reward_value', v_reward_value, 'total_points', (v_reward->>'total_points')::integer, 'message', 'Mystery Box: ' || v_reward_value || ' ' || v_reward_type);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.submit_brain_challenge(p_answer TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today TEXT := to_char(now(), 'YYYY-MM-DD');
  v_correct_answer TEXT;
  v_question TEXT;
  v_is_correct BOOLEAN;
  v_attempts INTEGER;
  v_points INTEGER := 0;
  v_questions TEXT[] := ARRAY['ما هو الجذر التربيعي لـ 144؟', 'كم عدد أضلاع المثلث؟', 'ما هو ناتج 7 × 8؟', 'ما هو اللون الناتج من مزج الأحمر والأزرق؟', 'كم ساعة في اليوم؟', 'ما هو عكس كلمة سريع؟', 'كم صفر في المليون؟', 'ما هو الحيوان الوطني لمصر؟'];
  v_answers TEXT[] := ARRAY['12', '3', '56', 'أرجواني', '24', 'بطيء', '6', 'النسر'];
  v_q_idx INTEGER := mod(extract(doy from now())::integer - 1, 8) + 1;
  v_reward JSONB;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_answer IS NULL OR length(trim(p_answer)) = 0 OR length(p_answer) > 300 THEN RAISE EXCEPTION 'Invalid answer'; END IF;
  v_question := v_questions[v_q_idx]; v_correct_answer := v_answers[v_q_idx];
  SELECT count(*) INTO v_attempts FROM public.brain_challenge_attempts WHERE user_id = v_user_id AND challenge_date = v_today;
  IF v_attempts >= 3 THEN RETURN jsonb_build_object('success', false, 'message', 'Maximum 3 attempts per day'); END IF;
  v_is_correct := lower(trim(p_answer)) = lower(trim(v_correct_answer));
  IF v_is_correct THEN v_points := 20; END IF;
  INSERT INTO public.brain_challenge_attempts (id, user_id, challenge_date, question_text, answer_submitted, is_correct, points_earned, attempt_order) VALUES (gen_random_uuid()::text, v_user_id, v_today, v_question, trim(p_answer), v_is_correct, v_points, v_attempts + 1);
  IF v_is_correct THEN
    v_reward := public.grant_reward_points(v_user_id, v_points, 'brain_challenge', 'brain_challenge:' || v_today || ':' || (v_attempts + 1)::text, v_today, jsonb_build_object('question', v_question));
  ELSE
    v_reward := jsonb_build_object('points_awarded', 0, 'total_points', (SELECT points FROM public.user_reward_balances WHERE user_id = v_user_id));
  END IF;
  RETURN jsonb_build_object('success', true, 'is_correct', v_is_correct, 'points', (v_reward->>'points_awarded')::integer, 'total_points', (v_reward->>'total_points')::integer, 'message', CASE WHEN v_is_correct THEN 'Correct! +20 points!' ELSE 'Not quite. Try another attempt.' END);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.admin_grant_reward_points(p_user_id TEXT, p_points INTEGER, p_note TEXT DEFAULT '')
RETURNS JSONB AS $$
DECLARE
  v_admin public.users%ROWTYPE;
  v_new_balance INTEGER;
BEGIN
  SELECT * INTO v_admin FROM public.users WHERE uid = auth.uid()::text AND is_admin = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_user_id IS NULL OR length(trim(p_user_id)) = 0 OR length(p_user_id) > 100 THEN RAISE EXCEPTION 'Invalid user'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE uid = trim(p_user_id)) THEN RAISE EXCEPTION 'User not found'; END IF;
  IF p_points <= 0 OR p_points > 1000000 THEN RAISE EXCEPTION 'Invalid points amount'; END IF;
  IF p_note IS NOT NULL AND length(p_note) > 500 THEN RAISE EXCEPTION 'Note is too long'; END IF;
  INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id, metadata) VALUES (trim(p_user_id), p_points, 'admin_grant', 'admin_grant:' || gen_random_uuid()::text, trim(p_user_id), jsonb_build_object('note', coalesce(p_note, ''), 'admin_id', v_admin.uid));
  INSERT INTO public.user_reward_balances (user_id, points, level) VALUES (trim(p_user_id), p_points, public.reward_level_for_points(p_points)) ON CONFLICT (user_id) DO UPDATE SET points = public.user_reward_balances.points + p_points, level = public.reward_level_for_points(public.user_reward_balances.points + p_points), updated_at = now() RETURNING points INTO v_new_balance;
  RETURN jsonb_build_object('success', true, 'user_id', trim(p_user_id), 'points_added', p_points, 'total_points', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.admin_review_reward_order(p_order_id UUID, p_status TEXT, p_note TEXT DEFAULT '')
RETURNS JSONB AS $$
DECLARE
  v_admin public.users%ROWTYPE;
  v_order public.reward_store_orders%ROWTYPE;
  v_item public.reward_store_items%ROWTYPE;
  v_new_balance INTEGER;
BEGIN
  SELECT * INTO v_admin FROM public.users WHERE uid = auth.uid()::text AND is_admin = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_status NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'Invalid review status'; END IF;
  IF p_note IS NOT NULL AND length(p_note) > 1000 THEN RAISE EXCEPTION 'Note is too long'; END IF;
  SELECT * INTO v_order FROM public.reward_store_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.status <> 'pending' THEN RETURN jsonb_build_object('success', false, 'status', v_order.status); END IF;
  UPDATE public.reward_store_orders SET status = p_status, notes = NULLIF(p_note, ''), approved_by = v_admin.uid, updated_at = now() WHERE id = p_order_id;
  IF p_status = 'rejected' THEN RETURN jsonb_build_object('success', true, 'status', 'rejected'); END IF;
  SELECT * INTO v_item FROM public.reward_store_items WHERE id = v_order.item_id;
  INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id, metadata) VALUES (v_order.user_id, v_item.reward_points, 'points_purchase', 'reward_order:' || v_order.id::text, v_order.id::text, jsonb_build_object('item_id', v_item.id, 'payment_method', v_order.payment_method, 'amount_egp', v_order.amount_egp)) ON CONFLICT (user_id, event_key) DO NOTHING;
  INSERT INTO public.user_reward_balances (user_id, points, level) VALUES (v_order.user_id, v_item.reward_points, public.reward_level_for_points(v_item.reward_points)) ON CONFLICT (user_id) DO UPDATE SET points = public.user_reward_balances.points + v_item.reward_points, level = public.reward_level_for_points(public.user_reward_balances.points + v_item.reward_points), updated_at = now() RETURNING points INTO v_new_balance;
  RETURN jsonb_build_object('success', true, 'status', 'approved', 'points_added', v_item.reward_points, 'total_points', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.grant_reward_points(TEXT, INTEGER, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purchase_reward_item(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_reward_points_order(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_daily_brain_challenge() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_daily_streak() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_lucky_spin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_mystery_box() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_brain_challenge(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_grant_reward_points(TEXT, INTEGER, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_review_reward_order(UUID, TEXT, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.purchase_reward_item(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_reward_points_order(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_brain_challenge() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_daily_streak() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_lucky_spin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_mystery_box() TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_brain_challenge(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_reward_points(TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_reward_order(UUID, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
