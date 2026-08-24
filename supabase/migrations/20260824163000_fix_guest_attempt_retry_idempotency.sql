-- Fix the idempotent retry branch of the guest quiz attempt RPC.
-- The explicit table alias avoids ambiguity with the RETURNS TABLE(id ...) output variable.
CREATE OR REPLACE FUNCTION public.submit_guest_quiz_attempt(
  p_quiz_id TEXT, p_guest_id TEXT, p_guest_name TEXT, p_score INTEGER,
  p_client_attempt_key TEXT, p_rating INTEGER DEFAULT NULL, p_feedback TEXT DEFAULT ''
)
RETURNS TABLE(id TEXT, quiz_id TEXT, taker_id TEXT, taker_name TEXT, score INTEGER,
              total_questions INTEGER, rating INTEGER, feedback TEXT, created_at TIMESTAMPTZ,
              attempt_number INTEGER, is_best BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id TEXT;
  v_total_questions INTEGER;
  v_attempt_number INTEGER;
  v_previous_best INTEGER;
  v_score INTEGER := COALESCE(p_score, -1);
  v_inserted BOOLEAN := false;
  v_name TEXT := trim(COALESCE(p_guest_name, ''));
BEGIN
  IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Guest submission requires an anonymous session'; END IF;
  IF p_quiz_id IS NULL OR char_length(trim(p_quiz_id)) = 0 OR char_length(p_quiz_id) > 200 THEN RAISE EXCEPTION 'Invalid quiz'; END IF;
  IF p_guest_id IS NULL OR p_guest_id !~ '^user-guest-[A-HJ-NP-Z2-9]{6}$' THEN RAISE EXCEPTION 'Invalid guest identity'; END IF;
  IF char_length(v_name) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Invalid guest name'; END IF;
  IF p_client_attempt_key IS NULL OR char_length(p_client_attempt_key) NOT BETWEEN 16 AND 120 THEN RAISE EXCEPTION 'Invalid attempt key'; END IF;
  IF p_rating IS NOT NULL AND (p_rating < 1 OR p_rating > 5) THEN RAISE EXCEPTION 'Invalid rating'; END IF;
  IF char_length(COALESCE(p_feedback, '')) > 2000 THEN RAISE EXCEPTION 'Feedback is too long'; END IF;
  SELECT COALESCE(jsonb_array_length(q.questions), 0) INTO v_total_questions
    FROM public.quizzes q WHERE q.id = p_quiz_id FOR SHARE;
  IF NOT FOUND OR v_total_questions <= 0 THEN RAISE EXCEPTION 'Quiz not found'; END IF;
  IF v_score < 0 OR v_score > v_total_questions THEN RAISE EXCEPTION 'Invalid score'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_guest_id || ':' || p_quiz_id, 0));
  SELECT g.id INTO v_id FROM public.guest_quiz_attempts g
   WHERE g.guest_id = p_guest_id AND g.quiz_id = p_quiz_id AND g.client_attempt_key = p_client_attempt_key LIMIT 1;
  IF v_id IS NULL THEN
    SELECT COUNT(*)::INTEGER, COALESCE(MAX(g.score), 0) INTO v_attempt_number, v_previous_best
      FROM public.guest_quiz_attempts g WHERE g.quiz_id = p_quiz_id AND g.guest_id = p_guest_id;
    v_attempt_number := v_attempt_number + 1;
    v_id := 'guestcomp_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 10);
    INSERT INTO public.guest_quiz_attempts
      (id, quiz_id, guest_id, guest_name, score, total_questions, rating, feedback, attempt_number, is_best, client_attempt_key)
    VALUES
      (v_id, p_quiz_id, p_guest_id, v_name, v_score, v_total_questions, p_rating, COALESCE(p_feedback, ''),
       v_attempt_number, (v_attempt_number = 1 OR v_score > v_previous_best), p_client_attempt_key);
    v_inserted := true;
  ELSE
    UPDATE public.guest_quiz_attempts AS existing_attempt
       SET rating = COALESCE(p_rating, existing_attempt.rating),
           feedback = CASE WHEN char_length(COALESCE(p_feedback, '')) > 0 THEN p_feedback ELSE existing_attempt.feedback END,
           guest_name = v_name
     WHERE existing_attempt.id = v_id;
  END IF;
  IF v_inserted THEN
    UPDATE public.guest_quiz_attempts current_attempt SET is_best = false
     WHERE current_attempt.quiz_id = p_quiz_id AND current_attempt.guest_id = p_guest_id AND current_attempt.id <> v_id
       AND current_attempt.score < (SELECT new_attempt.score FROM public.guest_quiz_attempts new_attempt WHERE new_attempt.id = v_id);
  END IF;
  RETURN QUERY SELECT g.id, g.quiz_id, g.guest_id, g.guest_name, g.score, g.total_questions,
    g.rating, g.feedback, g.created_at, g.attempt_number, g.is_best
    FROM public.guest_quiz_attempts g WHERE g.id = v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_guest_quiz_attempt(text, text, text, integer, text, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_guest_quiz_attempt(text, text, text, integer, text, integer, text) TO anon;
NOTIFY pgrst, 'reload schema';
