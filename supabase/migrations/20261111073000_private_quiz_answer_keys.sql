-- Quiz Space AI 2.0 — Phase 2
-- Move standard quiz answer keys and explanations out of public.quizzes.questions.
-- This migration is intentionally staged on the Phase 2 branch and is NOT applied
-- to the connected production project.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

CREATE TABLE IF NOT EXISTS private.quiz_answer_keys (
  quiz_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  correct_index INTEGER,
  correct_answer TEXT,
  explanation TEXT,
  question_type TEXT NOT NULL DEFAULT 'mcq',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (quiz_id, question_id),
  CONSTRAINT quiz_answer_keys_correct_index_nonnegative
    CHECK (correct_index IS NULL OR correct_index >= 0)
);

ALTER TABLE private.quiz_answer_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.quiz_answer_keys FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON private.quiz_answer_keys TO service_role;

CREATE OR REPLACE FUNCTION private.capture_quiz_answer_keys()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_question JSONB;
  v_clean_question JSONB;
  v_clean_questions JSONB := '[]'::JSONB;
  v_question_id TEXT;
  v_question_type TEXT;
  v_options JSONB;
  v_correct_index INTEGER;
  v_correct_answer TEXT;
  v_explanation TEXT;
  v_raw_index TEXT;
  v_option_count INTEGER;
  v_ordinality INTEGER := 0;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.questions IS NOT DISTINCT FROM OLD.questions
     AND NOT EXISTS (
       SELECT 1
       FROM jsonb_array_elements(COALESCE(OLD.questions, '[]'::JSONB)) AS existing_question(value)
       WHERE existing_question.value ?| ARRAY[
         'correctIndex', 'correct_index', 'correctAnswer', 'correct_answer',
         'explanation', 'answerExplanation', 'answer_explanation'
       ]
     ) THEN
    RETURN NEW;
  END IF;

  DELETE FROM private.quiz_answer_keys WHERE quiz_id = NEW.id;

  IF jsonb_typeof(COALESCE(NEW.questions, '[]'::JSONB)) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Quiz questions must be a JSON array';
  END IF;

  FOR v_question IN
    SELECT item.value
    FROM jsonb_array_elements(COALESCE(NEW.questions, '[]'::JSONB)) AS item(value)
  LOOP
    v_ordinality := v_ordinality + 1;
    IF jsonb_typeof(v_question) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'Quiz question % must be an object', v_ordinality;
    END IF;

    v_question_id := NULLIF(BTRIM(v_question->>'id'), '');
    IF v_question_id IS NULL THEN
      v_question_id := 'q-' || gen_random_uuid()::TEXT;
      v_question := jsonb_set(v_question, '{id}', to_jsonb(v_question_id), TRUE);
    END IF;

    v_question_type := COALESCE(NULLIF(LOWER(BTRIM(v_question->>'type')), ''), 'mcq');
    v_options := CASE
      WHEN jsonb_typeof(v_question->'options') = 'array' THEN v_question->'options'
      ELSE '[]'::JSONB
    END;
    v_option_count := jsonb_array_length(v_options);
    v_raw_index := COALESCE(v_question->>'correctIndex', v_question->>'correct_index');
    v_correct_index := NULL;
    v_correct_answer := NULLIF(BTRIM(COALESCE(v_question->>'correctAnswer', v_question->>'correct_answer')), '');
    v_explanation := NULLIF(BTRIM(v_question->>'explanation'), '');

    IF v_raw_index ~ '^-?[0-9]+$' THEN
      IF v_raw_index::NUMERIC >= 0 AND v_raw_index::NUMERIC < v_option_count THEN
        v_correct_index := v_raw_index::INTEGER;
      END IF;
    END IF;

    IF v_correct_index IS NULL AND v_correct_answer IS NOT NULL AND v_question_type <> 'essay' THEN
      IF v_correct_answer ~ '^[0-9]+$'
         AND v_correct_answer::NUMERIC < v_option_count THEN
        v_correct_index := v_correct_answer::INTEGER;
      ELSE
        SELECT (option_row.ordinality - 1)::INTEGER
          INTO v_correct_index
          FROM jsonb_array_elements(v_options) WITH ORDINALITY AS option_row(value, ordinality)
         WHERE option_row.value #>> '{}' = v_correct_answer
         LIMIT 1;
      END IF;
    END IF;

    IF v_correct_index IS NOT NULL AND v_correct_answer IS NULL THEN
      v_correct_answer := v_options->>v_correct_index;
    END IF;

    INSERT INTO private.quiz_answer_keys (
      quiz_id, question_id, correct_index, correct_answer, explanation, question_type, updated_at
    ) VALUES (
      NEW.id, v_question_id, v_correct_index, v_correct_answer, v_explanation, v_question_type, now()
    );

    -- A public question retains only presentation/attempt metadata. All known
    -- answer and explanation fields are removed before the row is committed.
    v_clean_question := v_question
      - 'correctIndex'
      - 'correct_index'
      - 'correctAnswer'
      - 'correct_answer'
      - 'explanation'
      - 'answerExplanation'
      - 'answer_explanation';
    v_clean_question := jsonb_set(v_clean_question, '{_quizId}', to_jsonb(NEW.id), TRUE);
    v_clean_questions := v_clean_questions || jsonb_build_array(v_clean_question);
  END LOOP;

  NEW.questions := v_clean_questions;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quizzes_capture_private_answer_keys ON public.quizzes;
CREATE TRIGGER quizzes_capture_private_answer_keys
BEFORE INSERT OR UPDATE OF questions ON public.quizzes
FOR EACH ROW
EXECUTE FUNCTION private.capture_quiz_answer_keys();

CREATE OR REPLACE FUNCTION private.delete_quiz_answer_keys()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
BEGIN
  DELETE FROM private.quiz_answer_keys WHERE quiz_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS quizzes_delete_private_answer_keys ON public.quizzes;
CREATE TRIGGER quizzes_delete_private_answer_keys
AFTER DELETE ON public.quizzes
FOR EACH ROW
EXECUTE FUNCTION private.delete_quiz_answer_keys();

-- Backfill existing quizzes through the same trigger. Invalid legacy keys are
-- retained as NULL in the private table; scoring will fail closed until owners
-- correct those questions rather than silently guessing an answer.
UPDATE public.quizzes
SET questions = questions;

CREATE OR REPLACE FUNCTION public.quizspace_score_objective_answers(
  p_questions JSONB,
  p_answers JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_total INTEGER;
  v_score INTEGER := 0;
  v_question JSONB;
  v_answer JSONB;
  v_options JSONB;
  v_correct_index INTEGER;
  v_answer_index INTEGER;
  v_question_type TEXT;
  v_quiz_id TEXT;
  v_question_id TEXT;
  v_key_found BOOLEAN;
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
    v_question_type := COALESCE(v_question->>'type', 'mcq');

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

    v_quiz_id := NULLIF(v_question->>'_quizId', '');
    v_question_id := NULLIF(v_question->>'id', '');
    IF v_quiz_id IS NULL OR v_question_id IS NULL THEN
      RAISE EXCEPTION 'Question is missing its private answer-key reference';
    END IF;

    SELECT answer_key.correct_index, TRUE
      INTO v_correct_index, v_key_found
      FROM private.quiz_answer_keys AS answer_key
     WHERE answer_key.quiz_id = v_quiz_id
       AND answer_key.question_id = v_question_id;

    IF NOT COALESCE(v_key_found, FALSE) OR v_correct_index IS NULL THEN
      RAISE EXCEPTION 'Quiz contains an unresolved answer key; creator review is required';
    END IF;

    IF v_answer_index = v_correct_index THEN
      v_score := v_score + 1;
    END IF;
  END LOOP;

  RETURN v_score;
END;
$$;

REVOKE ALL ON FUNCTION public.quizspace_score_objective_answers(JSONB, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quizspace_score_objective_answers(JSONB, JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.get_owned_quiz_with_answers(p_quiz_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_quiz public.quizzes%ROWTYPE;
  v_questions JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT *
    INTO v_quiz
    FROM public.quizzes
   WHERE id = p_quiz_id
     AND creator_id = auth.uid()::TEXT;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz not found or not owned' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      CASE
        WHEN answer_key.question_id IS NULL THEN question_row.question
        ELSE question_row.question || jsonb_strip_nulls(jsonb_build_object(
          'correctIndex', answer_key.correct_index,
          'correctAnswer', answer_key.correct_answer,
          'explanation', answer_key.explanation
        ))
      END
      ORDER BY question_row.ordinality
    ),
    '[]'::JSONB
  )
    INTO v_questions
    FROM jsonb_array_elements(v_quiz.questions) WITH ORDINALITY AS question_row(question, ordinality)
    LEFT JOIN private.quiz_answer_keys AS answer_key
      ON answer_key.quiz_id = v_quiz.id
     AND answer_key.question_id = question_row.question->>'id';

  RETURN jsonb_set(to_jsonb(v_quiz), '{questions}', COALESCE(v_questions, '[]'::JSONB), TRUE);
END;
$$;

REVOKE ALL ON FUNCTION public.get_owned_quiz_with_answers(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_owned_quiz_with_answers(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_quiz_answer_review(p_quiz_id TEXT, p_completion_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_completion public.completions%ROWTYPE;
  v_questions JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT *
    INTO v_completion
    FROM public.completions
   WHERE id = p_completion_id
     AND quiz_id = p_quiz_id
     AND taker_id = auth.uid()::TEXT;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attempt not found' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'question_id', question_row.question->>'id',
    'correct_index', answer_key.correct_index,
    'correct_answer', answer_key.correct_answer,
    'explanation', answer_key.explanation,
    'question_type', answer_key.question_type
  ) ORDER BY question_row.ordinality), '[]'::JSONB)
    INTO v_questions
    FROM public.quizzes quiz
    CROSS JOIN LATERAL jsonb_array_elements(quiz.questions) WITH ORDINALITY AS question_row(question, ordinality)
    LEFT JOIN private.quiz_answer_keys AS answer_key
      ON answer_key.quiz_id = quiz.id
     AND answer_key.question_id = question_row.question->>'id'
   WHERE quiz.id = p_quiz_id;

  RETURN jsonb_build_object('completion_id', v_completion.id, 'answers', COALESCE(v_questions, '[]'::JSONB));
END;
$$;

REVOKE ALL ON FUNCTION public.get_quiz_answer_review(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_quiz_answer_review(TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_guest_quiz_answer_review(
  p_quiz_id TEXT,
  p_attempt_id TEXT,
  p_client_attempt_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_attempt public.guest_quiz_attempts%ROWTYPE;
  v_questions JSONB;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Guest review requires an anonymous session' USING ERRCODE = '42501';
  END IF;
  IF p_client_attempt_key IS NULL OR char_length(p_client_attempt_key) NOT BETWEEN 16 AND 120 THEN
    RAISE EXCEPTION 'Invalid attempt key';
  END IF;

  SELECT *
    INTO v_attempt
    FROM public.guest_quiz_attempts
   WHERE id = p_attempt_id
     AND quiz_id = p_quiz_id
     AND client_attempt_key = p_client_attempt_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attempt not found' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'question_id', question_row.question->>'id',
    'correct_index', answer_key.correct_index,
    'correct_answer', answer_key.correct_answer,
    'explanation', answer_key.explanation,
    'question_type', answer_key.question_type
  ) ORDER BY question_row.ordinality), '[]'::JSONB)
    INTO v_questions
    FROM public.quizzes quiz
    CROSS JOIN LATERAL jsonb_array_elements(quiz.questions) WITH ORDINALITY AS question_row(question, ordinality)
    LEFT JOIN private.quiz_answer_keys AS answer_key
      ON answer_key.quiz_id = quiz.id
     AND answer_key.question_id = question_row.question->>'id'
   WHERE quiz.id = p_quiz_id;

  RETURN jsonb_build_object('attempt_id', v_attempt.id, 'answers', COALESCE(v_questions, '[]'::JSONB));
END;
$$;

REVOKE ALL ON FUNCTION public.get_guest_quiz_answer_review(TEXT, TEXT, TEXT) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.get_guest_quiz_answer_review(TEXT, TEXT, TEXT) TO anon;


-- Mobile submissions use the same private-key grader. Only the trusted
-- Firebase session Edge Function (service_role) may invoke this RPC.
CREATE OR REPLACE FUNCTION public.submit_mobile_quiz_attempt_v2(
  p_quiz_id TEXT,
  p_taker_id TEXT,
  p_taker_name TEXT,
  p_answers JSONB,
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
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_completion_id TEXT;
  v_questions JSONB;
  v_total_questions INTEGER;
  v_attempt_number INTEGER;
  v_previous_best INTEGER;
  v_score INTEGER;
  v_xp_awarded INTEGER;
  v_is_best BOOLEAN;
  v_quiz_title TEXT;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required' USING ERRCODE = '42501';
  END IF;
  IF p_taker_id IS NULL OR char_length(trim(p_taker_id)) = 0 THEN RAISE EXCEPTION 'Invalid taker'; END IF;
  IF p_quiz_id IS NULL OR char_length(trim(p_quiz_id)) = 0 OR char_length(p_quiz_id) > 256 THEN RAISE EXCEPTION 'Invalid quiz'; END IF;
  IF p_taker_name IS NULL OR char_length(trim(p_taker_name)) NOT BETWEEN 1 AND 160 THEN RAISE EXCEPTION 'Invalid taker name'; END IF;
  IF p_rating IS NOT NULL AND (p_rating < 1 OR p_rating > 5) THEN RAISE EXCEPTION 'Invalid rating'; END IF;
  IF p_feedback IS NOT NULL AND char_length(p_feedback) > 2000 THEN RAISE EXCEPTION 'Feedback is too long'; END IF;

  SELECT q.title, q.questions, GREATEST(0, COALESCE(jsonb_array_length(q.questions), 0))
    INTO v_quiz_title, v_questions, v_total_questions
    FROM public.quizzes q
   WHERE q.id = trim(p_quiz_id)
     AND (q.distribution_routing = 'public' OR q.creator_id = p_taker_id)
   FOR SHARE;
  IF NOT FOUND OR v_total_questions <= 0 THEN RAISE EXCEPTION 'Quiz not found'; END IF;

  v_score := public.quizspace_score_objective_answers(v_questions, p_answers);

  SELECT COUNT(*)::INTEGER, COALESCE(MAX(c.score), 0)
    INTO v_attempt_number, v_previous_best
    FROM public.completions c
   WHERE c.quiz_id = trim(p_quiz_id) AND c.taker_id = p_taker_id;
  v_attempt_number := v_attempt_number + 1;
  v_is_best := v_attempt_number = 1 OR v_score > v_previous_best;
  v_xp_awarded := CASE
    WHEN v_attempt_number = 1 THEN 10 + (v_score * 10)
    ELSE GREATEST(0, v_score - v_previous_best) * 10
  END;

  v_completion_id := 'comp_' || extract(epoch FROM clock_timestamp())::BIGINT || '_' || substr(md5(random()::TEXT), 1, 10);
  PERFORM set_config('quizspace.internal_completion_write', 'on', true);
  IF v_is_best THEN
    UPDATE public.completions AS existing_completion
       SET is_best = false
     WHERE existing_completion.quiz_id = trim(p_quiz_id)
       AND existing_completion.taker_id = p_taker_id;
  END IF;
  INSERT INTO public.completions (
    id, quiz_id, quiz_title, taker_id, taker_name, score, total_questions,
    rating, feedback, attempt_number, is_best
  ) VALUES (
    v_completion_id, trim(p_quiz_id), v_quiz_title, p_taker_id, trim(p_taker_name),
    v_score, v_total_questions, p_rating, COALESCE(p_feedback, ''), v_attempt_number, v_is_best
  );
  IF v_xp_awarded > 0 THEN
    UPDATE public.users AS u
       SET xp = COALESCE(u.xp, 0) + v_xp_awarded, updated_at = now()
     WHERE u.uid = p_taker_id;
  END IF;
  PERFORM set_config('quizspace.internal_completion_write', 'off', true);

  RETURN QUERY
  SELECT c.id, c.quiz_id, c.taker_id, c.taker_name, c.score, c.total_questions,
         c.rating, c.feedback, c.created_at, c.attempt_number, c.is_best, v_xp_awarded
    FROM public.completions c
   WHERE c.id = v_completion_id;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('quizspace.internal_completion_write', 'off', true);
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_mobile_quiz_attempt_v2(TEXT, TEXT, TEXT, JSONB, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_mobile_quiz_attempt_v2(TEXT, TEXT, TEXT, JSONB, INTEGER, TEXT) TO service_role;

COMMENT ON TABLE private.quiz_answer_keys IS
  'Private answer keys and explanations for standard quizzes; never expose through PostgREST.';
