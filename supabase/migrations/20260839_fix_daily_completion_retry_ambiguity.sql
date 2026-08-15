-- Qualify the completion identifier in the retry-only update path. The table
-- function exposes an output column named id, so the unqualified reference is
-- ambiguous after the first successful submission closes the private slot.
DO $$
DECLARE
  v_definition TEXT;
BEGIN
  SELECT pg_get_functiondef(p.oid)
  INTO v_definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'submit_user_daily_quiz_attempt'
  LIMIT 1;

  IF v_definition IS NULL THEN
    RAISE EXCEPTION 'submit_user_daily_quiz_attempt is missing';
  END IF;

  v_definition := replace(
    v_definition,
    'UPDATE public.daily_quiz_completions',
    'UPDATE public.daily_quiz_completions AS daily_completion'
  );
  v_definition := replace(
    v_definition,
    'WHERE id = v_completion.id',
    'WHERE daily_completion.id = v_completion.id'
  );

  EXECUTE v_definition;
END;
$$;
