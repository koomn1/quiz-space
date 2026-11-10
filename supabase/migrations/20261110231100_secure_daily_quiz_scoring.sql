-- Server-owned daily challenge bank and score verification.
-- Additive rollout: legacy RPCs remain temporarily for the currently deployed client.
CREATE TABLE IF NOT EXISTS public.daily_quiz_bank (
  id TEXT PRIMARY KEY,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_ar TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  category_ar TEXT NOT NULL,
  category_en TEXT NOT NULL,
  time_limit INTEGER NOT NULL DEFAULT 300 CHECK (time_limit BETWEEN 30 AND 3600),
  questions JSONB NOT NULL CHECK (
    jsonb_typeof(questions) = 'array'
    AND jsonb_array_length(questions) BETWEEN 1 AND 50
  ),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_quiz_answer_keys (
  bank_id TEXT NOT NULL REFERENCES public.daily_quiz_bank(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL CHECK (question_number BETWEEN 1 AND 50),
  correct_index INTEGER NOT NULL CHECK (correct_index BETWEEN 0 AND 19),
  explanation_ar TEXT NOT NULL DEFAULT '',
  explanation_en TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (bank_id, question_number)
);

ALTER TABLE public.daily_quiz_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_quiz_answer_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.daily_quiz_bank FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.daily_quiz_answer_keys FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.daily_quiz_bank TO service_role;
GRANT ALL ON TABLE public.daily_quiz_answer_keys TO service_role;

CREATE OR REPLACE FUNCTION public.get_user_daily_quiz_slot_v2(
  p_user_id TEXT,
  p_tier TEXT DEFAULT NULL
)
RETURNS TABLE (
  quiz_id TEXT,
  quiz_payload JSONB,
  generated_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  next_available_at TIMESTAMPTZ,
  refreshing BOOLEAN,
  refresh_interval_seconds INTEGER,
  seconds_until_refresh INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tier TEXT := public.quizspace_resolve_daily_quiz_tier(p_user_id);
BEGIN
  -- Legacy payloads contained client-side answer keys. Never return them to v2 clients.
  UPDATE public.daily_quiz_user_slots AS s
  SET quiz_id = NULL,
      quiz_payload = NULL,
      generated_at = NULL,
      refreshing = false
  WHERE s.user_id = p_user_id
    AND s.tier = v_tier
    AND s.answered_at IS NULL
    AND s.quiz_payload IS NOT NULL
    AND NOT (s.quiz_payload ? 'source_bank_id');

  RETURN QUERY
  SELECT s.quiz_id,
         s.quiz_payload,
         s.generated_at,
         s.answered_at,
         s.next_available_at,
         s.refreshing,
         s.refresh_interval_seconds,
         CASE
           WHEN s.next_available_at IS NULL THEN 0
           ELSE GREATEST(0, CEIL(EXTRACT(EPOCH FROM (s.next_available_at - now())))::INTEGER)
         END
  FROM public.daily_quiz_user_slots AS s
  WHERE s.user_id = p_user_id
    AND s.tier = v_tier;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_user_daily_quiz_refresh_v2(
  p_user_id TEXT,
  p_tier TEXT,
  p_quiz_request JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tier TEXT := public.quizspace_resolve_daily_quiz_tier(p_user_id);
  v_interval INTEGER := public.quizspace_daily_quiz_interval(v_tier);
  v_quiz_id TEXT := p_quiz_request->>'id';
  v_parts TEXT[];
  v_bank_id TEXT;
  v_bank public.daily_quiz_bank%ROWTYPE;
  v_questions JSONB;
  v_payload JSONB;
  v_rows INTEGER;
BEGIN
  IF jsonb_typeof(p_quiz_request) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid daily quiz request';
  END IF;

  v_parts := regexp_match(v_quiz_id, '^daily-(.+)-([0-9]+)-([0-9]{2})$');
  IF v_parts IS NULL OR v_parts[1] <> p_user_id THEN
    RAISE EXCEPTION 'Invalid daily quiz identifier';
  END IF;

  IF v_parts[2]::BIGINT < floor(extract(epoch FROM now()) / v_interval)::BIGINT - 1
     OR v_parts[2]::BIGINT > floor(extract(epoch FROM now()) / v_interval)::BIGINT + 1 THEN
    RAISE EXCEPTION 'Daily quiz window is invalid';
  END IF;

  v_bank_id := 'daily-bank-' || v_parts[3];
  SELECT * INTO v_bank
  FROM public.daily_quiz_bank
  WHERE id = v_bank_id AND is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Daily quiz bank is unavailable';
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', v_quiz_id || '-q' || q.ordinality,
      'text', q.question->>'text',
      'options', q.question->'options',
      'type', COALESCE(q.question->>'type', 'mcq'),
      'number', q.ordinality,
      'correctIndex', -1
    )
    ORDER BY q.ordinality
  )
  INTO v_questions
  FROM jsonb_array_elements(v_bank.questions) WITH ORDINALITY AS q(question, ordinality);

  IF v_questions IS NULL OR jsonb_array_length(v_questions) <> jsonb_array_length(v_bank.questions) THEN
    RAISE EXCEPTION 'Daily quiz bank is incomplete';
  END IF;

  v_payload := jsonb_build_object(
    'id', v_quiz_id,
    'source_bank_id', v_bank_id,
    'title', CASE WHEN p_quiz_request->>'lang' = 'en'
      THEN 'Daily Challenge — ' || v_bank.title_en
      ELSE 'التحدي اليومي — ' || v_bank.title_ar END,
    'description', CASE WHEN p_quiz_request->>'lang' = 'en'
      THEN v_bank.description_en ELSE v_bank.description_ar END,
    'category', CASE WHEN p_quiz_request->>'lang' = 'en'
      THEN 'Daily • ' || v_bank.category_en ELSE 'يومي • ' || v_bank.category_ar END,
    'questions', v_questions,
    'timeLimit', v_bank.time_limit,
    'creatorId', 'quizspace-daily-bank',
    'creatorName', CASE WHEN p_quiz_request->>'lang' = 'en'
      THEN 'QuizSpace • Rotating Challenge' ELSE 'QuizSpace • تحدٍ متجدد' END,
    'createdAt', now(),
    'totalPlays', 0,
    'avgRating', 0,
    'ratingsCount', 0
  );

  UPDATE public.daily_quiz_user_slots
  SET quiz_id = NULL,
      quiz_payload = v_payload,
      generated_at = now(),
      answered_at = NULL,
      next_available_at = NULL,
      refreshing = FALSE,
      refresh_interval_seconds = v_interval
  WHERE user_id = p_user_id
    AND tier = v_tier
    AND refreshing = TRUE;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'Daily quiz refresh was not claimed';
  END IF;

  RETURN v_payload;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_user_daily_quiz_attempt_v2(
  p_quiz_id TEXT,
  p_taker_id TEXT,
  p_taker_name TEXT,
  p_answers JSONB,
  p_rating INTEGER DEFAULT NULL,
  p_feedback TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_slot public.daily_quiz_user_slots%ROWTYPE;
  v_completion public.daily_quiz_completions%ROWTYPE;
  v_bank public.daily_quiz_bank%ROWTYPE;
  v_bank_id TEXT;
  v_total INTEGER;
  v_score INTEGER;
  v_quiz_xp INTEGER := 0;
  v_points INTEGER := 0;
  v_points_awarded INTEGER := 0;
  v_total_points INTEGER := 0;
  v_rows INTEGER := 0;
  v_inserted BOOLEAN := FALSE;
  v_correct_answers JSONB;
  v_taker_name TEXT := left(COALESCE(NULLIF(trim(p_taker_name), ''), 'طالب متميز'), 100);
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_taker_id IS NULL OR p_taker_id <> v_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_quiz_id IS NULL OR p_quiz_id !~ '^daily-[A-Za-z0-9-]{8,200}$' THEN
    RAISE EXCEPTION 'Invalid daily quiz identifier';
  END IF;
  IF p_rating IS NOT NULL AND (p_rating < 1 OR p_rating > 5) THEN RAISE EXCEPTION 'Invalid quiz rating'; END IF;
  IF length(COALESCE(p_feedback, '')) > 4000 THEN RAISE EXCEPTION 'Feedback is too long'; END IF;
  IF jsonb_typeof(p_answers) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Answers must be an array'; END IF;

  SELECT * INTO v_slot
  FROM public.daily_quiz_user_slots AS s
  WHERE s.user_id = v_user_id
    AND s.quiz_payload->>'id' = p_quiz_id
    AND s.answered_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    SELECT * INTO v_completion
    FROM public.daily_quiz_completions AS c
    WHERE c.user_id = v_user_id AND c.quiz_id = p_quiz_id
    LIMIT 1;

    IF NOT FOUND THEN RAISE EXCEPTION 'Daily quiz is unavailable'; END IF;

    UPDATE public.daily_quiz_completions AS c
    SET rating = COALESCE(p_rating, v_completion.rating),
        feedback = CASE WHEN COALESCE(p_feedback, '') = '' THEN v_completion.feedback ELSE p_feedback END,
        taker_name = v_taker_name,
        updated_at = now()
    WHERE c.user_id = v_user_id AND c.quiz_id = p_quiz_id
    RETURNING * INTO v_completion;

    v_bank_id := NULLIF((SELECT s.quiz_payload->>'source_bank_id'
      FROM public.daily_quiz_user_slots AS s
      WHERE s.user_id = v_user_id AND s.quiz_payload->>'id' = p_quiz_id
      LIMIT 1), '');
    -- The slot payload is cleared after completion; recover the bank from the quiz id suffix.
    IF v_bank_id IS NULL THEN
      v_bank_id := 'daily-bank-' || substring(p_quiz_id FROM '([0-9]{2})$');
    END IF;
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'question_id', p_quiz_id || '-q' || k.question_number,
      'correct_index', k.correct_index,
      'explanation', CASE WHEN p_feedback LIKE 'en:%' THEN k.explanation_en ELSE k.explanation_ar END
    ) ORDER BY k.question_number), '[]'::JSONB)
    INTO v_correct_answers
    FROM public.daily_quiz_answer_keys AS k
    WHERE k.bank_id = v_bank_id;

    SELECT COALESCE(points, 0) INTO v_total_points
    FROM public.user_reward_balances WHERE user_id = v_user_id;

    RETURN jsonb_build_object(
      'id', v_completion.id, 'quiz_id', v_completion.quiz_id, 'taker_id', v_completion.user_id,
      'taker_name', v_completion.taker_name, 'score', v_completion.score,
      'total_questions', v_completion.total_questions, 'rating', v_completion.rating,
      'feedback', v_completion.feedback, 'created_at', v_completion.created_at,
      'xp_awarded', 0, 'points_awarded', 0, 'total_points', COALESCE(v_total_points, 0),
      'daily_completed', TRUE, 'correct_answers', v_correct_answers
    );
  END IF;

  v_bank_id := v_slot.quiz_payload->>'source_bank_id';
  SELECT * INTO v_bank FROM public.daily_quiz_bank WHERE id = v_bank_id AND is_active = TRUE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Daily quiz bank is unavailable'; END IF;

  v_total := jsonb_array_length(v_bank.questions);
  IF jsonb_array_length(p_answers) <> v_total THEN RAISE EXCEPTION 'Answer count does not match quiz'; END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_answers) WITH ORDINALITY AS a(value, ordinality)
    JOIN jsonb_array_elements(v_bank.questions) WITH ORDINALITY AS q(question, ordinality)
      ON q.ordinality = a.ordinality
    WHERE a.value <> 'null'::JSONB
      AND CASE
        WHEN jsonb_typeof(a.value) = 'number' THEN
          (a.value #>> '{}')::NUMERIC <> trunc((a.value #>> '{}')::NUMERIC)
          OR (a.value #>> '{}')::INTEGER < 0
          OR (a.value #>> '{}')::INTEGER >= jsonb_array_length(q.question->'options')
        ELSE TRUE
      END
  ) THEN
    RAISE EXCEPTION 'One or more answers are invalid';
  END IF;

  IF (SELECT count(*) FROM public.daily_quiz_answer_keys WHERE bank_id = v_bank_id) <> v_total THEN
    RAISE EXCEPTION 'Daily quiz answer key is incomplete';
  END IF;

  SELECT count(*) FILTER (
    WHERE a.value <> 'null'::JSONB
      AND (a.value #>> '{}')::INTEGER = k.correct_index
  )
  INTO v_score
  FROM jsonb_array_elements(p_answers) WITH ORDINALITY AS a(value, ordinality)
  JOIN public.daily_quiz_answer_keys AS k
    ON k.bank_id = v_bank_id AND k.question_number = a.ordinality;

  SELECT jsonb_agg(jsonb_build_object(
    'question_id', p_quiz_id || '-q' || k.question_number,
    'correct_index', k.correct_index,
    'explanation', CASE WHEN p_feedback LIKE 'en:%' THEN k.explanation_en ELSE k.explanation_ar END
  ) ORDER BY k.question_number)
  INTO v_correct_answers
  FROM public.daily_quiz_answer_keys AS k
  WHERE k.bank_id = v_bank_id;

  SELECT * INTO v_completion
  FROM public.daily_quiz_completions AS c
  WHERE c.user_id = v_user_id AND c.quiz_id = p_quiz_id
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.daily_quiz_completions AS c
    SET rating = COALESCE(p_rating, v_completion.rating),
        feedback = CASE WHEN COALESCE(p_feedback, '') = '' THEN v_completion.feedback ELSE p_feedback END,
        taker_name = v_taker_name,
        updated_at = now()
    WHERE c.user_id = v_user_id AND c.quiz_id = p_quiz_id
    RETURNING * INTO v_completion;
  ELSE
    v_completion_id := 'daily_comp_' || extract(epoch FROM now())::BIGINT || '_' || substr(md5(random()::TEXT), 1, 8);
    v_quiz_xp := 10 + (v_score * 10);
    v_points := 10 + (v_score * 2);
    IF (v_score::NUMERIC / v_total::NUMERIC) >= 0.80 THEN v_points := v_points + 15; END IF;
    IF v_score >= v_total THEN v_points := v_points + 30; END IF;

    INSERT INTO public.daily_quiz_completions (
      id, user_id, quiz_id, quiz_title, taker_name, score, total_questions, rating, feedback
    ) VALUES (
      v_completion_id, v_user_id, p_quiz_id, v_bank.title_ar, v_taker_name,
      v_score, v_total, p_rating, COALESCE(p_feedback, '')
    )
    ON CONFLICT (user_id, quiz_id) DO NOTHING
    RETURNING * INTO v_completion;

    v_inserted := FOUND;
    IF NOT v_inserted THEN
      SELECT * INTO v_completion FROM public.daily_quiz_completions
      WHERE user_id = v_user_id AND quiz_id = p_quiz_id FOR UPDATE;
      v_quiz_xp := 0;
      v_points := 0;
    ELSE
      INSERT INTO public.reward_points_ledger (
        user_id, points, event_type, event_key, reference_id, metadata
      ) VALUES (
        v_user_id, v_points, 'quiz_completion', 'quiz_completion:' || v_completion.id,
        v_completion.id,
        jsonb_build_object('quiz_id', p_quiz_id, 'score', v_score, 'total_questions', v_total, 'source', 'daily_quiz')
      )
      ON CONFLICT (user_id, event_key) DO NOTHING;

      GET DIAGNOSTICS v_rows = ROW_COUNT;
      IF v_rows > 0 THEN
        v_points_awarded := v_points;
        INSERT INTO public.user_reward_balances (user_id, points, level)
        VALUES (v_user_id, v_points, public.reward_level_for_points(v_points))
        ON CONFLICT (user_id) DO UPDATE
        SET points = public.user_reward_balances.points + v_points,
            level = public.reward_level_for_points(public.user_reward_balances.points + v_points),
            updated_at = now()
        RETURNING points INTO v_total_points;

        UPDATE public.users
        SET xp = COALESCE(xp, 0) + v_quiz_xp + (v_points * 10),
            updated_at = now()
        WHERE uid::TEXT = v_user_id;
      END IF;
    END IF;
  END IF;

  IF NOT v_inserted THEN
    SELECT COALESCE(points, 0) INTO v_total_points
    FROM public.user_reward_balances WHERE user_id = v_user_id;
  END IF;

  UPDATE public.daily_quiz_user_slots
  SET quiz_payload = NULL,
      quiz_id = NULL,
      answered_at = now(),
      next_available_at = now() + refresh_interval_seconds * interval '1 second',
      refreshing = FALSE
  WHERE user_id = v_user_id AND tier = v_slot.tier;

  RETURN jsonb_build_object(
    'id', v_completion.id, 'quiz_id', v_completion.quiz_id, 'taker_id', v_completion.user_id,
    'taker_name', v_completion.taker_name, 'score', v_completion.score,
    'total_questions', v_completion.total_questions, 'rating', v_completion.rating,
    'feedback', v_completion.feedback, 'created_at', v_completion.created_at,
    'xp_awarded', v_quiz_xp, 'points_awarded', v_points_awarded,
    'total_points', COALESCE(v_total_points, 0), 'daily_completed', TRUE,
    'correct_answers', v_correct_answers
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_daily_quiz_slot_v2(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.finalize_user_daily_quiz_refresh_v2(TEXT, TEXT, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_user_daily_quiz_attempt_v2(TEXT, TEXT, TEXT, JSONB, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_daily_quiz_slot_v2(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_user_daily_quiz_refresh_v2(TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_user_daily_quiz_attempt_v2(TEXT, TEXT, TEXT, JSONB, INTEGER, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
