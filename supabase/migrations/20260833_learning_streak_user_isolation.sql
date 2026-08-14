-- Learning streaks are private, canonical state keyed exclusively by auth.uid().
-- The legacy reward-balance streak remains a denormalized display mirror only.

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own streak" ON public.user_streaks;
DROP POLICY IF EXISTS "Users can update own streak" ON public.user_streaks;
DROP POLICY IF EXISTS "Users can insert own streak" ON public.user_streaks;

CREATE POLICY "Users can manage only their own streak" ON public.user_streaks
  FOR ALL TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE UNIQUE INDEX IF NOT EXISTS user_streaks_user_id_unique_idx
  ON public.user_streaks (user_id);

CREATE OR REPLACE FUNCTION public.update_daily_streak()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today DATE := current_date;
  v_last DATE;
  v_current INTEGER;
  v_longest INTEGER;
  v_protection INTEGER;
  v_points INTEGER;
  v_used_protection BOOLEAN := false;
  v_earned_protection BOOLEAN := false;
  v_reward JSONB;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.user_streaks (
    id, user_id, current_streak, longest_streak, last_login_date, streak_points, protection_days
  ) VALUES (
    gen_random_uuid()::text, v_user_id, 0, 0, '', 0, 1
  ) ON CONFLICT (user_id) DO NOTHING;

  SELECT current_streak, longest_streak, NULLIF(last_login_date, '')::date, protection_days
    INTO v_current, v_longest, v_last, v_protection
  FROM public.user_streaks
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_last = v_today THEN
    RETURN jsonb_build_object(
      'success', true,
      'streak', v_current,
      'points', 0,
      'protection_days', v_protection,
      'message', 'Already checked in today'
    );
  END IF;

  IF v_last IS NULL THEN
    v_current := 1;
    v_longest := GREATEST(COALESCE(v_longest, 0), 1);
  ELSIF v_last = v_today - 1 THEN
    v_current := v_current + 1;
  ELSIF v_last = v_today - 2 AND v_protection > 0 THEN
    v_current := v_current + 1;
    v_protection := v_protection - 1;
    v_used_protection := true;
  ELSE
    v_current := 1;
  END IF;

  v_longest := GREATEST(v_longest, v_current);
  IF v_current >= 7 AND mod(v_current, 7) = 0 AND v_protection < 2 THEN
    v_protection := v_protection + 1;
    v_earned_protection := true;
  END IF;

  v_points := CASE
    WHEN v_current >= 30 THEN 200
    WHEN v_current >= 14 THEN 100
    WHEN v_current >= 7 THEN 50
    WHEN v_current >= 3 THEN 20
    ELSE 5
  END;

  UPDATE public.user_streaks
  SET current_streak = v_current,
      longest_streak = v_longest,
      last_login_date = v_today::text,
      streak_points = streak_points + v_points,
      protection_days = v_protection,
      last_protection_earned_at = CASE WHEN v_earned_protection THEN v_today ELSE last_protection_earned_at END,
      last_protection_used_for = CASE WHEN v_used_protection THEN v_today - 1 ELSE last_protection_used_for END,
      updated_at = now()
  WHERE user_id = v_user_id;

  v_reward := public.grant_reward_points(
    v_user_id,
    v_points,
    'daily_streak',
    'daily_streak:' || v_today::text,
    v_today::text,
    jsonb_build_object(
      'streak', v_current,
      'used_protection', v_used_protection,
      'earned_protection', v_earned_protection
    )
  );

  INSERT INTO public.user_reward_balances (user_id, points, daily_streak, last_daily_claim, level)
  VALUES (v_user_id, 0, v_current, v_today, public.reward_level_for_points(0))
  ON CONFLICT (user_id) DO UPDATE
  SET daily_streak = EXCLUDED.daily_streak,
      last_daily_claim = EXCLUDED.last_daily_claim,
      updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'streak', v_current,
    'points', COALESCE((v_reward->>'points_awarded')::integer, 0),
    'protection_days', v_protection,
    'used_protection', v_used_protection,
    'earned_protection', v_earned_protection
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_learning_streak_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_streak public.user_streaks%ROWTYPE;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_streak
  FROM public.user_streaks
  WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'current_streak', 0,
      'longest_streak', 0,
      'protection_days', 1,
      'checked_in_today', false
    );
  END IF;

  RETURN jsonb_build_object(
    'current_streak', v_streak.current_streak,
    'longest_streak', v_streak.longest_streak,
    'protection_days', v_streak.protection_days,
    'checked_in_today', NULLIF(v_streak.last_login_date, '')::date = current_date,
    'last_login_date', v_streak.last_login_date,
    'last_protection_earned_at', v_streak.last_protection_earned_at,
    'last_protection_used_for', v_streak.last_protection_used_for
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_daily_streak() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_learning_streak_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_daily_streak() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_learning_streak_status() TO authenticated;
