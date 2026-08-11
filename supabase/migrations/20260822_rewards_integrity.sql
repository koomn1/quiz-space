-- Integrity hardening for daily reward claims and canonical streak display.

CREATE UNIQUE INDEX IF NOT EXISTS lucky_spin_claims_user_day_idx
  ON public.lucky_spin_claims (user_id, claimed_date);

CREATE UNIQUE INDEX IF NOT EXISTS brain_challenge_attempts_user_day_order_idx
  ON public.brain_challenge_attempts (user_id, challenge_date, attempt_order);

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
  INSERT INTO public.user_reward_balances (user_id, points, daily_streak, last_daily_claim, level)
  VALUES (v_user_id, 0, v_current, v_today::date, public.reward_level_for_points(0))
  ON CONFLICT (user_id) DO UPDATE SET daily_streak = v_current, last_daily_claim = v_today::date, updated_at = now();
  RETURN jsonb_build_object('success', true, 'streak', v_current, 'points', (v_reward->>'points_awarded')::integer, 'message', 'Streak day ' || v_current || '!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

NOTIFY pgrst, 'reload schema';
