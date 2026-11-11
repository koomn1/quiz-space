CREATE OR REPLACE FUNCTION public.submit_quiz_attempt_v2(
  p_quiz_id TEXT,
  p_taker_id TEXT,
  p_taker_name TEXT,
  p_answers JSONB,
  p_rating INTEGER DEFAULT NULL,
  p_feedback TEXT DEFAULT '',
  p_essay_answers JSONB DEFAULT NULL
)
RETURNS TABLE(
  id TEXT, quiz_id TEXT, taker_id TEXT, taker_name TEXT, score INTEGER,
  total_questions INTEGER, rating INTEGER, feedback TEXT,
  created_at TIMESTAMPTZ, attempt_number INTEGER, is_best BOOLEAN,
  xp_awarded INTEGER, review_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_quiz_id TEXT := trim(COALESCE(p_quiz_id,''));
  v_questions JSONB;
  v_completion_id TEXT;
  v_total_questions INTEGER;
  v_attempt_number INTEGER;
  v_previous_best INTEGER;
  v_score INTEGER;
  v_xp_awarded INTEGER;
  v_is_best BOOLEAN;
  v_quiz_title TEXT;
  v_has_essay BOOLEAN := FALSE;
  v_review_status TEXT := 'completed';
BEGIN
  IF auth.uid() IS NULL OR auth.uid()::TEXT <> p_taker_id THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF v_quiz_id = '' OR char_length(v_quiz_id) > 200 THEN RAISE EXCEPTION 'Invalid quiz'; END IF;
  IF p_taker_name IS NULL OR char_length(trim(p_taker_name)) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'Invalid taker name';
  END IF;
  IF p_rating IS NOT NULL AND (p_rating < 1 OR p_rating > 5) THEN RAISE EXCEPTION 'Invalid rating'; END IF;
  IF char_length(COALESCE(p_feedback,'')) > 2000 THEN RAISE EXCEPTION 'Feedback is too long'; END IF;

  SELECT q.title,q.questions,COALESCE(jsonb_array_length(q.questions),0),
         EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(q.questions,'[]'::JSONB)) x WHERE x->>'type'='essay')
    INTO v_quiz_title,v_questions,v_total_questions,v_has_essay
    FROM public.quizzes q WHERE q.id=v_quiz_id FOR SHARE;
  IF NOT FOUND OR v_total_questions <= 0 THEN RAISE EXCEPTION 'Quiz not found'; END IF;

  v_score := public.quizspace_score_objective_answers(v_questions,p_answers);
  IF v_has_essay THEN v_review_status := 'pending_creator_review'; END IF;

  SELECT count(*)::INTEGER,COALESCE(max(c.score),0)
    INTO v_attempt_number,v_previous_best
    FROM public.completions c
   WHERE c.quiz_id=v_quiz_id AND c.taker_id=p_taker_id;
  v_attempt_number := v_attempt_number + 1;
  v_is_best := v_attempt_number=1 OR v_score>v_previous_best;
  v_xp_awarded := CASE WHEN v_attempt_number=1 THEN 10+(v_score*10)
                       ELSE GREATEST(0,v_score-v_previous_best)*10 END;

  v_completion_id := 'comp_'||extract(epoch FROM clock_timestamp())::BIGINT||'_'||substr(md5(random()::TEXT),1,10);
  PERFORM set_config('quizspace.internal_completion_write','on',TRUE);
  IF v_is_best THEN
    UPDATE public.completions AS existing_completion SET is_best=FALSE
    WHERE existing_completion.quiz_id=v_quiz_id AND existing_completion.taker_id=p_taker_id;
  END IF;

  INSERT INTO public.completions(
    id,quiz_id,quiz_title,taker_id,taker_name,score,total_questions,
    rating,feedback,attempt_number,is_best,essay_answers,review_status
  ) VALUES (
    v_completion_id,v_quiz_id,v_quiz_title,p_taker_id,trim(p_taker_name),v_score,v_total_questions,
    p_rating,COALESCE(p_feedback,''),v_attempt_number,v_is_best,p_essay_answers,v_review_status
  );

  IF v_xp_awarded > 0 THEN
    PERFORM set_config('app.allow_progression_update','on',TRUE);
    UPDATE public.users SET xp=COALESCE(xp,0)+v_xp_awarded,updated_at=now()
    WHERE uid=p_taker_id;
    PERFORM set_config('app.allow_progression_update','off',TRUE);
  END IF;
  PERFORM set_config('quizspace.internal_completion_write','off',TRUE);

  RETURN QUERY
  SELECT c.id,c.quiz_id,c.taker_id,c.taker_name,c.score,c.total_questions,c.rating,c.feedback,
         c.created_at,c.attempt_number,c.is_best,v_xp_awarded,c.review_status
  FROM public.completions c WHERE c.id=v_completion_id;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('quizspace.internal_completion_write','off',TRUE);
  PERFORM set_config('app.allow_progression_update','off',TRUE);
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_quiz_attempt_v2(TEXT,TEXT,TEXT,JSONB,INTEGER,TEXT,JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt_v2(TEXT,TEXT,TEXT,JSONB,INTEGER,TEXT,JSONB)
  TO authenticated;


NOTIFY pgrst, 'reload schema';
