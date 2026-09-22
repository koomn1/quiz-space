-- Allow a student to finalize a reviewed attempt without changing quiz content.
-- The RPC only accepts the owner/guest identity and a bounded score.

CREATE OR REPLACE FUNCTION public.update_quiz_attempt_score(
  p_completion_id text,
  p_score integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_taker_id text;
  v_quiz_id text;
  v_total integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT taker_id, quiz_id, total_questions INTO v_taker_id, v_quiz_id, v_total
    FROM public.completions WHERE id = p_completion_id FOR UPDATE;
  IF NOT FOUND OR v_taker_id <> auth.uid()::text THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_score IS NULL OR p_score < 0 OR p_score > v_total THEN RAISE EXCEPTION 'Invalid score'; END IF;

  PERFORM set_config('quizspace.internal_completion_write', 'on', true);
  UPDATE public.completions SET is_best = false WHERE quiz_id = v_quiz_id AND taker_id = v_taker_id;
  UPDATE public.completions SET score = p_score, is_best = true WHERE id = p_completion_id;
  PERFORM set_config('quizspace.internal_completion_write', 'off', true);
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('quizspace.internal_completion_write', 'off', true);
  RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_guest_quiz_attempt_score(
  p_completion_id text,
  p_guest_id text,
  p_client_attempt_key text,
  p_score integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quiz_id text;
  v_total integer;
BEGIN
  IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Guest session required'; END IF;
  SELECT quiz_id, total_questions INTO v_quiz_id, v_total
    FROM public.guest_quiz_attempts
   WHERE id = p_completion_id AND guest_id = p_guest_id AND client_attempt_key = p_client_attempt_key
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_guest_id IS NULL OR p_guest_id !~ '^user-guest-[A-HJ-NP-Z2-9]{6}$' THEN RAISE EXCEPTION 'Invalid guest identity'; END IF;
  IF p_score IS NULL OR p_score < 0 OR p_score > v_total THEN RAISE EXCEPTION 'Invalid score'; END IF;

  PERFORM set_config('quizspace.internal_guest_completion_write', 'on', true);
  UPDATE public.guest_quiz_attempts SET is_best = false WHERE quiz_id = v_quiz_id AND guest_id = p_guest_id;
  UPDATE public.guest_quiz_attempts SET score = p_score, is_best = true WHERE id = p_completion_id;
  PERFORM set_config('quizspace.internal_guest_completion_write', 'off', true);
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('quizspace.internal_guest_completion_write', 'off', true);
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.update_quiz_attempt_score(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_quiz_attempt_score(text, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.update_guest_quiz_attempt_score(text, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_guest_quiz_attempt_score(text, text, text, integer) TO anon;
NOTIFY pgrst, 'reload schema';
