-- Quiz Space: allow students to retake non-daily quizzes and keep an improvement history.
-- Every submission is a separate attempt. XP is awarded only for the first attempt
-- and for points that improve the student's previous best score.

ALTER TABLE public.completions
  ADD COLUMN IF NOT EXISTS attempt_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_best BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS completions_user_quiz_attempt_idx
  ON public.completions (taker_id, quiz_id, attempt_number DESC);

-- Preserve the old single-row records as the first attempt and mark the best
-- historical score for each student/quiz pair.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY taker_id, quiz_id ORDER BY score DESC, created_at ASC, id ASC) AS best_rank,
         ROW_NUMBER() OVER (PARTITION BY taker_id, quiz_id ORDER BY created_at ASC, id ASC) AS attempt_rank
    FROM public.completions
)
UPDATE public.completions c
   SET attempt_number = ranked.attempt_rank,
       is_best = ranked.best_rank = 1
  FROM ranked
 WHERE c.id = ranked.id;

DROP FUNCTION IF EXISTS public.submit_quiz_attempt(TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
    p_quiz_id TEXT,
    p_taker_id TEXT,
    p_taker_name TEXT,
    p_score INTEGER,
    p_rating INTEGER DEFAULT NULL,
    p_feedback TEXT DEFAULT ''
)
RETURNS TABLE (
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
    xp_awarded INTEGER
) AS $$
DECLARE
    v_completion_id TEXT;
    v_total_questions INTEGER;
    v_attempt_number INTEGER;
    v_previous_best INTEGER;
    v_score INTEGER := GREATEST(0, COALESCE(p_score, 0));
    v_xp_awarded INTEGER;
    v_is_best BOOLEAN;
BEGIN
    IF auth.uid()::text <> p_taker_id THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;

    SELECT COALESCE(jsonb_array_length(q.questions), 0)
      INTO v_total_questions
      FROM public.quizzes q
     WHERE q.id = p_quiz_id;
    IF v_total_questions <= 0 THEN v_total_questions := 1; END IF;

    SELECT COUNT(*)::INTEGER, COALESCE(MAX(c.score), 0)
      INTO v_attempt_number, v_previous_best
      FROM public.completions c
     WHERE c.quiz_id = p_quiz_id AND c.taker_id = p_taker_id;
    v_attempt_number := v_attempt_number + 1;
    v_is_best := v_attempt_number = 1 OR v_score > v_previous_best;
    -- Participation + correct-answer XP is awarded only on the first try;
    -- later tries receive XP only for genuine improvement over the prior best.
    v_xp_awarded := CASE
      WHEN v_attempt_number = 1 THEN 10 + (v_score * 10)
      ELSE GREATEST(0, v_score - v_previous_best) * 10
    END;

    v_completion_id := 'comp_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 10);

    IF v_is_best THEN
      UPDATE public.completions
         SET is_best = false
       WHERE quiz_id = p_quiz_id AND taker_id = p_taker_id;
    END IF;

    INSERT INTO public.completions (
      id, quiz_id, quiz_title, taker_id, taker_name, score, total_questions,
      rating, feedback, attempt_number, is_best
    )
    SELECT v_completion_id, p_quiz_id, q.title, p_taker_id, p_taker_name,
           v_score, v_total_questions, p_rating, COALESCE(p_feedback, ''),
           v_attempt_number, v_is_best
      FROM public.quizzes q
     WHERE q.id = p_quiz_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Quiz not found';
    END IF;

    IF v_xp_awarded > 0 THEN
      UPDATE public.users
         SET xp = COALESCE(xp, 0) + v_xp_awarded,
             updated_at = now()
       WHERE uid = p_taker_id;
    END IF;

    RETURN QUERY
    SELECT c.id, c.quiz_id, c.taker_id, c.taker_name, c.score, c.total_questions,
           c.rating, c.feedback, c.created_at, c.attempt_number, c.is_best,
           v_xp_awarded
      FROM public.completions c
     WHERE c.id = v_completion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(TEXT,TEXT,TEXT,INTEGER,INTEGER,TEXT) TO authenticated;
NOTIFY pgrst, 'reload schema';
