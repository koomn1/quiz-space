-- A daily brain question must be answered at most once per user. A separate
-- claim table makes the policy safe under concurrent submissions and preserves
-- historic multi-attempt rows without deleting learning history.
CREATE TABLE IF NOT EXISTS public.brain_challenge_daily_claims (
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  challenge_date TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, challenge_date)
);

ALTER TABLE public.brain_challenge_daily_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brain_challenge_daily_claims_own_read ON public.brain_challenge_daily_claims;
CREATE POLICY brain_challenge_daily_claims_own_read ON public.brain_challenge_daily_claims
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid())::text);

-- Existing entries count as a completed attempt for their historical day.
INSERT INTO public.brain_challenge_daily_claims (user_id, challenge_date)
SELECT DISTINCT user_id, challenge_date
FROM public.brain_challenge_attempts
ON CONFLICT (user_id, challenge_date) DO NOTHING;

-- Client writes could otherwise bypass the RPC's one-attempt rule.
DROP POLICY IF EXISTS "Users can insert own attempts" ON public.brain_challenge_attempts;

CREATE OR REPLACE FUNCTION public.get_daily_brain_challenge()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today TEXT := to_char(now(), 'YYYY-MM-DD');
  v_questions TEXT[] := ARRAY[
    'ما هو الجذر التربيعي لـ 144؟', 'كم عدد أضلاع المثلث؟', 'ما هو ناتج 7 × 8؟',
    'ما هو اللون الناتج من مزج الأحمر والأزرق؟', 'كم ساعة في اليوم؟', 'ما هو عكس كلمة سريع؟',
    'كم صفر في المليون؟', 'ما هو الحيوان الوطني لمصر؟'
  ];
  v_q_idx INTEGER := mod(extract(doy from now())::integer - 1, 8) + 1;
  v_attempted BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.brain_challenge_daily_claims
    WHERE user_id = v_user_id AND challenge_date = v_today
  ) INTO v_attempted;

  RETURN jsonb_build_object(
    'challenge_date', v_today,
    'question', v_questions[v_q_idx],
    'attempts_today', CASE WHEN v_attempted THEN 1 ELSE 0 END,
    'attempts_remaining', CASE WHEN v_attempted THEN 0 ELSE 1 END,
    'attempted', v_attempted
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_brain_challenge(p_answer TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today TEXT := to_char(now(), 'YYYY-MM-DD');
  v_correct_answer TEXT;
  v_question TEXT;
  v_is_correct BOOLEAN;
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
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_answer IS NULL OR length(trim(p_answer)) = 0 OR length(p_answer) > 300 THEN
    RAISE EXCEPTION 'Invalid answer';
  END IF;

  INSERT INTO public.brain_challenge_daily_claims (user_id, challenge_date)
  VALUES (v_user_id, v_today)
  ON CONFLICT (user_id, challenge_date) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'already_attempted',
      'attempted', true,
      'attempts_remaining', 0
    );
  END IF;

  v_question := v_questions[v_q_idx];
  v_correct_answer := v_answers[v_q_idx];
  v_is_correct := lower(trim(p_answer)) = lower(trim(v_correct_answer));
  IF v_is_correct THEN v_points := 20; END IF;

  INSERT INTO public.brain_challenge_attempts (
    id, user_id, challenge_date, question_text, answer_submitted,
    is_correct, points_earned, attempt_order
  ) VALUES (
    gen_random_uuid()::text, v_user_id, v_today, v_question, trim(p_answer),
    v_is_correct, v_points, 1
  );

  IF v_is_correct THEN
    v_reward := public.grant_reward_points(
      v_user_id, v_points, 'brain_challenge', 'brain_challenge:' || v_today,
      v_today, jsonb_build_object('question', v_question)
    );
  ELSE
    v_reward := jsonb_build_object(
      'points_awarded', 0,
      'total_points', (SELECT points FROM public.user_reward_balances WHERE user_id = v_user_id)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'is_correct', v_is_correct,
    'points', coalesce((v_reward->>'points_awarded')::integer, 0),
    'total_points', coalesce((v_reward->>'total_points')::integer, 0),
    'attempted', true,
    'attempts_remaining', 0,
    'reason', CASE WHEN v_is_correct THEN NULL ELSE 'incorrect' END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_daily_brain_challenge() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_brain_challenge(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_daily_brain_challenge() TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_brain_challenge(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
