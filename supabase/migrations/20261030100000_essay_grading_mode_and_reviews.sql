-- Migration: Essay Grading Mode & Manual Creator Review System
-- Allows creators to choose between AI grading and Manual Creator Review for essay questions.
-- When manual review is selected, essay answers are held with status 'pending_creator_review',
-- and only the quiz creator or admin can inspect and grade them.

-- 1. Quizzes: add essay_grading_mode ('manual' | 'ai')
ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS essay_grading_mode TEXT NOT NULL DEFAULT 'manual';

-- 2. Completions: add essay_answers, review_status, creator_feedback, reviewed_at, reviewed_by
ALTER TABLE public.completions
  ADD COLUMN IF NOT EXISTS essay_answers JSONB,
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS creator_feedback TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT;

CREATE INDEX IF NOT EXISTS idx_completions_review_status
  ON public.completions(quiz_id, review_status);

-- 3. Guest attempts: add same columns
ALTER TABLE public.guest_quiz_attempts
  ADD COLUMN IF NOT EXISTS essay_answers JSONB,
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS creator_feedback TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT;

CREATE INDEX IF NOT EXISTS idx_guest_attempts_review_status
  ON public.guest_quiz_attempts(quiz_id, review_status);

-- Drop previous function signatures before recreating with expanded TABLE returns
DROP FUNCTION IF EXISTS public.submit_quiz_attempt(text, text, text, integer, integer, text);
DROP FUNCTION IF EXISTS public.submit_quiz_attempt(text, text, text, integer, integer, text, jsonb);
DROP FUNCTION IF EXISTS public.submit_guest_quiz_attempt(text, text, text, integer, text, integer, text);
DROP FUNCTION IF EXISTS public.submit_guest_quiz_attempt(text, text, text, integer, text, integer, text, jsonb);
DROP FUNCTION IF EXISTS public.get_quiz_takers_unique(text);
DROP FUNCTION IF EXISTS public.get_pending_essay_reviews(text);
DROP FUNCTION IF EXISTS public.grade_quiz_essay_attempt(text, boolean, integer, text);

-- 4. Update submit_quiz_attempt to accept p_essay_answers and set review_status
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
  p_quiz_id text,
  p_taker_id text,
  p_taker_name text,
  p_score integer,
  p_rating integer DEFAULT NULL,
  p_feedback text DEFAULT '',
  p_essay_answers jsonb DEFAULT NULL
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
  xp_awarded integer,
  review_status text
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
  v_essay_mode text;
  v_has_essay boolean := false;
  v_review_status text := 'completed';
BEGIN
  IF auth.uid() IS NULL OR auth.uid()::text <> p_taker_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_quiz_id IS NULL OR char_length(trim(p_quiz_id)) = 0 OR char_length(p_quiz_id) > 200 THEN RAISE EXCEPTION 'Invalid quiz'; END IF;
  IF p_taker_name IS NULL OR char_length(trim(p_taker_name)) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Invalid taker name'; END IF;
  IF p_rating IS NOT NULL AND (p_rating < 1 OR p_rating > 5) THEN RAISE EXCEPTION 'Invalid rating'; END IF;
  IF p_feedback IS NOT NULL AND char_length(p_feedback) > 2000 THEN RAISE EXCEPTION 'Feedback is too long'; END IF;

  SELECT q.title,
         COALESCE(jsonb_array_length(q.questions), 0),
         COALESCE(q.essay_grading_mode, 'manual'),
         EXISTS (
           SELECT 1
           FROM jsonb_array_elements(COALESCE(q.questions, '[]'::jsonb)) elem
           WHERE elem->>'type' = 'essay'
         )
    INTO v_quiz_title, v_total_questions, v_essay_mode, v_has_essay
    FROM public.quizzes q
   WHERE q.id = p_quiz_id
   FOR SHARE;

  IF NOT FOUND OR v_total_questions <= 0 THEN RAISE EXCEPTION 'Quiz not found'; END IF;
  IF v_score < 0 OR v_score > v_total_questions THEN RAISE EXCEPTION 'Invalid score'; END IF;

  IF v_has_essay AND v_essay_mode = 'manual' THEN
    v_review_status := 'pending_creator_review';
  ELSE
    v_review_status := 'completed';
  END IF;

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
    UPDATE public.completions AS comp
       SET is_best = false
     WHERE comp.quiz_id = p_quiz_id AND comp.taker_id = p_taker_id;
  END IF;
  INSERT INTO public.completions (
    id, quiz_id, quiz_title, taker_id, taker_name, score, total_questions,
    rating, feedback, attempt_number, is_best, essay_answers, review_status
  ) VALUES (
    v_completion_id, p_quiz_id, v_quiz_title, p_taker_id, trim(p_taker_name),
    v_score, v_total_questions, p_rating, COALESCE(p_feedback, ''), v_attempt_number, v_is_best,
    p_essay_answers, v_review_status
  );
  IF v_xp_awarded > 0 THEN
    UPDATE public.users AS u
       SET xp = COALESCE(u.xp, 0) + v_xp_awarded, updated_at = now()
     WHERE u.uid = p_taker_id;
  END IF;
  PERFORM set_config('quizspace.internal_completion_write', 'off', true);

  RETURN QUERY SELECT c.id, c.quiz_id, c.taker_id, c.taker_name, c.score, c.total_questions,
    c.rating, c.feedback, c.created_at, c.attempt_number, c.is_best, v_xp_awarded, c.review_status
    FROM public.completions c WHERE c.id = v_completion_id;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('quizspace.internal_completion_write', 'off', true);
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_quiz_attempt(text, text, text, integer, integer, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(text, text, text, integer, integer, text, jsonb) TO authenticated;

-- 5. Update submit_guest_quiz_attempt to accept p_essay_answers and set review_status
CREATE OR REPLACE FUNCTION public.submit_guest_quiz_attempt(
  p_quiz_id TEXT,
  p_guest_id TEXT,
  p_guest_name TEXT,
  p_score INTEGER,
  p_client_attempt_key TEXT,
  p_rating INTEGER DEFAULT NULL,
  p_feedback TEXT DEFAULT '',
  p_essay_answers JSONB DEFAULT NULL
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
  attempt_number INTEGER,
  is_best BOOLEAN,
  review_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id TEXT;
  v_total_questions INTEGER;
  v_attempt_number INTEGER;
  v_previous_best INTEGER;
  v_score INTEGER := COALESCE(p_score, -1);
  v_inserted BOOLEAN := false;
  v_name TEXT := trim(COALESCE(p_guest_name, ''));
  v_essay_mode TEXT;
  v_has_essay BOOLEAN := false;
  v_review_status TEXT := 'completed';
BEGIN
  IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Guest submission requires an anonymous session'; END IF;
  IF p_quiz_id IS NULL OR char_length(trim(p_quiz_id)) = 0 OR char_length(p_quiz_id) > 200 THEN RAISE EXCEPTION 'Invalid quiz'; END IF;
  IF p_guest_id IS NULL OR p_guest_id !~ '^user-guest-[A-HJ-NP-Z2-9]{6}$' THEN RAISE EXCEPTION 'Invalid guest identity'; END IF;
  IF char_length(v_name) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Invalid guest name'; END IF;
  IF p_client_attempt_key IS NULL OR char_length(p_client_attempt_key) NOT BETWEEN 16 AND 120 THEN RAISE EXCEPTION 'Invalid attempt key'; END IF;
  IF p_rating IS NOT NULL AND (p_rating < 1 OR p_rating > 5) THEN RAISE EXCEPTION 'Invalid rating'; END IF;
  IF char_length(COALESCE(p_feedback, '')) > 2000 THEN RAISE EXCEPTION 'Feedback is too long'; END IF;

  SELECT COALESCE(jsonb_array_length(q.questions), 0),
         COALESCE(q.essay_grading_mode, 'manual'),
         EXISTS (
           SELECT 1
           FROM jsonb_array_elements(COALESCE(q.questions, '[]'::jsonb)) elem
           WHERE elem->>'type' = 'essay'
         )
    INTO v_total_questions, v_essay_mode, v_has_essay
    FROM public.quizzes q
   WHERE q.id = p_quiz_id
   FOR SHARE;

  IF NOT FOUND OR v_total_questions <= 0 THEN RAISE EXCEPTION 'Quiz not found'; END IF;
  IF v_score < 0 OR v_score > v_total_questions THEN RAISE EXCEPTION 'Invalid score'; END IF;

  IF v_has_essay AND v_essay_mode = 'manual' THEN
    v_review_status := 'pending_creator_review';
  ELSE
    v_review_status := 'completed';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_guest_id || ':' || p_quiz_id, 0));
  SELECT g.id INTO v_id FROM public.guest_quiz_attempts g
   WHERE g.guest_id = p_guest_id AND g.quiz_id = p_quiz_id AND g.client_attempt_key = p_client_attempt_key LIMIT 1;
  IF v_id IS NULL THEN
    SELECT COUNT(*)::INTEGER, COALESCE(MAX(g.score), 0) INTO v_attempt_number, v_previous_best
      FROM public.guest_quiz_attempts g WHERE g.quiz_id = p_quiz_id AND g.guest_id = p_guest_id;
    v_attempt_number := v_attempt_number + 1;
    v_id := 'guestcomp_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 10);
    INSERT INTO public.guest_quiz_attempts
      (id, quiz_id, guest_id, guest_name, score, total_questions, rating, feedback, attempt_number, is_best, client_attempt_key, essay_answers, review_status)
    VALUES
      (v_id, p_quiz_id, p_guest_id, v_name, v_score, v_total_questions, p_rating, COALESCE(p_feedback, ''),
       v_attempt_number, (v_attempt_number = 1 OR v_score > v_previous_best), p_client_attempt_key, p_essay_answers, v_review_status);
    v_inserted := true;
  ELSE
    UPDATE public.guest_quiz_attempts AS existing_attempt
       SET rating = COALESCE(p_rating, existing_attempt.rating),
           feedback = CASE WHEN char_length(COALESCE(p_feedback, '')) > 0 THEN p_feedback ELSE existing_attempt.feedback END,
           guest_name = v_name,
           essay_answers = COALESCE(p_essay_answers, existing_attempt.essay_answers)
     WHERE existing_attempt.id = v_id;
  END IF;
  IF v_inserted THEN
    UPDATE public.guest_quiz_attempts current_attempt SET is_best = false
     WHERE current_attempt.quiz_id = p_quiz_id AND current_attempt.guest_id = p_guest_id AND current_attempt.id <> v_id
       AND current_attempt.score < (SELECT new_attempt.score FROM public.guest_quiz_attempts new_attempt WHERE new_attempt.id = v_id);
  END IF;
  RETURN QUERY SELECT g.id, g.quiz_id, g.guest_id, g.guest_name, g.score, g.total_questions,
    g.rating, g.feedback, g.created_at, g.attempt_number, g.is_best, g.review_status
    FROM public.guest_quiz_attempts g WHERE g.id = v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_guest_quiz_attempt(text, text, text, integer, text, integer, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_guest_quiz_attempt(text, text, text, integer, text, integer, text, jsonb) TO anon;

-- 6. Function: get_pending_essay_reviews
-- Accessible only to the Quiz Creator or Super Admin.
CREATE OR REPLACE FUNCTION public.get_pending_essay_reviews(p_quiz_id TEXT DEFAULT NULL)
RETURNS TABLE(
  completion_id TEXT,
  quiz_id TEXT,
  quiz_title TEXT,
  taker_id TEXT,
  taker_name TEXT,
  is_guest BOOLEAN,
  score INTEGER,
  total_questions INTEGER,
  essay_answers JSONB,
  questions JSONB,
  created_at TIMESTAMPTZ,
  review_status TEXT,
  creator_feedback TEXT,
  attempt_number INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN := false;
  v_caller_id TEXT := auth.uid()::text;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  v_is_admin := public.current_user_is_admin();

  RETURN QUERY
  SELECT
    c.id AS completion_id,
    c.quiz_id,
    q.title AS quiz_title,
    c.taker_id,
    c.taker_name,
    false AS is_guest,
    c.score,
    c.total_questions,
    c.essay_answers,
    q.questions,
    c.created_at,
    c.review_status,
    c.creator_feedback,
    c.attempt_number
  FROM public.completions c
  JOIN public.quizzes q ON q.id = c.quiz_id
  WHERE (p_quiz_id IS NULL OR c.quiz_id = p_quiz_id)
    AND (v_is_admin OR q.creator_id = v_caller_id)
    AND c.review_status = 'pending_creator_review'

  UNION ALL

  SELECT
    g.id AS completion_id,
    g.quiz_id,
    q.title AS quiz_title,
    g.guest_id AS taker_id,
    g.guest_name AS taker_name,
    true AS is_guest,
    g.score,
    g.total_questions,
    g.essay_answers,
    q.questions,
    g.created_at,
    g.review_status,
    g.creator_feedback,
    g.attempt_number
  FROM public.guest_quiz_attempts g
  JOIN public.quizzes q ON q.id = g.quiz_id
  WHERE (p_quiz_id IS NULL OR g.quiz_id = p_quiz_id)
    AND (v_is_admin OR q.creator_id = v_caller_id)
    AND g.review_status = 'pending_creator_review'
  ORDER BY created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_pending_essay_reviews(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_pending_essay_reviews(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_pending_essay_reviews(TEXT) TO authenticated;

-- 7. Function: grade_quiz_essay_attempt
-- Secure RPC allowing ONLY the quiz creator or Super Admin to finalize essay grading.
CREATE OR REPLACE FUNCTION public.grade_quiz_essay_attempt(
  p_completion_id TEXT,
  p_is_guest BOOLEAN,
  p_awarded_score INTEGER,
  p_feedback TEXT DEFAULT ''
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quiz_id TEXT;
  v_creator_id TEXT;
  v_quiz_title TEXT;
  v_taker_id TEXT;
  v_total_questions INTEGER;
  v_old_score INTEGER;
  v_new_xp INTEGER := 0;
  v_caller_id TEXT := auth.uid()::text;
  v_is_admin BOOLEAN := false;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  v_is_admin := public.current_user_is_admin();

  IF p_is_guest THEN
    SELECT g.quiz_id, q.creator_id, q.title, g.guest_id, g.total_questions, g.score
      INTO v_quiz_id, v_creator_id, v_quiz_title, v_taker_id, v_total_questions, v_old_score
      FROM public.guest_quiz_attempts g
      JOIN public.quizzes q ON q.id = g.quiz_id
     WHERE g.id = p_completion_id
     FOR UPDATE;
  ELSE
    SELECT c.quiz_id, q.creator_id, q.title, c.taker_id, c.total_questions, c.score
      INTO v_quiz_id, v_creator_id, v_quiz_title, v_taker_id, v_total_questions, v_old_score
      FROM public.completions c
      JOIN public.quizzes q ON q.id = c.quiz_id
     WHERE c.id = p_completion_id
     FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attempt not found';
  END IF;

  -- Security authorization check
  IF NOT v_is_admin AND v_creator_id <> v_caller_id THEN
    RAISE EXCEPTION 'Unauthorized: only the quiz creator or admin may grade attempts' USING ERRCODE = '42501';
  END IF;

  IF p_awarded_score < 0 OR p_awarded_score > v_total_questions THEN
    RAISE EXCEPTION 'Invalid score: must be between 0 and total questions (%)', v_total_questions;
  END IF;

  IF p_is_guest THEN
    UPDATE public.guest_quiz_attempts
       SET score = p_awarded_score,
           review_status = 'completed',
           creator_feedback = COALESCE(p_feedback, ''),
           reviewed_at = now(),
           reviewed_by = v_caller_id
     WHERE id = p_completion_id;

    -- Update is_best
    UPDATE public.guest_quiz_attempts SET is_best = false WHERE quiz_id = v_quiz_id AND guest_id = v_taker_id;
    UPDATE public.guest_quiz_attempts SET is_best = true
     WHERE id = (
       SELECT id FROM public.guest_quiz_attempts
        WHERE quiz_id = v_quiz_id AND guest_id = v_taker_id
        ORDER BY score DESC, created_at ASC LIMIT 1
     );
  ELSE
    PERFORM set_config('quizspace.internal_completion_write', 'on', true);
    UPDATE public.completions
       SET score = p_awarded_score,
           review_status = 'completed',
           creator_feedback = COALESCE(p_feedback, ''),
           reviewed_at = now(),
           reviewed_by = v_caller_id
     WHERE id = p_completion_id;

    -- Update is_best
    UPDATE public.completions SET is_best = false WHERE quiz_id = v_quiz_id AND taker_id = v_taker_id;
    UPDATE public.completions SET is_best = true
     WHERE id = (
       SELECT id FROM public.completions
        WHERE quiz_id = v_quiz_id AND taker_id = v_taker_id
        ORDER BY score DESC, created_at ASC LIMIT 1
     );

    -- Award difference in XP if score increased
    IF p_awarded_score > v_old_score THEN
      v_new_xp := (p_awarded_score - v_old_score) * 10;
      UPDATE public.users SET xp = COALESCE(xp, 0) + v_new_xp, updated_at = now()
       WHERE uid = v_taker_id;
    END IF;
    PERFORM set_config('quizspace.internal_completion_write', 'off', true);

    -- Optional notification insertion
    BEGIN
      INSERT INTO public.notifications (user_id, title, body, link, type)
      VALUES (
        v_taker_id,
        'تم تصحيح إجابتك المقالية ✨',
        'قام منشئ الاختبار «' || v_quiz_title || '» بمراجعة إجابتك المقالية ورصد درجتك النهائية: ' || p_awarded_score || ' من ' || v_total_questions,
        '/quiz/' || v_quiz_id,
        'quiz'
      );
    EXCEPTION WHEN OTHERS THEN
      -- Notification failure does not abort the grading transaction
      NULL;
    END;
  END IF;

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('quizspace.internal_completion_write', 'off', true);
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.grade_quiz_essay_attempt(TEXT, BOOLEAN, INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grade_quiz_essay_attempt(TEXT, BOOLEAN, INTEGER, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.grade_quiz_essay_attempt(TEXT, BOOLEAN, INTEGER, TEXT) TO authenticated;

-- 8. Enhance get_quiz_takers_unique to include pending reviews count and review status
CREATE OR REPLACE FUNCTION public.get_quiz_takers_unique(p_quiz_id TEXT)
RETURNS TABLE (
  taker_id TEXT,
  taker_name TEXT,
  best_score INTEGER,
  total_questions INTEGER,
  attempts_count INTEGER,
  last_attempt_at TIMESTAMPTZ,
  rating INTEGER,
  review_status TEXT,
  has_pending_essay BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_is_admin() AND NOT EXISTS (
    SELECT 1
    FROM public.quizzes q
    WHERE q.id = p_quiz_id
      AND q.creator_id = auth.uid()::text
  ) THEN
    RAISE EXCEPTION 'Only the quiz creator or a super admin may view quiz solver details.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT x.taker_id,
         x.taker_name,
         MAX(x.score)::INTEGER,
         MAX(x.total_questions)::INTEGER,
         COUNT(*)::INTEGER,
         MAX(x.created_at),
         (ARRAY_AGG(x.rating ORDER BY x.created_at DESC) FILTER (WHERE x.rating IS NOT NULL))[1],
         (ARRAY_AGG(x.review_status ORDER BY x.created_at DESC))[1],
         BOOL_OR(x.review_status = 'pending_creator_review')
  FROM (
    SELECT c.taker_id, c.taker_name, c.score, c.total_questions, c.created_at, c.rating, c.review_status
    FROM public.completions c
    WHERE c.quiz_id = p_quiz_id
    UNION ALL
    SELECT g.guest_id, g.guest_name, g.score, g.total_questions, g.created_at, g.rating, g.review_status
    FROM public.guest_quiz_attempts g
    WHERE g.quiz_id = p_quiz_id
  ) AS x
  GROUP BY x.taker_id, x.taker_name;
END;
$$;

REVOKE ALL ON FUNCTION public.get_quiz_takers_unique(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_quiz_takers_unique(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_quiz_takers_unique(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
