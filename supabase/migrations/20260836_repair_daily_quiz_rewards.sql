-- Daily quizzes are private payloads, so their identifiers are intentionally
-- absent from public.quizzes. Store their results separately instead of
-- violating completions.quiz_id's foreign key.
CREATE TABLE IF NOT EXISTS public.daily_quiz_completions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  quiz_id TEXT NOT NULL,
  quiz_title TEXT NOT NULL DEFAULT 'Daily Challenge',
  taker_name TEXT NOT NULL DEFAULT 'طالب متميز',
  score INTEGER NOT NULL CHECK (score >= 0),
  total_questions INTEGER NOT NULL CHECK (total_questions > 0),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  feedback TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, quiz_id)
);

ALTER TABLE public.daily_quiz_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS daily_quiz_completions_own_read ON public.daily_quiz_completions;
CREATE POLICY daily_quiz_completions_own_read ON public.daily_quiz_completions
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid())::text);

-- Drop first because the response shape adds reward status for the client.
DROP FUNCTION IF EXISTS public.submit_user_daily_quiz_attempt(TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION public.submit_user_daily_quiz_attempt(
  p_quiz_id TEXT,
  p_taker_id TEXT,
  p_taker_name TEXT,
  p_score INTEGER,
  p_total_questions INTEGER,
  p_rating INTEGER DEFAULT NULL,
  p_feedback TEXT DEFAULT ''
)
RETURNS TABLE(
  id TEXT,
  quiz_id TEXT,
  taker_id TEXT,
  taker_name TEXT,
  score INTEGER,
  total_questions INTEGER,
  rating INTEGER,
  feedback TEXT,
  created_at TIMESTAMPTZ,
  xp_awarded INTEGER,
  points_awarded INTEGER,
  total_points INTEGER,
  daily_completed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_completion public.daily_quiz_completions%ROWTYPE;
  v_completion_id TEXT;
  v_quiz_xp INTEGER := 0;
  v_points INTEGER := 0;
  v_points_awarded INTEGER := 0;
  v_total_points INTEGER := 0;
  v_rows INTEGER := 0;
  v_inserted BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_taker_id IS NULL OR p_taker_id <> v_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_quiz_id IS NULL OR p_quiz_id !~ '^daily-[A-Za-z0-9-]{8,200}$' THEN
    RAISE EXCEPTION 'Invalid daily quiz identifier';
  END IF;

  IF p_score IS NULL OR p_total_questions IS NULL OR p_total_questions < 1
    OR p_score < 0 OR p_score > p_total_questions THEN
    RAISE EXCEPTION 'Invalid quiz score';
  END IF;

  IF p_rating IS NOT NULL AND (p_rating < 1 OR p_rating > 5) THEN
    RAISE EXCEPTION 'Invalid quiz rating';
  END IF;

  IF length(COALESCE(p_feedback, '')) > 4000 THEN
    RAISE EXCEPTION 'Feedback is too long';
  END IF;

  -- Lock the active private slot. A retry after a committed success returns
  -- the original result without re-awarding points; a competing submission
  -- waits on this lock and follows the same idempotent path.
  PERFORM 1
  FROM public.daily_quiz_user_slots
  WHERE user_id = v_user_id
    AND quiz_payload->>'id' = p_quiz_id
    AND answered_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    SELECT * INTO v_completion
    FROM public.daily_quiz_completions
    WHERE user_id = v_user_id AND daily_quiz_completions.quiz_id = p_quiz_id
    LIMIT 1;

    IF FOUND THEN
      UPDATE public.daily_quiz_completions AS daily_completion
      SET rating = COALESCE(p_rating, v_completion.rating),
          feedback = CASE WHEN COALESCE(p_feedback, '') = '' THEN v_completion.feedback ELSE p_feedback END,
          taker_name = COALESCE(NULLIF(trim(p_taker_name), ''), v_completion.taker_name),
          updated_at = now()
      WHERE daily_completion.id = v_completion.id
      RETURNING * INTO v_completion;

      SELECT COALESCE(points, 0) INTO v_total_points
      FROM public.user_reward_balances
      WHERE user_id = v_user_id;

      RETURN QUERY SELECT
        v_completion.id,
        v_completion.quiz_id,
        v_completion.user_id,
        v_completion.taker_name,
        v_completion.score,
        v_completion.total_questions,
        v_completion.rating,
        v_completion.feedback,
        v_completion.created_at,
        0,
        0,
        COALESCE(v_total_points, 0),
        true;
      RETURN;
    END IF;

    RAISE EXCEPTION 'Daily quiz is unavailable';
  END IF;

  SELECT * INTO v_completion
  FROM public.daily_quiz_completions
  WHERE user_id = v_user_id AND daily_quiz_completions.quiz_id = p_quiz_id
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.daily_quiz_completions AS daily_completion
    SET rating = COALESCE(p_rating, v_completion.rating),
        feedback = CASE WHEN COALESCE(p_feedback, '') = '' THEN v_completion.feedback ELSE p_feedback END,
        taker_name = COALESCE(NULLIF(trim(p_taker_name), ''), v_completion.taker_name),
        updated_at = now()
    WHERE daily_completion.id = v_completion.id
    RETURNING * INTO v_completion;
  ELSE
    v_completion_id := 'daily_comp_' || extract(epoch FROM now())::bigint || '_' || substr(md5(random()::text), 1, 8);
    v_quiz_xp := 10 + (p_score * 10);
    v_points := 10 + (p_score * 2);

    IF (p_score::numeric / p_total_questions::numeric) >= 0.80 THEN
      v_points := v_points + 15;
    END IF;

    IF p_score >= p_total_questions THEN
      v_points := v_points + 30;
    END IF;

    INSERT INTO public.daily_quiz_completions (
      id, user_id, quiz_id, quiz_title, taker_name, score, total_questions, rating, feedback
    ) VALUES (
      v_completion_id,
      v_user_id,
      p_quiz_id,
      'Daily Challenge',
      COALESCE(NULLIF(trim(p_taker_name), ''), 'طالب متميز'),
      p_score,
      p_total_questions,
      p_rating,
      COALESCE(p_feedback, '')
    )
    RETURNING * INTO v_completion;

    INSERT INTO public.reward_points_ledger (
      user_id, points, event_type, event_key, reference_id, metadata
    ) VALUES (
      v_user_id,
      v_points,
      'quiz_completion',
      'quiz_completion:' || v_completion.id,
      v_completion.id,
      jsonb_build_object(
        'quiz_id', v_completion.quiz_id,
        'score', v_completion.score,
        'total_questions', v_completion.total_questions,
        'source', 'daily_quiz'
      )
    )
    ON CONFLICT (user_id, event_key) DO NOTHING;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_inserted := v_rows > 0;

    IF v_inserted THEN
      v_points_awarded := v_points;
      INSERT INTO public.user_reward_balances (user_id, points, level)
      VALUES (v_user_id, v_points, public.reward_level_for_points(v_points))
      ON CONFLICT (user_id) DO UPDATE
      SET points = public.user_reward_balances.points + v_points,
          level = public.reward_level_for_points(public.user_reward_balances.points + v_points),
          updated_at = now()
      RETURNING points INTO v_total_points;

      UPDATE public.users
      SET xp = COALESCE(xp, 0) + v_quiz_xp + (v_points * 10),
          updated_at = now()
      WHERE uid::text = v_user_id;
    END IF;
  END IF;

  IF NOT v_inserted THEN
    SELECT COALESCE(points, 0) INTO v_total_points
    FROM public.user_reward_balances
    WHERE user_id = v_user_id;
  END IF;

  UPDATE public.daily_quiz_user_slots
  SET quiz_payload = NULL,
      quiz_id = NULL,
      answered_at = now(),
      next_available_at = now() + refresh_interval_seconds * interval '1 second',
      refreshing = false
  WHERE user_id = v_user_id
    AND quiz_payload->>'id' = p_quiz_id;

  RETURN QUERY SELECT
    v_completion.id,
    v_completion.quiz_id,
    v_completion.user_id,
    v_completion.taker_name,
    v_completion.score,
    v_completion.total_questions,
    v_completion.rating,
    v_completion.feedback,
    v_completion.created_at,
    v_quiz_xp,
    v_points_awarded,
    COALESCE(v_total_points, 0),
    true;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_user_daily_quiz_attempt(TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_user_daily_quiz_attempt(TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT) TO authenticated;
