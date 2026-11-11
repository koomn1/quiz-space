-- Server-side scoring for ordinary authenticated and guest quiz attempts.
-- The client submits selected option indexes; the database reads correctIndex
-- only from the stored quiz row and never accepts a client-computed score.

CREATE OR REPLACE FUNCTION public.quizspace_score_objective_answers(
  p_questions JSONB,
  p_answers JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total INTEGER;
  v_score INTEGER := 0;
  v_question JSONB;
  v_answer JSONB;
  v_options JSONB;
  v_correct_index INTEGER;
  v_answer_index INTEGER;
  v_correct_text TEXT;
  v_question_type TEXT;
  i INTEGER;
BEGIN
  IF jsonb_typeof(p_questions) IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_answers) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Quiz questions and answers must be arrays';
  END IF;

  v_total := jsonb_array_length(p_questions);
  IF v_total <= 0 OR jsonb_array_length(p_answers) <> v_total THEN
    RAISE EXCEPTION 'Answer count does not match quiz';
  END IF;

  FOR i IN 0..v_total - 1 LOOP
    v_question := p_questions->i;
    v_answer := p_answers->i;
    v_question_type := COALESCE(v_question->>'type','mcq');

    -- Essay answers are stored separately and graded by the quiz creator.
    IF v_question_type = 'essay' THEN
      CONTINUE;
    END IF;

    IF v_answer = 'null'::JSONB THEN
      CONTINUE;
    END IF;
    IF jsonb_typeof(v_answer) IS DISTINCT FROM 'number'
       OR (v_answer #>> '{}')::NUMERIC <> trunc((v_answer #>> '{}')::NUMERIC) THEN
      RAISE EXCEPTION 'One or more selected answers are invalid';
    END IF;

    v_answer_index := (v_answer #>> '{}')::INTEGER;
    v_options := v_question->'options';
    IF jsonb_typeof(v_options) IS DISTINCT FROM 'array'
       OR v_answer_index < 0
       OR v_answer_index >= jsonb_array_length(v_options) THEN
      RAISE EXCEPTION 'Selected answer is outside the available options';
    END IF;

    v_correct_index := NULL;
    IF jsonb_typeof(v_question->'correctIndex') = 'number'
       AND (v_question->>'correctIndex')::NUMERIC = trunc((v_question->>'correctIndex')::NUMERIC)
       AND (v_question->>'correctIndex')::INTEGER >= 0
       AND (v_question->>'correctIndex')::INTEGER < jsonb_array_length(v_options) THEN
      v_correct_index := (v_question->>'correctIndex')::INTEGER;
    ELSE
      v_correct_text := COALESCE(v_question->>'correctAnswer',v_question->>'correct_answer');
      IF v_correct_text IS NOT NULL THEN
        SELECT (option_row.ordinality - 1)::INTEGER
          INTO v_correct_index
          FROM jsonb_array_elements(v_options) WITH ORDINALITY AS option_row(value,ordinality)
         WHERE option_row.value #>> '{}' = v_correct_text
         LIMIT 1;
      END IF;
    END IF;

    -- A malformed/missing key is not awarded as correct. It does not let the
    -- client manufacture a point and does not make unrelated questions fail.
    IF v_correct_index IS NOT NULL AND v_answer_index = v_correct_index THEN
      v_score := v_score + 1;
    END IF;
  END LOOP;

  RETURN v_score;
END;
$$;

REVOKE ALL ON FUNCTION public.quizspace_score_objective_answers(JSONB,JSONB)
  FROM PUBLIC, anon, authenticated;

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
    UPDATE public.completions SET is_best=FALSE
    WHERE quiz_id=v_quiz_id AND taker_id=p_taker_id;
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

CREATE OR REPLACE FUNCTION public.submit_guest_quiz_attempt_v2(
  p_quiz_id TEXT,
  p_guest_id TEXT,
  p_guest_name TEXT,
  p_answers JSONB,
  p_client_attempt_key TEXT,
  p_rating INTEGER DEFAULT NULL,
  p_feedback TEXT DEFAULT '',
  p_essay_answers JSONB DEFAULT NULL
)
RETURNS TABLE(
  id TEXT, quiz_id TEXT, taker_id TEXT, taker_name TEXT, score INTEGER,
  total_questions INTEGER, rating INTEGER, feedback TEXT,
  created_at TIMESTAMPTZ, attempt_number INTEGER, is_best BOOLEAN,
  review_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_questions JSONB;
  v_total_questions INTEGER;
  v_score INTEGER;
  v_attempt_number INTEGER;
  v_previous_best INTEGER;
  v_id TEXT;
  v_name TEXT := trim(COALESCE(p_guest_name,''));
  v_has_essay BOOLEAN := FALSE;
  v_review_status TEXT := 'completed';
  v_inserted BOOLEAN := FALSE;
BEGIN
  IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Guest submission requires an anonymous session'; END IF;
  IF p_quiz_id IS NULL OR char_length(trim(p_quiz_id))=0 OR char_length(p_quiz_id)>200 THEN RAISE EXCEPTION 'Invalid quiz'; END IF;
  IF p_guest_id IS NULL OR p_guest_id !~ '^user-guest-[A-HJ-NP-Z2-9]{6}$' THEN RAISE EXCEPTION 'Invalid guest identity'; END IF;
  IF char_length(v_name) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Invalid guest name'; END IF;
  IF p_client_attempt_key IS NULL OR char_length(p_client_attempt_key) NOT BETWEEN 16 AND 120 THEN RAISE EXCEPTION 'Invalid attempt key'; END IF;
  IF p_rating IS NOT NULL AND (p_rating<1 OR p_rating>5) THEN RAISE EXCEPTION 'Invalid rating'; END IF;
  IF char_length(COALESCE(p_feedback,''))>2000 THEN RAISE EXCEPTION 'Feedback is too long'; END IF;

  SELECT q.questions,COALESCE(jsonb_array_length(q.questions),0),
         EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(q.questions,'[]'::JSONB)) x WHERE x->>'type'='essay')
    INTO v_questions,v_total_questions,v_has_essay
    FROM public.quizzes q WHERE q.id=p_quiz_id FOR SHARE;
  IF NOT FOUND OR v_total_questions<=0 THEN RAISE EXCEPTION 'Quiz not found'; END IF;

  v_score := public.quizspace_score_objective_answers(v_questions,p_answers);
  IF v_has_essay THEN v_review_status := 'pending_creator_review'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_guest_id||':'||p_quiz_id,0));
  SELECT g.id INTO v_id FROM public.guest_quiz_attempts g
  WHERE g.guest_id=p_guest_id AND g.quiz_id=p_quiz_id AND g.client_attempt_key=p_client_attempt_key
  LIMIT 1;

  IF v_id IS NULL THEN
    SELECT count(*)::INTEGER,COALESCE(max(g.score),0)
      INTO v_attempt_number,v_previous_best
      FROM public.guest_quiz_attempts g WHERE g.quiz_id=p_quiz_id AND g.guest_id=p_guest_id;
    v_attempt_number := v_attempt_number+1;
    v_id := 'guestcomp_'||extract(epoch FROM clock_timestamp())::BIGINT||'_'||substr(md5(random()::TEXT),1,10);
    INSERT INTO public.guest_quiz_attempts(
      id,quiz_id,guest_id,guest_name,score,total_questions,rating,feedback,
      attempt_number,is_best,client_attempt_key,essay_answers,review_status
    ) VALUES (
      v_id,p_quiz_id,p_guest_id,v_name,v_score,v_total_questions,p_rating,COALESCE(p_feedback,''),
      v_attempt_number,(v_attempt_number=1 OR v_score>v_previous_best),p_client_attempt_key,p_essay_answers,v_review_status
    );
    v_inserted := TRUE;
  ELSE
    UPDATE public.guest_quiz_attempts g
    SET rating=COALESCE(p_rating,g.rating),
        feedback=CASE WHEN char_length(COALESCE(p_feedback,''))>0 THEN p_feedback ELSE g.feedback END,
        guest_name=v_name,
        essay_answers=COALESCE(p_essay_answers,g.essay_answers)
    WHERE g.id=v_id;
  END IF;

  IF v_inserted THEN
    UPDATE public.guest_quiz_attempts current_attempt SET is_best=FALSE
    WHERE current_attempt.quiz_id=p_quiz_id AND current_attempt.guest_id=p_guest_id
      AND current_attempt.id<>v_id
      AND current_attempt.score<(SELECT new_attempt.score FROM public.guest_quiz_attempts new_attempt WHERE new_attempt.id=v_id);
  END IF;

  RETURN QUERY
  SELECT g.id,g.quiz_id,g.guest_id,g.guest_name,g.score,g.total_questions,g.rating,g.feedback,
         g.created_at,g.attempt_number,g.is_best,g.review_status
  FROM public.guest_quiz_attempts g WHERE g.id=v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_guest_quiz_attempt_v2(TEXT,TEXT,TEXT,JSONB,TEXT,INTEGER,TEXT,JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_guest_quiz_attempt_v2(TEXT,TEXT,TEXT,JSONB,TEXT,INTEGER,TEXT,JSONB)
  TO anon;

NOTIFY pgrst, 'reload schema';
