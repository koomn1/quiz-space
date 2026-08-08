-- Repair migration for production databases that missed earlier migrations.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0;

UPDATE public.users SET xp = 0 WHERE xp IS NULL;

DROP FUNCTION IF EXISTS public.submit_quiz_attempt(TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT);
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
  p_quiz_id TEXT,
  p_taker_id TEXT,
  p_taker_name TEXT,
  p_score INTEGER,
  p_rating INTEGER DEFAULT NULL,
  p_feedback TEXT DEFAULT ''
) RETURNS TABLE (
  id TEXT,
  quiz_id TEXT,
  taker_id TEXT,
  taker_name TEXT,
  score INTEGER,
  total_questions INTEGER,
  rating INTEGER,
  feedback TEXT,
  created_at TIMESTAMPTZ,
  xp_awarded INTEGER
) AS $$
DECLARE
  v_completion_id TEXT;
  v_total_questions INTEGER;
  v_xp INTEGER := 0;
BEGIN
  IF auth.uid()::text <> p_taker_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT GREATEST(1, COALESCE(jsonb_array_length(q.questions), 1))
    INTO v_total_questions FROM public.quizzes q WHERE q.id = p_quiz_id;
  IF v_total_questions IS NULL THEN RAISE EXCEPTION 'Quiz not found'; END IF;

  SELECT c.id INTO v_completion_id
    FROM public.completions c
   WHERE c.quiz_id = p_quiz_id AND c.taker_id = p_taker_id
   LIMIT 1 FOR UPDATE;

  IF v_completion_id IS NULL THEN
    v_completion_id := 'comp_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 8);
    INSERT INTO public.completions (id, quiz_id, quiz_title, taker_id, taker_name, score, total_questions, rating, feedback)
    SELECT v_completion_id, q.id, q.title, p_taker_id, p_taker_name, p_score, v_total_questions, p_rating, COALESCE(p_feedback, '')
      FROM public.quizzes q WHERE q.id = p_quiz_id;
    UPDATE public.quizzes SET total_plays = COALESCE(total_plays, 0) + 1 WHERE id = p_quiz_id;
    v_xp := 10 + (GREATEST(0, p_score) * 10);
    UPDATE public.users SET xp = COALESCE(xp, 0) + v_xp, updated_at = now()
     WHERE uid = p_taker_id;
  ELSE
    UPDATE public.completions SET score = p_score, total_questions = v_total_questions,
      rating = p_rating, feedback = COALESCE(p_feedback, '') WHERE id = v_completion_id;
  END IF;

  RETURN QUERY SELECT c.id, c.quiz_id, c.taker_id, c.taker_name, c.score, c.total_questions,
    c.rating, c.feedback, c.created_at, v_xp FROM public.completions c WHERE c.id = v_completion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(TEXT,TEXT,TEXT,INTEGER,INTEGER,TEXT) TO authenticated;

-- Make the timer reliable even if an older RPC definition is still present.
DROP FUNCTION IF EXISTS public.get_user_daily_quiz_slot(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.get_user_daily_quiz_slot(p_user_id TEXT, p_tier TEXT)
RETURNS TABLE (
  quiz_id TEXT, quiz_payload JSONB, generated_at TIMESTAMPTZ, answered_at TIMESTAMPTZ,
  next_available_at TIMESTAMPTZ, refreshing BOOLEAN, refresh_interval_seconds INTEGER,
  seconds_until_refresh INTEGER
) AS $$
BEGIN
  IF auth.uid()::text <> p_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  INSERT INTO public.daily_quiz_user_slots (user_id, tier, refresh_interval_seconds)
  VALUES (p_user_id, p_tier, CASE p_tier WHEN 'diamond' THEN 60 WHEN 'gold' THEN 3600 ELSE 86400 END)
  ON CONFLICT (user_id, tier) DO NOTHING;
  RETURN QUERY SELECT s.quiz_payload->>'id', s.quiz_payload, s.generated_at, s.answered_at,
    s.next_available_at, s.refreshing, s.refresh_interval_seconds,
    CASE WHEN s.next_available_at IS NULL THEN 0
      ELSE GREATEST(0, CEIL(EXTRACT(EPOCH FROM (s.next_available_at - now())))::INTEGER) END
    FROM public.daily_quiz_user_slots s
   WHERE s.user_id = p_user_id AND s.tier = p_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.get_user_daily_quiz_slot(TEXT,TEXT) TO authenticated;
NOTIFY pgrst, 'reload schema';
