-- Repair private daily completion: daily quizzes are not rows in public.quizzes.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.submit_user_daily_quiz_attempt(
  p_quiz_id TEXT,
  p_taker_id TEXT,
  p_taker_name TEXT,
  p_score INTEGER,
  p_total_questions INTEGER,
  p_rating INTEGER DEFAULT NULL,
  p_feedback TEXT DEFAULT ''
) RETURNS TABLE (
  id TEXT, quiz_id TEXT, taker_id TEXT, taker_name TEXT, score INTEGER,
  total_questions INTEGER, rating INTEGER, feedback TEXT, created_at TIMESTAMPTZ,
  xp_awarded INTEGER
) AS $$
DECLARE
  v_completion_id TEXT;
  v_xp INTEGER := 0;
  v_exists BOOLEAN;
BEGIN
  IF auth.uid()::text <> p_taker_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT EXISTS(
    SELECT 1 FROM public.completions c
     WHERE c.quiz_id = p_quiz_id AND c.taker_id = p_taker_id
  ) INTO v_exists;

  SELECT c.id INTO v_completion_id FROM public.completions c
   WHERE c.quiz_id = p_quiz_id AND c.taker_id = p_taker_id
   LIMIT 1 FOR UPDATE;

  IF v_completion_id IS NULL THEN
    v_completion_id := 'comp_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 8);
    INSERT INTO public.completions (id, quiz_id, quiz_title, taker_id, taker_name, score, total_questions, rating, feedback)
    VALUES (v_completion_id, p_quiz_id, 'Daily Challenge', p_taker_id, p_taker_name,
            p_score, GREATEST(1, p_total_questions), p_rating, COALESCE(p_feedback, ''));
    v_xp := 10 + (GREATEST(0, p_score) * 10);
    UPDATE public.users SET xp = COALESCE(xp, 0) + v_xp, updated_at = now()
     WHERE uid = p_taker_id;
  ELSE
    UPDATE public.completions SET score = p_score, total_questions = GREATEST(1, p_total_questions),
      rating = p_rating, feedback = COALESCE(p_feedback, '') WHERE id = v_completion_id;
  END IF;

  -- Mark the private slot solved in the same transaction. The payload is cleared
  -- so the old daily quiz can never be opened again after a successful save.
  UPDATE public.daily_quiz_user_slots
     SET quiz_payload = NULL,
         quiz_id = NULL,
         answered_at = COALESCE(answered_at, now()),
         next_available_at = COALESCE(next_available_at, now() + refresh_interval_seconds * interval '1 second'),
         refreshing = false
   WHERE user_id = p_taker_id
     AND quiz_payload->>'id' = p_quiz_id;

  RETURN QUERY SELECT c.id, c.quiz_id, c.taker_id, c.taker_name, c.score, c.total_questions,
    c.rating, c.feedback, c.created_at, v_xp FROM public.completions c WHERE c.id = v_completion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.submit_user_daily_quiz_attempt(TEXT,TEXT,TEXT,INTEGER,INTEGER,INTEGER,TEXT) TO authenticated;

-- Restore a zeroed profile from durable completion history without reducing any existing XP.
UPDATE public.users u
   SET xp = totals.rebuilt_xp,
       updated_at = now()
  FROM (
    SELECT c.taker_id, SUM(10 + (GREATEST(0, c.score) * 10))::INTEGER AS rebuilt_xp
      FROM public.completions c
     GROUP BY c.taker_id
  ) totals
 WHERE u.uid = totals.taker_id
   AND COALESCE(u.xp, 0) = 0
   AND totals.rebuilt_xp > 0;

-- Reconcile daily slots for attempts already saved before this repair.
UPDATE public.daily_quiz_user_slots s
   SET quiz_payload = NULL,
       quiz_id = NULL,
       answered_at = COALESCE(s.answered_at, now()),
       next_available_at = COALESCE(s.next_available_at, now() + s.refresh_interval_seconds * interval '1 second'),
       refreshing = false
 WHERE s.quiz_payload->>'id' IN (
   SELECT c.quiz_id FROM public.completions c WHERE c.taker_id = s.user_id
 );

-- Release stale generation locks only; do not delete a valid unsolved payload.
UPDATE public.daily_quiz_user_slots
   SET refreshing = false
 WHERE refreshing = true
   AND generated_at IS NOT NULL
   AND generated_at < now() - interval '10 minutes'
   AND answered_at IS NULL;

NOTIFY pgrst, 'reload schema';
