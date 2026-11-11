-- Compatibility smoke test for the answer-key preparation migration.
-- Run after 20261111073000_private_quiz_answer_keys.sql and BEFORE the
-- 20261111074000_sanitize_public_quiz_answer_keys.sql cutover. All writes roll back.

BEGIN;

DO $$
DECLARE
  v_quiz_id TEXT := 'phase2-answer-key-prepare-' || gen_random_uuid()::TEXT;
  v_creator_id TEXT;
  v_questions JSONB;
  v_key_count INTEGER;
BEGIN
  SELECT uid::TEXT INTO v_creator_id FROM public.users LIMIT 1;
  IF v_creator_id IS NULL THEN RAISE EXCEPTION 'A test creator profile is required'; END IF;

  INSERT INTO public.quizzes (
    id, title, description, creator_id, creator_name, questions,
    category, distribution_routing, time_limit
  ) VALUES (
    v_quiz_id,
    'Phase 2 preparation compatibility test',
    'Temporary transactional test row',
    v_creator_id,
    'Phase 2 Test',
    jsonb_build_array(jsonb_build_object(
      'id', 'prepare-mcq',
      'type', 'mcq',
      'text', 'Choose the first option',
      'options', jsonb_build_array('A', 'B'),
      'correctIndex', 0,
      'explanation', 'Private explanation'
    )),
    'Test',
    'public',
    0
  );

  SELECT questions INTO v_questions FROM public.quizzes WHERE id = v_quiz_id;
  IF NOT (v_questions @> '[{"correctIndex":0,"explanation":"Private explanation"}]'::JSONB) THEN
    RAISE EXCEPTION 'Preparation phase must preserve legacy public payload compatibility';
  END IF;

  SELECT count(*) INTO v_key_count
  FROM private.quiz_answer_keys
  WHERE quiz_id = v_quiz_id AND question_id = 'prepare-mcq' AND correct_index = 0;
  IF v_key_count <> 1 THEN
    RAISE EXCEPTION 'Preparation phase did not capture the private answer key';
  END IF;
END;
$$;

ROLLBACK;
