-- Native mobile quiz attempts are submitted through the Firebase-verified Edge
-- Function. This RPC is intentionally executable only by service_role; the
-- client never receives a Supabase administrative credential.
CREATE OR REPLACE FUNCTION public.submit_mobile_quiz_attempt(
  p_quiz_id text,
  p_taker_id text,
  p_taker_name text,
  p_score integer,
  p_rating integer DEFAULT NULL,
  p_feedback text DEFAULT ''
)
RETURNS TABLE(
  id text,
  quiz_id text,
  taker_id text,
  taker_name text,
  score integer,
  total_questions integer,
  rating integer,
  feedback text,
  created_at timestamptz,
  attempt_number integer,
  is_best boolean,
  xp_awarded integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completion_id text;
  v_total_questions integer;
  v_attempt_number integer;
  v_previous_best integer;
  v_score integer := COALESCE(p_score, -1);
  v_xp_awarded integer;
  v_is_best boolean;
  v_quiz_title text;
BEGIN
  IF p_taker_id IS NULL OR char_length(trim(p_taker_id)) = 0 THEN RAISE EXCEPTION 'Invalid taker'; END IF;
  IF p_quiz_id IS NULL OR char_length(trim(p_quiz_id)) = 0 OR char_length(p_quiz_id) > 256 THEN RAISE EXCEPTION 'Invalid quiz'; END IF;
  IF p_taker_name IS NULL OR char_length(trim(p_taker_name)) NOT BETWEEN 1 AND 160 THEN RAISE EXCEPTION 'Invalid taker name'; END IF;
  IF p_rating IS NOT NULL AND (p_rating < 1 OR p_rating > 5) THEN RAISE EXCEPTION 'Invalid rating'; END IF;
  IF p_feedback IS NOT NULL AND char_length(p_feedback) > 2000 THEN RAISE EXCEPTION 'Feedback is too long'; END IF;

  SELECT q.title, GREATEST(0, COALESCE(jsonb_array_length(q.questions), 0))
    INTO v_quiz_title, v_total_questions
    FROM public.quizzes q
   WHERE q.id = trim(p_quiz_id)
     AND (q.distribution_routing = 'public' OR q.creator_id = p_taker_id)
   FOR SHARE;
  IF NOT FOUND OR v_total_questions <= 0 THEN RAISE EXCEPTION 'Quiz not found'; END IF;
  IF v_score < 0 OR v_score > v_total_questions THEN RAISE EXCEPTION 'Invalid score'; END IF;

  SELECT COUNT(*)::integer, COALESCE(MAX(c.score), 0)
    INTO v_attempt_number, v_previous_best
    FROM public.completions c
   WHERE c.quiz_id = trim(p_quiz_id) AND c.taker_id = p_taker_id;
  v_attempt_number := v_attempt_number + 1;
  v_is_best := v_attempt_number = 1 OR v_score > v_previous_best;
  v_xp_awarded := CASE WHEN v_attempt_number = 1 THEN 10 + (v_score * 10) ELSE GREATEST(0, v_score - v_previous_best) * 10 END;

  v_completion_id := 'comp_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 10);
  PERFORM set_config('quizspace.internal_completion_write', 'on', true);
  IF v_is_best THEN
    UPDATE public.completions SET is_best = false WHERE quiz_id = trim(p_quiz_id) AND taker_id = p_taker_id;
  END IF;
  INSERT INTO public.completions (
    id, quiz_id, quiz_title, taker_id, taker_name, score, total_questions,
    rating, feedback, attempt_number, is_best
  ) VALUES (
    v_completion_id, trim(p_quiz_id), v_quiz_title, p_taker_id, trim(p_taker_name),
    v_score, v_total_questions, p_rating, COALESCE(p_feedback, ''), v_attempt_number, v_is_best
  );
  IF v_xp_awarded > 0 THEN
    UPDATE public.users SET xp = COALESCE(xp, 0) + v_xp_awarded, updated_at = now() WHERE uid = p_taker_id;
  END IF;
  PERFORM set_config('quizspace.internal_completion_write', 'off', true);

  RETURN QUERY SELECT c.id, c.quiz_id, c.taker_id, c.taker_name, c.score, c.total_questions,
    c.rating, c.feedback, c.created_at, c.attempt_number, c.is_best, v_xp_awarded
    FROM public.completions c WHERE c.id = v_completion_id;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('quizspace.internal_completion_write', 'off', true);
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_mobile_quiz_attempt(text, text, text, integer, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_mobile_quiz_attempt(text, text, text, integer, integer, text) FROM anon;
REVOKE ALL ON FUNCTION public.submit_mobile_quiz_attempt(text, text, text, integer, integer, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.submit_mobile_quiz_attempt(text, text, text, integer, integer, text) TO service_role;
