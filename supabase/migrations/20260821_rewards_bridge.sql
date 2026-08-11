-- Bridge Motivation Hub games to the canonical reward balance and ledger.

CREATE OR REPLACE FUNCTION public.grant_reward_points(
  p_user_id TEXT,
  p_points INTEGER,
  p_event_type TEXT,
  p_event_key TEXT,
  p_reference_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_rows INTEGER := 0;
  v_total INTEGER := 0;
BEGIN
  IF p_points <= 0 THEN
    RETURN jsonb_build_object('points_awarded', 0, 'total_points', COALESCE((SELECT points FROM public.user_reward_balances WHERE user_id = p_user_id), 0));
  END IF;
  INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id, metadata)
  VALUES (p_user_id, p_points, p_event_type, p_event_key, p_reference_id, COALESCE(p_metadata, '{}'::jsonb))
  ON CONFLICT (user_id, event_key) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  INSERT INTO public.user_reward_balances (user_id, points, level)
  VALUES (p_user_id, CASE WHEN v_rows > 0 THEN p_points ELSE 0 END, public.reward_level_for_points(CASE WHEN v_rows > 0 THEN p_points ELSE 0 END))
  ON CONFLICT (user_id) DO UPDATE SET
    points = public.user_reward_balances.points + CASE WHEN v_rows > 0 THEN p_points ELSE 0 END,
    level = public.reward_level_for_points(public.user_reward_balances.points + CASE WHEN v_rows > 0 THEN p_points ELSE 0 END),
    updated_at = now();

  SELECT points INTO v_total FROM public.user_reward_balances WHERE user_id = p_user_id;
  RETURN jsonb_build_object('points_awarded', CASE WHEN v_rows > 0 THEN p_points ELSE 0 END, 'total_points', COALESCE(v_total, 0));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_daily_brain_challenge()
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today TEXT := to_char(now(), 'YYYY-MM-DD');
  v_questions TEXT[] := ARRAY[
    'ما هو الجذر التربيعي لـ 144؟',
    'كم عدد أضلاع المثلث؟',
    'ما هو ناتج 7 × 8؟',
    'ما هو اللون الناتج من مزج الأحمر والأزرق؟',
    'كم ساعة في اليوم؟',
    'ما هو عكس كلمة سريع؟',
    'كم صفر في المليون؟',
    'ما هو الحيوان الوطني لمصر؟'
  ];
  v_q_idx INTEGER := mod(extract(doy from now())::integer - 1, 8) + 1;
  v_attempts INTEGER;
BEGIN
  SELECT count(*) INTO v_attempts FROM public.brain_challenge_attempts WHERE user_id = v_user_id AND challenge_date = v_today;
  RETURN jsonb_build_object(
    'challenge_date', v_today,
    'question', v_questions[v_q_idx],
    'attempts_today', v_attempts,
    'attempts_remaining', greatest(0, 3 - v_attempts)
  );
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
  SELECT current_streak, longest_streak, last_login_date INTO v_current, v_longest, v_last FROM public.user_streaks WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    v_current := 1; v_longest := 1; v_points := 5;
    INSERT INTO public.user_streaks (id, user_id, current_streak, longest_streak, last_login_date, streak_points)
    VALUES (gen_random_uuid()::text, v_user_id, v_current, v_longest, v_today, v_points);
  ELSIF v_last = v_today THEN
    RETURN jsonb_build_object('success', true, 'streak', v_current, 'points', 0, 'message', 'Already checked in today');
  ELSE
    v_current := CASE WHEN v_last = v_yesterday THEN v_current + 1 ELSE 1 END;
    v_longest := greatest(v_longest, v_current);
    v_points := CASE WHEN v_current >= 30 THEN 200 WHEN v_current >= 14 THEN 100 WHEN v_current >= 7 THEN 50 WHEN v_current >= 3 THEN 20 ELSE 5 END;
    UPDATE public.user_streaks SET current_streak = v_current, longest_streak = v_longest, last_login_date = v_today, streak_points = streak_points + v_points, updated_at = now() WHERE user_id = v_user_id;
  END IF;
  v_reward := public.grant_reward_points(v_user_id, v_points, 'daily_streak', 'daily_streak:' || v_today, v_today, jsonb_build_object('streak', v_current));
  RETURN jsonb_build_object('success', true, 'streak', v_current, 'points', (v_reward->>'points_awarded')::integer, 'message', 'Streak day ' || v_current || '!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.claim_lucky_spin()
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today TEXT := to_char(now(), 'YYYY-MM-DD');
  v_points INTEGER;
  v_rewards INTEGER[] := ARRAY[1, 2, 3, 5, 10, 15, 20, 25, 30, 50];
  v_reward JSONB;
BEGIN
  IF EXISTS (SELECT 1 FROM public.lucky_spin_claims WHERE user_id = v_user_id AND claimed_date = v_today) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already spun today! Come back tomorrow');
  END IF;
  v_points := v_rewards[floor(random() * array_length(v_rewards, 1))::integer + 1];
  INSERT INTO public.lucky_spin_claims (id, user_id, claimed_date, points_won, reward_type)
  VALUES (gen_random_uuid()::text, v_user_id, v_today, v_points, 'points');
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
BEGIN
  SELECT claimed_date INTO v_last_claim FROM public.mystery_box_claims WHERE user_id = v_user_id ORDER BY claimed_date DESC LIMIT 1;
  IF v_last_claim IS NOT NULL THEN
    v_days_since := (v_today::date - v_last_claim::date);
    IF v_days_since < 3 THEN RETURN jsonb_build_object('success', false, 'days_remaining', 3 - v_days_since, 'message', 'Come back in ' || (3 - v_days_since) || ' days!'); END IF;
  END IF;
  v_rand := random();
  IF v_rand < 0.7 THEN v_reward_type := 'points'; v_reward_value := floor(random() * 40 + 10)::integer;
  ELSIF v_rand < 0.9 THEN v_reward_type := 'coins'; v_reward_value := floor(random() * 20 + 5)::integer;
  ELSE v_reward_type := 'points'; v_reward_value := 100; END IF;
  INSERT INTO public.mystery_box_claims (id, user_id, claimed_date, reward_type, reward_value)
  VALUES (gen_random_uuid()::text, v_user_id, v_today, v_reward_type, v_reward_value);
  IF v_reward_type = 'points' THEN
    v_reward := public.grant_reward_points(v_user_id, v_reward_value, 'mystery_box', 'mystery_box:' || v_today, v_today, jsonb_build_object('reward_type', v_reward_type));
  ELSE
    INSERT INTO public.user_reward_balances (user_id, points, coins, level)
    VALUES (v_user_id, 0, v_reward_value, 1)
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
  v_questions TEXT[] := ARRAY[
    'ما هو الجذر التربيعي لـ 144؟', 'كم عدد أضلاع المثلث؟', 'ما هو ناتج 7 × 8؟',
    'ما هو اللون الناتج من مزج الأحمر والأزرق؟', 'كم ساعة في اليوم؟', 'ما هو عكس كلمة سريع؟',
    'كم صفر في المليون؟', 'ما هو الحيوان الوطني لمصر؟'
  ];
  v_answers TEXT[] := ARRAY['12', '3', '56', 'أرجواني', '24', 'بطيء', '6', 'النسر'];
  v_q_idx INTEGER := mod(extract(doy from now())::integer - 1, 8) + 1;
  v_reward JSONB;
BEGIN
  v_question := v_questions[v_q_idx];
  v_correct_answer := v_answers[v_q_idx];
  SELECT count(*) INTO v_attempts FROM public.brain_challenge_attempts WHERE user_id = v_user_id AND challenge_date = v_today;
  IF v_attempts >= 3 THEN RETURN jsonb_build_object('success', false, 'message', 'Maximum 3 attempts per day'); END IF;
  v_is_correct := lower(trim(coalesce(p_answer, ''))) = lower(trim(v_correct_answer));
  IF v_is_correct THEN v_points := 20; END IF;
  INSERT INTO public.brain_challenge_attempts (id, user_id, challenge_date, question_text, answer_submitted, is_correct, points_earned, attempt_order)
  VALUES (gen_random_uuid()::text, v_user_id, v_today, v_question, p_answer, v_is_correct, v_points, v_attempts + 1);
  IF v_is_correct THEN
    v_reward := public.grant_reward_points(v_user_id, v_points, 'brain_challenge', 'brain_challenge:' || v_today || ':' || (v_attempts + 1)::text, v_today, jsonb_build_object('question', v_question));
  ELSE
    v_reward := jsonb_build_object('points_awarded', 0, 'total_points', (SELECT points FROM public.user_reward_balances WHERE user_id = v_user_id));
  END IF;
  RETURN jsonb_build_object('success', true, 'is_correct', v_is_correct, 'points', (v_reward->>'points_awarded')::integer, 'total_points', (v_reward->>'total_points')::integer, 'message', CASE WHEN v_is_correct THEN 'Correct! +20 points!' ELSE 'Not quite. Try another attempt.' END);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_daily_brain_challenge() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_daily_streak() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_lucky_spin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_mystery_box() TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_brain_challenge(TEXT) TO authenticated;
NOTIFY pgrst, 'reload schema';
