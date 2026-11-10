CREATE OR REPLACE FUNCTION public.protect_privileged_user_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_is_service_role BOOLEAN;
  v_badge_update_allowed BOOLEAN;
  v_subscription_update_allowed BOOLEAN;
  v_progression_update_allowed BOOLEAN;
  v_auth_uid TEXT;
  v_auth_email TEXT;
BEGIN
  v_is_service_role := (auth.jwt() ->> 'role') = 'service_role';
  v_auth_uid := auth.uid()::TEXT;
  IF v_is_service_role OR v_auth_uid IS NULL THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.uid IS DISTINCT FROM v_auth_uid THEN RAISE EXCEPTION 'Users may only create their own profile'; END IF;
    SELECT email INTO v_auth_email FROM auth.users WHERE id::TEXT = v_auth_uid;
    NEW.email := v_auth_email;
    NEW.is_premium := FALSE; NEW.plan_id := NULL; NEW.plan_name := 'Free';
    NEW.is_lifetime := FALSE; NEW.is_founder := FALSE; NEW.is_suspended := FALSE;
    NEW.is_admin := FALSE; NEW.category_id := NULL; NEW.renewal_date := NULL;
    NEW.premium_until := NULL; NEW.xp := 0; NEW.level := 1;
    NEW.badge_tier := 'none'; NEW.name_color := 'default';
    NEW.badge_symbol := ''; NEW.badge_color := ''; NEW.active_frame_id := NULL;
    RETURN NEW;
  END IF;

  SELECT is_admin INTO v_is_admin FROM public.users WHERE uid = v_auth_uid;
  NEW.email := OLD.email;
  NEW.is_admin := OLD.is_admin;
  NEW.is_suspended := OLD.is_suspended;
  NEW.category_id := OLD.category_id;
  NEW.created_at := OLD.created_at;

  v_subscription_update_allowed := COALESCE(current_setting('app.allow_subscription_update',TRUE),'') = 'on';
  v_progression_update_allowed := COALESCE(current_setting('app.allow_progression_update',TRUE),'') = 'on';

  IF NOT COALESCE(v_is_admin,FALSE) THEN
    IF NOT v_progression_update_allowed THEN
      NEW.xp := OLD.xp;
      NEW.level := OLD.level;
    END IF;
    IF NOT v_subscription_update_allowed THEN
      NEW.is_premium := OLD.is_premium;
      NEW.plan_id := OLD.plan_id;
      NEW.plan_name := OLD.plan_name;
      NEW.is_lifetime := OLD.is_lifetime;
      NEW.is_founder := OLD.is_founder;
      NEW.renewal_date := OLD.renewal_date;
      NEW.premium_until := OLD.premium_until;
    END IF;
  END IF;

  v_badge_update_allowed := COALESCE(current_setting('app.allow_badge_update',TRUE),'') = 'on';
  IF NOT v_badge_update_allowed THEN
    NEW.badge_tier := OLD.badge_tier;
    NEW.name_color := OLD.name_color;
    NEW.badge_color := OLD.badge_color;
    NEW.badge_symbol := OLD.badge_symbol;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_exam_completion_reward(p_user_id TEXT,p_score_percent INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'Legacy exam reward endpoint is disabled; use the verified completion flow';
END;
$$;

REVOKE ALL ON FUNCTION public.process_exam_completion_reward(TEXT,INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rebuild_user_xp_from_completions(TEXT) FROM PUBLIC, anon, authenticated;
NOTIFY pgrst, 'reload schema';

CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(p_quiz_id text, p_taker_id text, p_taker_name text, p_score integer, p_rating integer DEFAULT NULL::integer, p_feedback text DEFAULT ''::text, p_essay_answers jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(id text, quiz_id text, taker_id text, taker_name text, score integer, total_questions integer, rating integer, feedback text, created_at timestamp with time zone, attempt_number integer, is_best boolean, xp_awarded integer, review_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_quiz_id text := trim(coalesce(p_quiz_id, ''));
  v_completion_id text;
  v_total_questions integer;
  v_attempt_number integer;
  v_previous_best integer;
  v_score integer := coalesce(p_score, -1);
  v_xp_awarded integer;
  v_is_best boolean;
  v_quiz_title text;
  v_essay_mode text;
  v_has_essay boolean := false;
  v_review_status text := 'completed';
BEGIN
  IF auth.uid() IS NULL OR auth.uid()::text <> p_taker_id THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501'; END IF;
  IF v_quiz_id = '' OR char_length(v_quiz_id) > 200 THEN RAISE EXCEPTION 'Invalid quiz' USING ERRCODE = '22023'; END IF;
  IF p_taker_name IS NULL OR char_length(trim(p_taker_name)) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Invalid taker name' USING ERRCODE = '22023'; END IF;
  IF p_rating IS NOT NULL AND (p_rating < 1 OR p_rating > 5) THEN RAISE EXCEPTION 'Invalid rating' USING ERRCODE = '22023'; END IF;
  IF char_length(coalesce(p_feedback, '')) > 2000 THEN RAISE EXCEPTION 'Feedback is too long' USING ERRCODE = '22023'; END IF;

  SELECT quiz_row.title,
         coalesce(jsonb_array_length(quiz_row.questions), 0),
         coalesce(quiz_row.essay_grading_mode, 'manual'),
         exists (
           SELECT 1 FROM jsonb_array_elements(coalesce(quiz_row.questions, '[]'::jsonb)) AS question_element
           WHERE question_element->>'type' = 'essay'
         )
    INTO v_quiz_title, v_total_questions, v_essay_mode, v_has_essay
    FROM public.quizzes AS quiz_row
   WHERE quiz_row.id = v_quiz_id
   FOR SHARE;

  IF NOT FOUND OR v_total_questions <= 0 THEN RAISE EXCEPTION 'Quiz not found' USING ERRCODE = 'P0002'; END IF;
  IF v_score < 0 OR v_score > v_total_questions THEN RAISE EXCEPTION 'Invalid score' USING ERRCODE = '22023'; END IF;

  v_review_status := CASE WHEN v_has_essay AND v_essay_mode = 'manual' THEN 'pending_creator_review' ELSE 'completed' END;

  SELECT count(*)::integer, coalesce(max(completion_row.score), 0)
    INTO v_attempt_number, v_previous_best
    FROM public.completions AS completion_row
   WHERE completion_row.quiz_id = v_quiz_id AND completion_row.taker_id = p_taker_id;

  v_attempt_number := v_attempt_number + 1;
  v_is_best := v_attempt_number = 1 OR v_score > v_previous_best;
  v_xp_awarded := CASE WHEN v_attempt_number = 1 THEN 10 + (v_score * 10) ELSE greatest(0, v_score - v_previous_best) * 10 END;

  v_completion_id := 'comp_' || extract(epoch FROM clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 10);
  PERFORM set_config('quizspace.internal_completion_write', 'on', true);
  IF v_is_best THEN
    UPDATE public.completions AS completion_row
       SET is_best = false
     WHERE completion_row.quiz_id = v_quiz_id AND completion_row.taker_id = p_taker_id;
  END IF;

  INSERT INTO public.completions (
    id, quiz_id, quiz_title, taker_id, taker_name, score, total_questions,
    rating, feedback, attempt_number, is_best, essay_answers, review_status
  ) VALUES (
    v_completion_id, v_quiz_id, v_quiz_title, p_taker_id, trim(p_taker_name),
    v_score, v_total_questions, p_rating, coalesce(p_feedback, ''),
    v_attempt_number, v_is_best, p_essay_answers, v_review_status
  );

  IF v_xp_awarded > 0 THEN
    PERFORM set_config('app.allow_progression_update', 'on', true);
    UPDATE public.users AS user_row
       SET xp = coalesce(user_row.xp, 0) + v_xp_awarded, updated_at = now()
     WHERE user_row.uid = p_taker_id;
    PERFORM set_config('app.allow_progression_update', 'off', true);
  END IF;
  PERFORM set_config('quizspace.internal_completion_write', 'off', true);

  RETURN QUERY
  SELECT completion_row.id AS id, completion_row.quiz_id AS quiz_id,
         completion_row.taker_id AS taker_id, completion_row.taker_name AS taker_name,
         completion_row.score AS score, completion_row.total_questions AS total_questions,
         completion_row.rating AS rating, completion_row.feedback AS feedback,
         completion_row.created_at AS created_at, completion_row.attempt_number AS attempt_number,
         completion_row.is_best AS is_best, v_xp_awarded AS xp_awarded,
         completion_row.review_status AS review_status
    FROM public.completions AS completion_row
   WHERE completion_row.id = v_completion_id;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('quizspace.internal_completion_write', 'off', true);
  RAISE;
END;
$function$


CREATE OR REPLACE FUNCTION public.award_quiz_completion_rewards(p_completion_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_completion RECORD;
  v_points INTEGER;
  v_event_key TEXT;
  v_inserted BOOLEAN := false;
  v_rows INTEGER := 0;
  v_total_completed INTEGER;
  v_level INTEGER;
  v_total_points INTEGER;
  v_extra_points INTEGER := 0;
BEGIN
  SELECT c.* INTO v_completion
  FROM public.completions c
  WHERE c.id = p_completion_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Completion not found';
  END IF;

  IF auth.uid()::text <> v_completion.taker_id::text THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  PERFORM set_config('app.allow_progression_update', 'on', true);

  v_event_key := 'quiz_completion:' || p_completion_id;
  v_points := 10 + (GREATEST(0, COALESCE(v_completion.score, 0)) * 2);

  IF COALESCE(v_completion.total_questions, 0) > 0
     AND (v_completion.score::numeric / v_completion.total_questions::numeric) >= 0.80 THEN
    v_points := v_points + 15;
  END IF;

  IF COALESCE(v_completion.total_questions, 0) > 0
     AND v_completion.score >= v_completion.total_questions THEN
    v_points := v_points + 30;
  END IF;

  INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id, metadata)
  VALUES (
    v_completion.taker_id::text,
    v_points,
    'quiz_completion',
    v_event_key,
    p_completion_id,
    jsonb_build_object('quiz_id', v_completion.quiz_id, 'score', v_completion.score, 'total_questions', v_completion.total_questions)
  )
  ON CONFLICT (user_id, event_key) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_inserted := v_rows > 0;

  IF v_inserted THEN
    INSERT INTO public.user_reward_balances (user_id, points, level)
    VALUES (v_completion.taker_id::text, v_points, public.reward_level_for_points(v_points))
    ON CONFLICT (user_id) DO UPDATE
      SET points = public.user_reward_balances.points + v_points,
          level = public.reward_level_for_points(public.user_reward_balances.points + v_points),
          updated_at = now();

    UPDATE public.users
      SET xp = COALESCE(xp, 0) + (v_points * 10)
      WHERE uid::text = v_completion.taker_id::text;
  END IF;

  SELECT count(*)::integer INTO v_total_completed
  FROM public.completions
  WHERE taker_id = v_completion.taker_id;

  IF v_total_completed = 5 THEN
    INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id)
    VALUES (v_completion.taker_id::text, 200, 'milestone_reward', 'milestone_5_quizzes', p_completion_id)
    ON CONFLICT (user_id, event_key) DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;

    IF v_rows > 0 THEN
      v_extra_points := v_extra_points + 200;
      UPDATE public.user_reward_balances
        SET points = points + 200,
            level = public.reward_level_for_points(points + 200),
            updated_at = now()
        WHERE user_id = v_completion.taker_id::text;
      UPDATE public.users
        SET xp = COALESCE(xp, 0) + 2000
        WHERE uid::text = v_completion.taker_id::text;
    END IF;
  END IF;

  IF v_total_completed = 10 THEN
    INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id)
    VALUES (v_completion.taker_id::text, 500, 'milestone_reward', 'milestone_10_quizzes', p_completion_id)
    ON CONFLICT (user_id, event_key) DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;

    IF v_rows > 0 THEN
      v_extra_points := v_extra_points + 500;
      UPDATE public.user_reward_balances
        SET points = points + 500,
            level = public.reward_level_for_points(points + 500),
            updated_at = now()
        WHERE user_id = v_completion.taker_id::text;
      UPDATE public.users
        SET xp = COALESCE(xp, 0) + 5000
        WHERE uid::text = v_completion.taker_id::text;
      INSERT INTO public.reward_inventory (user_id, item_id)
      VALUES (v_completion.taker_id::text, 'frame_nature_leaf')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  IF v_total_completed >= 1 THEN
    INSERT INTO public.user_reward_badges(user_id, badge_id)
    VALUES (v_completion.taker_id::text, 'first_quiz')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_total_completed >= 10 THEN
    INSERT INTO public.user_reward_badges(user_id, badge_id)
    VALUES (v_completion.taker_id::text, 'active_learner')
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT b.points, b.level INTO v_total_points, v_level
  FROM public.user_reward_balances b
  WHERE b.user_id = v_completion.taker_id::text;

  PERFORM set_config('app.allow_progression_update', 'off', true);
  RETURN jsonb_build_object(
    'points_awarded', (CASE WHEN v_inserted THEN v_points ELSE 0 END) + v_extra_points,
    'total_points', v_total_points,
    'level', v_level,
    'milestone_reached', v_total_completed IN (5, 10)
  );
END;
$function$


CREATE OR REPLACE FUNCTION public.grade_quiz_essay_attempt(p_completion_id text, p_is_guest boolean, p_awarded_score integer, p_feedback text DEFAULT ''::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      PERFORM set_config('app.allow_progression_update', 'on', true);
      UPDATE public.users SET xp = COALESCE(xp, 0) + v_new_xp, updated_at = now()
       WHERE uid = v_taker_id;
      PERFORM set_config('app.allow_progression_update', 'off', true);
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
  PERFORM set_config('app.allow_progression_update', 'off', true);
  RAISE;
END;
$function$


CREATE OR REPLACE FUNCTION public.submit_user_daily_quiz_attempt(p_quiz_id text, p_taker_id text, p_taker_name text, p_score integer, p_total_questions integer, p_rating integer DEFAULT NULL::integer, p_feedback text DEFAULT ''::text)
 RETURNS TABLE(id text, quiz_id text, taker_id text, taker_name text, score integer, total_questions integer, rating integer, feedback text, created_at timestamp with time zone, xp_awarded integer, points_awarded integer, total_points integer, daily_completed boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_completion public.daily_quiz_completions%ROWTYPE;
  v_completion_id TEXT;
  v_quiz_xp INTEGER := 0;
  v_points INTEGER := 0;
  v_points_awarded INTEGER := 0;
  v_total_points INTEGER := 0;
  v_rows INTEGER := 0;
  v_inserted BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_taker_id IS NULL OR p_taker_id <> v_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_quiz_id IS NULL OR p_quiz_id !~ '^daily-[A-Za-z0-9-]{8,200}$' THEN
    RAISE EXCEPTION 'Invalid daily quiz identifier';
  END IF;

  IF p_score IS NULL OR p_total_questions IS NULL OR p_total_questions < 1
    OR p_score < 0 OR p_score > p_total_questions THEN
    RAISE EXCEPTION 'Invalid quiz score';
  END IF;

  IF p_rating IS NOT NULL AND (p_rating < 1 OR p_rating > 5) THEN
    RAISE EXCEPTION 'Invalid quiz rating';
  END IF;

  IF length(COALESCE(p_feedback, '')) > 4000 THEN
    RAISE EXCEPTION 'Feedback is too long';
  END IF;

  -- Lock the active private slot. A retry after a committed success returns
  -- the original result without re-awarding points; a competing submission
  -- waits on this lock and follows the same idempotent path.
  PERFORM 1
  FROM public.daily_quiz_user_slots
  WHERE user_id = v_user_id
    AND quiz_payload->>'id' = p_quiz_id
    AND answered_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    SELECT * INTO v_completion
    FROM public.daily_quiz_completions
    WHERE user_id = v_user_id AND daily_quiz_completions.quiz_id = p_quiz_id
    LIMIT 1;

    IF FOUND THEN
      UPDATE public.daily_quiz_completions AS daily_completion
      SET rating = COALESCE(p_rating, v_completion.rating),
          feedback = CASE WHEN COALESCE(p_feedback, '') = '' THEN v_completion.feedback ELSE p_feedback END,
          taker_name = COALESCE(NULLIF(trim(p_taker_name), ''), v_completion.taker_name),
          updated_at = now()
      WHERE daily_completion.id = v_completion.id
      RETURNING * INTO v_completion;

      SELECT COALESCE(points, 0) INTO v_total_points
      FROM public.user_reward_balances
      WHERE user_id = v_user_id;

      RETURN QUERY SELECT
        v_completion.id,
        v_completion.quiz_id,
        v_completion.user_id,
        v_completion.taker_name,
        v_completion.score,
        v_completion.total_questions,
        v_completion.rating,
        v_completion.feedback,
        v_completion.created_at,
        0,
        0,
        COALESCE(v_total_points, 0),
        true;
      RETURN;
    END IF;

    RAISE EXCEPTION 'Daily quiz is unavailable';
  END IF;

  SELECT * INTO v_completion
  FROM public.daily_quiz_completions
  WHERE user_id = v_user_id AND daily_quiz_completions.quiz_id = p_quiz_id
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.daily_quiz_completions AS daily_completion
    SET rating = COALESCE(p_rating, v_completion.rating),
        feedback = CASE WHEN COALESCE(p_feedback, '') = '' THEN v_completion.feedback ELSE p_feedback END,
        taker_name = COALESCE(NULLIF(trim(p_taker_name), ''), v_completion.taker_name),
        updated_at = now()
    WHERE daily_completion.id = v_completion.id
    RETURNING * INTO v_completion;
  ELSE
    v_completion_id := 'daily_comp_' || extract(epoch FROM now())::bigint || '_' || substr(md5(random()::text), 1, 8);
    v_quiz_xp := 10 + (p_score * 10);
    v_points := 10 + (p_score * 2);

    IF (p_score::numeric / p_total_questions::numeric) >= 0.80 THEN
      v_points := v_points + 15;
    END IF;

    IF p_score >= p_total_questions THEN
      v_points := v_points + 30;
    END IF;

    INSERT INTO public.daily_quiz_completions (
      id, user_id, quiz_id, quiz_title, taker_name, score, total_questions, rating, feedback
    ) VALUES (
      v_completion_id,
      v_user_id,
      p_quiz_id,
      'Daily Challenge',
      COALESCE(NULLIF(trim(p_taker_name), ''), 'طالب متميز'),
      p_score,
      p_total_questions,
      p_rating,
      COALESCE(p_feedback, '')
    )
    RETURNING * INTO v_completion;

    INSERT INTO public.reward_points_ledger (
      user_id, points, event_type, event_key, reference_id, metadata
    ) VALUES (
      v_user_id,
      v_points,
      'quiz_completion',
      'quiz_completion:' || v_completion.id,
      v_completion.id,
      jsonb_build_object(
        'quiz_id', v_completion.quiz_id,
        'score', v_completion.score,
        'total_questions', v_completion.total_questions,
        'source', 'daily_quiz'
      )
    )
    ON CONFLICT (user_id, event_key) DO NOTHING;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_inserted := v_rows > 0;

    IF v_inserted THEN
      v_points_awarded := v_points;
      INSERT INTO public.user_reward_balances (user_id, points, level)
      VALUES (v_user_id, v_points, public.reward_level_for_points(v_points))
      ON CONFLICT (user_id) DO UPDATE
      SET points = public.user_reward_balances.points + v_points,
          level = public.reward_level_for_points(public.user_reward_balances.points + v_points),
          updated_at = now()
      RETURNING points INTO v_total_points;

      PERFORM set_config('app.allow_progression_update', 'on', true);
      UPDATE public.users
      SET xp = COALESCE(xp, 0) + v_quiz_xp + (v_points * 10),
          updated_at = now()
      WHERE uid::text = v_user_id;
      PERFORM set_config('app.allow_progression_update', 'off', true);
    END IF;
  END IF;

  IF NOT v_inserted THEN
    SELECT COALESCE(points, 0) INTO v_total_points
    FROM public.user_reward_balances
    WHERE user_id = v_user_id;
  END IF;

  UPDATE public.daily_quiz_user_slots
  SET quiz_payload = NULL,
      quiz_id = NULL,
      answered_at = now(),
      next_available_at = now() + refresh_interval_seconds * interval '1 second',
      refreshing = false
  WHERE user_id = v_user_id
    AND quiz_payload->>'id' = p_quiz_id;

  RETURN QUERY SELECT
    v_completion.id,
    v_completion.quiz_id,
    v_completion.user_id,
    v_completion.taker_name,
    v_completion.score,
    v_completion.total_questions,
    v_completion.rating,
    v_completion.feedback,
    v_completion.created_at,
    v_quiz_xp,
    v_points_awarded,
    COALESCE(v_total_points, 0),
    true;
END;
$function$


CREATE OR REPLACE FUNCTION public.submit_user_daily_quiz_attempt_v2(p_quiz_id text, p_taker_id text, p_taker_name text, p_answers jsonb, p_rating integer DEFAULT NULL::integer, p_feedback text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_slot public.daily_quiz_user_slots%ROWTYPE;
  v_completion public.daily_quiz_completions%ROWTYPE;
  v_bank public.daily_quiz_bank%ROWTYPE;
  v_bank_id TEXT;
  v_completion_id TEXT;
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
    AND s.bank_id IS NOT NULL
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

    v_bank_id := 'daily-bank-' || substring(p_quiz_id FROM '([0-9]{2})$');
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'question_id', p_quiz_id || '-q' || k.question_number,
      'correct_index', k.correct_index,
      'explanation_ar', k.explanation_ar,
      'explanation_en', k.explanation_en
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

  v_bank_id := v_slot.bank_id;
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
    'explanation_ar', k.explanation_ar,
    'explanation_en', k.explanation_en
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

        PERFORM set_config('app.allow_progression_update', 'on', true);
        UPDATE public.users
        SET xp = COALESCE(xp, 0) + v_quiz_xp + (v_points * 10),
            updated_at = now()
        WHERE uid::TEXT = v_user_id;
        PERFORM set_config('app.allow_progression_update', 'off', true);
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
      bank_id = NULL,
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
$function$

