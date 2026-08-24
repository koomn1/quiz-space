-- Follow-up hardening: close legacy public group-challenge policies and allow
-- only the trusted submission RPC to maintain is_best/attempt metadata.

DROP POLICY IF EXISTS "Users can insert own progress" ON public.group_challenge_progress;
DROP POLICY IF EXISTS "Teachers can insert challenges" ON public.group_challenges;
DROP POLICY IF EXISTS "Teachers can update own challenges" ON public.group_challenges;

CREATE POLICY group_challenge_progress_scoped_insert
  ON public.group_challenge_progress FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM public.group_challenges gc
      LEFT JOIN public.classroom_students cs
        ON cs.class_id = gc.class_id AND cs.student_id = auth.uid()::text
      WHERE gc.id = challenge_id
        AND (cs.student_id IS NOT NULL OR gc.created_by = auth.uid()::text OR public.current_user_is_admin())
    )
  );

CREATE POLICY group_challenges_scoped_insert
  ON public.group_challenges FOR INSERT TO authenticated
  WITH CHECK (
    (created_by = auth.uid()::text AND EXISTS (
      SELECT 1 FROM public.classrooms c WHERE c.id = class_id AND c.created_by = auth.uid()::text
    )) OR public.current_user_is_admin()
  );

CREATE POLICY group_challenges_scoped_update
  ON public.group_challenges FOR UPDATE TO authenticated
  USING ((created_by = auth.uid()::text) OR public.current_user_is_admin())
  WITH CHECK ((created_by = auth.uid()::text) OR public.current_user_is_admin());

CREATE OR REPLACE FUNCTION public.protect_completion_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_internal boolean := current_setting('quizspace.internal_completion_write', true) = 'on';
BEGIN
  IF v_internal OR public.current_user_is_admin() THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NULL OR NEW.taker_id <> auth.uid()::text OR (TG_OP = 'UPDATE' AND OLD.taker_id <> auth.uid()::text) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW.id IS DISTINCT FROM OLD.id OR
    NEW.quiz_id IS DISTINCT FROM OLD.quiz_id OR
    NEW.quiz_title IS DISTINCT FROM OLD.quiz_title OR
    NEW.taker_id IS DISTINCT FROM OLD.taker_id OR
    NEW.taker_name IS DISTINCT FROM OLD.taker_name OR
    NEW.score IS DISTINCT FROM OLD.score OR
    NEW.total_questions IS DISTINCT FROM OLD.total_questions OR
    NEW.attempt_number IS DISTINCT FROM OLD.attempt_number OR
    NEW.is_best IS DISTINCT FROM OLD.is_best OR
    NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'Only rating and feedback may be edited';
  END IF;
  SELECT COALESCE(jsonb_array_length(q.questions), 0)
    INTO v_total
    FROM public.quizzes q
   WHERE q.id = NEW.quiz_id;
  IF TG_OP = 'INSERT' AND (v_total IS NULL OR v_total <= 0 OR NEW.total_questions <> v_total OR NEW.score < 0 OR NEW.score > v_total) THEN
    RAISE EXCEPTION 'Invalid completion score';
  END IF;
  IF NEW.rating IS NOT NULL AND (NEW.rating < 1 OR NEW.rating > 5) THEN
    RAISE EXCEPTION 'Invalid rating';
  END IF;
  IF NEW.feedback IS NOT NULL AND char_length(NEW.feedback) > 2000 THEN
    RAISE EXCEPTION 'Feedback is too long';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
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
  IF auth.uid() IS NULL OR auth.uid()::text <> p_taker_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_quiz_id IS NULL OR char_length(trim(p_quiz_id)) = 0 OR char_length(p_quiz_id) > 200 THEN RAISE EXCEPTION 'Invalid quiz'; END IF;
  IF p_taker_name IS NULL OR char_length(trim(p_taker_name)) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Invalid taker name'; END IF;
  IF p_rating IS NOT NULL AND (p_rating < 1 OR p_rating > 5) THEN RAISE EXCEPTION 'Invalid rating'; END IF;
  IF p_feedback IS NOT NULL AND char_length(p_feedback) > 2000 THEN RAISE EXCEPTION 'Feedback is too long'; END IF;

  SELECT q.title, COALESCE(jsonb_array_length(q.questions), 0)
    INTO v_quiz_title, v_total_questions
    FROM public.quizzes q
   WHERE q.id = p_quiz_id
   FOR SHARE;
  IF NOT FOUND OR v_total_questions <= 0 THEN RAISE EXCEPTION 'Quiz not found'; END IF;
  IF v_score < 0 OR v_score > v_total_questions THEN RAISE EXCEPTION 'Invalid score'; END IF;

  SELECT COUNT(*)::integer, COALESCE(MAX(c.score), 0)
    INTO v_attempt_number, v_previous_best
    FROM public.completions c
   WHERE c.quiz_id = p_quiz_id AND c.taker_id = p_taker_id;
  v_attempt_number := v_attempt_number + 1;
  v_is_best := v_attempt_number = 1 OR v_score > v_previous_best;
  v_xp_awarded := CASE WHEN v_attempt_number = 1 THEN 10 + (v_score * 10) ELSE GREATEST(0, v_score - v_previous_best) * 10 END;

  v_completion_id := 'comp_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 10);
  PERFORM set_config('quizspace.internal_completion_write', 'on', true);
  IF v_is_best THEN
    UPDATE public.completions SET is_best = false WHERE quiz_id = p_quiz_id AND taker_id = p_taker_id;
  END IF;
  INSERT INTO public.completions (
    id, quiz_id, quiz_title, taker_id, taker_name, score, total_questions,
    rating, feedback, attempt_number, is_best
  ) VALUES (
    v_completion_id, p_quiz_id, v_quiz_title, p_taker_id, trim(p_taker_name),
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
REVOKE ALL ON FUNCTION public.protect_completion_integrity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_quiz_attempt(text, text, text, integer, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(text, text, text, integer, integer, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
