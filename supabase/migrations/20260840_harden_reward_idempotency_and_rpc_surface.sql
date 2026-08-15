-- Preserve all caller authorization checks while ensuring milestone ledger conflicts
-- can never be followed by a second balance or XP increment.
CREATE OR REPLACE FUNCTION public.award_quiz_completion_rewards(p_completion_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_completion RECORD;
  v_points INTEGER;
  v_event_key TEXT;
  v_inserted BOOLEAN := false;
  v_rows INTEGER := 0;
  v_total_completed INTEGER;
  v_level INTEGER;
  v_total_points INTEGER;
  v_extra_points INTEGER := 0;
BEGIN
  SELECT c.* INTO v_completion
  FROM public.completions c
  WHERE c.id = p_completion_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Completion not found';
  END IF;

  IF auth.uid()::text <> v_completion.taker_id::text THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_event_key := 'quiz_completion:' || p_completion_id;
  v_points := 10 + (GREATEST(0, COALESCE(v_completion.score, 0)) * 2);

  IF COALESCE(v_completion.total_questions, 0) > 0
     AND (v_completion.score::numeric / v_completion.total_questions::numeric) >= 0.80 THEN
    v_points := v_points + 15;
  END IF;

  IF COALESCE(v_completion.total_questions, 0) > 0
     AND v_completion.score >= v_completion.total_questions THEN
    v_points := v_points + 30;
  END IF;

  INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id, metadata)
  VALUES (
    v_completion.taker_id::text,
    v_points,
    'quiz_completion',
    v_event_key,
    p_completion_id,
    jsonb_build_object('quiz_id', v_completion.quiz_id, 'score', v_completion.score, 'total_questions', v_completion.total_questions)
  )
  ON CONFLICT (user_id, event_key) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_inserted := v_rows > 0;

  IF v_inserted THEN
    INSERT INTO public.user_reward_balances (user_id, points, level)
    VALUES (v_completion.taker_id::text, v_points, public.reward_level_for_points(v_points))
    ON CONFLICT (user_id) DO UPDATE
      SET points = public.user_reward_balances.points + v_points,
          level = public.reward_level_for_points(public.user_reward_balances.points + v_points),
          updated_at = now();

    UPDATE public.users
      SET xp = COALESCE(xp, 0) + (v_points * 10)
      WHERE uid::text = v_completion.taker_id::text;
  END IF;

  SELECT count(*)::integer INTO v_total_completed
  FROM public.completions
  WHERE taker_id = v_completion.taker_id;

  IF v_total_completed = 5 THEN
    INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id)
    VALUES (v_completion.taker_id::text, 200, 'milestone_reward', 'milestone_5_quizzes', p_completion_id)
    ON CONFLICT (user_id, event_key) DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;

    IF v_rows > 0 THEN
      v_extra_points := v_extra_points + 200;
      UPDATE public.user_reward_balances
        SET points = points + 200,
            level = public.reward_level_for_points(points + 200),
            updated_at = now()
        WHERE user_id = v_completion.taker_id::text;
      UPDATE public.users
        SET xp = COALESCE(xp, 0) + 2000
        WHERE uid::text = v_completion.taker_id::text;
    END IF;
  END IF;

  IF v_total_completed = 10 THEN
    INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id)
    VALUES (v_completion.taker_id::text, 500, 'milestone_reward', 'milestone_10_quizzes', p_completion_id)
    ON CONFLICT (user_id, event_key) DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;

    IF v_rows > 0 THEN
      v_extra_points := v_extra_points + 500;
      UPDATE public.user_reward_balances
        SET points = points + 500,
            level = public.reward_level_for_points(points + 500),
            updated_at = now()
        WHERE user_id = v_completion.taker_id::text;
      UPDATE public.users
        SET xp = COALESCE(xp, 0) + 5000
        WHERE uid::text = v_completion.taker_id::text;
      INSERT INTO public.reward_inventory (user_id, item_id)
      VALUES (v_completion.taker_id::text, 'frame_nature_leaf')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  IF v_total_completed >= 1 THEN
    INSERT INTO public.user_reward_badges(user_id, badge_id)
    VALUES (v_completion.taker_id::text, 'first_quiz')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_total_completed >= 10 THEN
    INSERT INTO public.user_reward_badges(user_id, badge_id)
    VALUES (v_completion.taker_id::text, 'active_learner')
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT b.points, b.level INTO v_total_points, v_level
  FROM public.user_reward_balances b
  WHERE b.user_id = v_completion.taker_id::text;

  RETURN jsonb_build_object(
    'points_awarded', (CASE WHEN v_inserted THEN v_points ELSE 0 END) + v_extra_points,
    'total_points', v_total_points,
    'level', v_level,
    'milestone_reached', v_total_completed IN (5, 10)
  );
END;
$function$;

-- These are internal helper/trigger functions and are not application RPC endpoints.
REVOKE EXECUTE ON FUNCTION public.check_daily_cooldown(text, text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_unverified_active_frame_update() FROM PUBLIC, anon, authenticated;
