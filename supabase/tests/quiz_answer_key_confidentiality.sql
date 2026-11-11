-- Contract smoke test for 20261111073000_private_quiz_answer_keys.sql.
-- Run after the migration in a disposable/test database. All writes roll back.

BEGIN;

DO $$
DECLARE
  v_quiz_id TEXT := 'phase2-answer-key-smoke-' || gen_random_uuid()::TEXT;
  v_creator_id TEXT;
  v_questions JSONB;
  v_score INTEGER;
  v_key_count INTEGER;
  v_has_public_key BOOLEAN;
  v_failed_closed BOOLEAN := FALSE;
BEGIN
  SELECT uid::TEXT INTO v_creator_id FROM public.users LIMIT 1;
  IF v_creator_id IS NULL THEN RAISE EXCEPTION 'A test creator profile is required'; END IF;

  INSERT INTO public.quizzes (
    id, title, description, creator_id, creator_name, questions,
    category, distribution_routing, time_limit
  ) VALUES (
    v_quiz_id,
    'Phase 2 answer-key smoke test',
    'Temporary transactional test row',
    v_creator_id,
    'Phase 2 Test',
    jsonb_build_array(
      jsonb_build_object(
        'id', 'valid-mcq',
        'type', 'mcq',
        'text', 'Choose the first option',
        'options', jsonb_build_array('A', 'B'),
        'correctIndex', 0,
        'explanation', 'Private explanation'
      ),
      jsonb_build_object(
        'id', 'invalid-tf',
        'type', 'tf',
        'text', 'Unresolved legacy question',
        'options', jsonb_build_array('True', 'False'),
        'correctIndex', -1
      )
    ),
    'Test',
    'public',
    0
  );

  SELECT questions INTO v_questions FROM public.quizzes WHERE id = v_quiz_id;

  IF v_questions @> '[{"correctIndex":0}]'::JSONB
     OR v_questions @> '[{"explanation":"Private explanation"}]'::JSONB THEN
    RAISE EXCEPTION 'Public question JSON still contains answer-key fields';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_questions) AS item(value)
    WHERE item.value->>'_quizId' IS DISTINCT FROM v_quiz_id
  ) THEN
    RAISE EXCEPTION 'Question answer-key references were not stamped correctly';
  END IF;

  SELECT count(*) INTO v_key_count
  FROM private.quiz_answer_keys
  WHERE quiz_id = v_quiz_id;
  IF v_key_count <> 2 THEN
    RAISE EXCEPTION 'Expected two private answer-key rows, got %', v_key_count;
  END IF;

  v_score := public.quizspace_score_objective_answers(
    jsonb_build_array(v_questions->0),
    '[0]'::JSONB
  );
  IF v_score <> 1 THEN
    RAISE EXCEPTION 'Expected private-key score 1, got %', v_score;
  END IF;

  BEGIN
    PERFORM public.quizspace_score_objective_answers(v_questions, '[0,null]'::JSONB);
  EXCEPTION WHEN OTHERS THEN
    v_failed_closed := SQLERRM LIKE '%unresolved answer key%';
  END;

  IF NOT v_failed_closed THEN
    RAISE EXCEPTION 'Unresolved objective answer key did not fail closed';
  END IF;

  IF has_table_privilege('anon', 'private.quiz_answer_keys', 'SELECT')
     OR has_table_privilege('authenticated', 'private.quiz_answer_keys', 'SELECT') THEN
    RAISE EXCEPTION 'Private answer keys are directly readable by API roles';
  END IF;
END;
$$;

ROLLBACK;
