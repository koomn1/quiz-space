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
  IF v_user_id IS NULL OR v_user_id = '' THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_streak FROM public.user_streaks WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('current_streak', 0, 'longest_streak', 0, 'protection_days', 1, 'checked_in_today', false);
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

REVOKE ALL ON FUNCTION public.get_learning_streak_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_learning_streak_status() TO authenticated;
