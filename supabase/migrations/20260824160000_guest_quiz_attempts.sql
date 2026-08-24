-- Anonymous quiz attempts are stored separately from authenticated user profiles.
-- They contribute to public play counts and leaderboards, but never receive XP.
CREATE TABLE IF NOT EXISTS public.guest_quiz_attempts (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  guest_id TEXT NOT NULL CHECK (guest_id ~ '^user-guest-[A-HJ-NP-Z2-9]{6}$'),
  guest_name TEXT NOT NULL CHECK (char_length(trim(guest_name)) BETWEEN 1 AND 120),
  score INTEGER NOT NULL CHECK (score >= 0),
  total_questions INTEGER NOT NULL CHECK (total_questions > 0),
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  feedback TEXT NOT NULL DEFAULT '' CHECK (char_length(feedback) <= 2000),
  attempt_number INTEGER NOT NULL DEFAULT 1 CHECK (attempt_number > 0),
  is_best BOOLEAN NOT NULL DEFAULT false,
  client_attempt_key TEXT NOT NULL CHECK (char_length(client_attempt_key) BETWEEN 16 AND 120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (guest_id, quiz_id, client_attempt_key)
);
CREATE INDEX IF NOT EXISTS guest_quiz_attempts_quiz_idx ON public.guest_quiz_attempts (quiz_id, created_at DESC);
CREATE INDEX IF NOT EXISTS guest_quiz_attempts_guest_quiz_idx ON public.guest_quiz_attempts (guest_id, quiz_id, attempt_number DESC);
ALTER TABLE public.guest_quiz_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS guest_quiz_attempts_direct_read ON public.guest_quiz_attempts;
DROP POLICY IF EXISTS guest_quiz_attempts_direct_insert ON public.guest_quiz_attempts;
DROP POLICY IF EXISTS guest_quiz_attempts_direct_update ON public.guest_quiz_attempts;
DROP POLICY IF EXISTS guest_quiz_attempts_direct_delete ON public.guest_quiz_attempts;

CREATE OR REPLACE FUNCTION public.sync_quiz_total_plays()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_quiz_id TEXT := COALESCE(NEW.quiz_id, OLD.quiz_id);
BEGIN
  UPDATE public.quizzes SET total_plays =
    (SELECT COUNT(*)::INTEGER FROM public.completions WHERE quiz_id = target_quiz_id) +
    (SELECT COUNT(*)::INTEGER FROM public.guest_quiz_attempts WHERE quiz_id = target_quiz_id)
  WHERE id = target_quiz_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS guest_quiz_attempts_sync_quiz_total_plays ON public.guest_quiz_attempts;
CREATE TRIGGER guest_quiz_attempts_sync_quiz_total_plays
AFTER INSERT OR DELETE ON public.guest_quiz_attempts FOR EACH ROW EXECUTE FUNCTION public.sync_quiz_total_plays();

CREATE OR REPLACE FUNCTION public.submit_guest_quiz_attempt(
  p_quiz_id TEXT, p_guest_id TEXT, p_guest_name TEXT, p_score INTEGER,
  p_client_attempt_key TEXT, p_rating INTEGER DEFAULT NULL, p_feedback TEXT DEFAULT ''
)
RETURNS TABLE(id TEXT, quiz_id TEXT, taker_id TEXT, taker_name TEXT, score INTEGER,
              total_questions INTEGER, rating INTEGER, feedback TEXT, created_at TIMESTAMPTZ,
              attempt_number INTEGER, is_best BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id TEXT;
  v_total_questions INTEGER;
  v_attempt_number INTEGER;
  v_previous_best INTEGER;
  v_score INTEGER := COALESCE(p_score, -1);
  v_inserted BOOLEAN := false;
  v_name TEXT := trim(COALESCE(p_guest_name, ''));
BEGIN
  IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Guest submission requires an anonymous session'; END IF;
  IF p_quiz_id IS NULL OR char_length(trim(p_quiz_id)) = 0 OR char_length(p_quiz_id) > 200 THEN RAISE EXCEPTION 'Invalid quiz'; END IF;
  IF p_guest_id IS NULL OR p_guest_id !~ '^user-guest-[A-HJ-NP-Z2-9]{6}$' THEN RAISE EXCEPTION 'Invalid guest identity'; END IF;
  IF char_length(v_name) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Invalid guest name'; END IF;
  IF p_client_attempt_key IS NULL OR char_length(p_client_attempt_key) NOT BETWEEN 16 AND 120 THEN RAISE EXCEPTION 'Invalid attempt key'; END IF;
  IF p_rating IS NOT NULL AND (p_rating < 1 OR p_rating > 5) THEN RAISE EXCEPTION 'Invalid rating'; END IF;
  IF char_length(COALESCE(p_feedback, '')) > 2000 THEN RAISE EXCEPTION 'Feedback is too long'; END IF;
  SELECT COALESCE(jsonb_array_length(q.questions), 0) INTO v_total_questions
    FROM public.quizzes q WHERE q.id = p_quiz_id FOR SHARE;
  IF NOT FOUND OR v_total_questions <= 0 THEN RAISE EXCEPTION 'Quiz not found'; END IF;
  IF v_score < 0 OR v_score > v_total_questions THEN RAISE EXCEPTION 'Invalid score'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_guest_id || ':' || p_quiz_id, 0));
  SELECT g.id INTO v_id FROM public.guest_quiz_attempts g
   WHERE g.guest_id = p_guest_id AND g.quiz_id = p_quiz_id AND g.client_attempt_key = p_client_attempt_key LIMIT 1;
  IF v_id IS NULL THEN
    SELECT COUNT(*)::INTEGER, COALESCE(MAX(g.score), 0) INTO v_attempt_number, v_previous_best
      FROM public.guest_quiz_attempts g WHERE g.quiz_id = p_quiz_id AND g.guest_id = p_guest_id;
    v_attempt_number := v_attempt_number + 1;
    v_id := 'guestcomp_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 10);
    INSERT INTO public.guest_quiz_attempts
      (id, quiz_id, guest_id, guest_name, score, total_questions, rating, feedback, attempt_number, is_best, client_attempt_key)
    VALUES
      (v_id, p_quiz_id, p_guest_id, v_name, v_score, v_total_questions, p_rating, COALESCE(p_feedback, ''),
       v_attempt_number, (v_attempt_number = 1 OR v_score > v_previous_best), p_client_attempt_key);
    v_inserted := true;
  ELSE
    UPDATE public.guest_quiz_attempts AS existing_attempt
       SET rating = COALESCE(p_rating, existing_attempt.rating),
           feedback = CASE WHEN char_length(COALESCE(p_feedback, '')) > 0 THEN p_feedback ELSE existing_attempt.feedback END,
           guest_name = v_name
     WHERE existing_attempt.id = v_id;
  END IF;
  IF v_inserted THEN
    UPDATE public.guest_quiz_attempts current_attempt SET is_best = false
     WHERE current_attempt.quiz_id = p_quiz_id AND current_attempt.guest_id = p_guest_id AND current_attempt.id <> v_id
       AND current_attempt.score < (SELECT new_attempt.score FROM public.guest_quiz_attempts new_attempt WHERE new_attempt.id = v_id);
  END IF;
  RETURN QUERY SELECT g.id, g.quiz_id, g.guest_id, g.guest_name, g.score, g.total_questions,
    g.rating, g.feedback, g.created_at, g.attempt_number, g.is_best
    FROM public.guest_quiz_attempts g WHERE g.id = v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_guest_quiz_attempt_review(
  p_completion_id TEXT, p_guest_id TEXT, p_rating INTEGER, p_feedback TEXT DEFAULT ''
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Guest review requires an anonymous session'; END IF;
  IF p_completion_id IS NULL OR p_guest_id IS NULL OR p_guest_id !~ '^user-guest-[A-HJ-NP-Z2-9]{6}$' THEN RAISE EXCEPTION 'Invalid guest identity'; END IF;
  IF p_rating < 1 OR p_rating > 5 OR char_length(COALESCE(p_feedback, '')) > 2000 THEN RAISE EXCEPTION 'Invalid review'; END IF;
  UPDATE public.guest_quiz_attempts SET rating = p_rating, feedback = COALESCE(p_feedback, '')
   WHERE id = p_completion_id AND guest_id = p_guest_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_completions_by_quiz(p_quiz_id TEXT)
RETURNS TABLE(id TEXT, quiz_id TEXT, quiz_title TEXT, taker_id TEXT, taker_name TEXT, score INTEGER,
              total_questions INTEGER, rating INTEGER, created_at TIMESTAMPTZ, attempt_number INTEGER, is_best BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.quiz_id, c.quiz_title, c.taker_id, c.taker_name, c.score, c.total_questions, c.rating, c.created_at, c.attempt_number, c.is_best
    FROM public.completions c WHERE c.quiz_id = p_quiz_id
  UNION ALL
  SELECT g.id, g.quiz_id, q.title, g.guest_id, g.guest_name, g.score, g.total_questions, g.rating, g.created_at, g.attempt_number, g.is_best
    FROM public.guest_quiz_attempts g JOIN public.quizzes q ON q.id = g.quiz_id WHERE g.quiz_id = p_quiz_id
  ORDER BY created_at DESC LIMIT 500;
$$;

CREATE OR REPLACE FUNCTION public.get_public_recent_completions(p_limit INTEGER DEFAULT 10)
RETURNS TABLE(id TEXT, quiz_id TEXT, quiz_title TEXT, taker_id TEXT, taker_name TEXT, score INTEGER,
              total_questions INTEGER, rating INTEGER, created_at TIMESTAMPTZ, attempt_number INTEGER, is_best BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT x.id, x.quiz_id, x.quiz_title, x.taker_id, x.taker_name, x.score, x.total_questions, x.rating, x.created_at, x.attempt_number, x.is_best
    FROM (
      SELECT c.id, c.quiz_id, c.quiz_title, c.taker_id, c.taker_name, c.score, c.total_questions, c.rating, c.created_at, c.attempt_number, c.is_best FROM public.completions c
      UNION ALL
      SELECT g.id, g.quiz_id, q.title, g.guest_id, g.guest_name, g.score, g.total_questions, g.rating, g.created_at, g.attempt_number, g.is_best FROM public.guest_quiz_attempts g JOIN public.quizzes q ON q.id = g.quiz_id
    ) x ORDER BY x.created_at DESC LIMIT LEAST(50, GREATEST(1, COALESCE(p_limit, 10)));
$$;

CREATE OR REPLACE FUNCTION public.get_public_best_score(p_quiz_id TEXT)
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT GREATEST(COALESCE((SELECT MAX(c.score) FROM public.completions c WHERE c.quiz_id = p_quiz_id), 0), COALESCE((SELECT MAX(g.score) FROM public.guest_quiz_attempts g WHERE g.quiz_id = p_quiz_id), 0))::INTEGER;
$$;

CREATE OR REPLACE FUNCTION public.get_quiz_takers_unique(p_quiz_id TEXT)
RETURNS TABLE(taker_id TEXT, taker_name TEXT, best_score INTEGER, total_questions INTEGER, attempts_count INTEGER, last_attempt_at TIMESTAMPTZ, rating INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT x.taker_id, x.taker_name, MAX(x.score)::INTEGER, MAX(x.total_questions)::INTEGER, COUNT(*)::INTEGER, MAX(x.created_at),
         (ARRAY_AGG(x.rating ORDER BY x.created_at DESC) FILTER (WHERE x.rating IS NOT NULL))[1]
    FROM (
      SELECT c.taker_id, c.taker_name, c.score, c.total_questions, c.created_at, c.rating FROM public.completions c WHERE c.quiz_id = p_quiz_id
      UNION ALL
      SELECT g.guest_id, g.guest_name, g.score, g.total_questions, g.created_at, g.rating FROM public.guest_quiz_attempts g WHERE g.quiz_id = p_quiz_id
    ) x GROUP BY x.taker_id, x.taker_name;
$$;

CREATE OR REPLACE FUNCTION public.get_site_stats()
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'total_quizzes', (SELECT COUNT(*) FROM public.quizzes),
    'total_completions', (SELECT COUNT(*) FROM public.completions) + (SELECT COUNT(*) FROM public.guest_quiz_attempts),
    'total_users', (SELECT COUNT(*) FROM public.users),
    'quizzes_today', (SELECT COUNT(*) FROM public.quizzes WHERE created_at::date = CURRENT_DATE),
    'completions_today', (SELECT COUNT(*) FROM public.completions WHERE created_at::date = CURRENT_DATE) + (SELECT COUNT(*) FROM public.guest_quiz_attempts WHERE created_at::date = CURRENT_DATE),
    'top_quiz_today', COALESCE((SELECT jsonb_build_object('id', id, 'title', title, 'plays', total_plays) FROM public.quizzes ORDER BY total_plays DESC LIMIT 1), 'null'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.submit_guest_quiz_attempt(text, text, text, integer, text, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_guest_quiz_attempt_review(text, text, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_completions_by_quiz(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_recent_completions(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_best_score(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_quiz_takers_unique(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_site_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_guest_quiz_attempt(text, text, text, integer, text, integer, text) TO anon;
GRANT EXECUTE ON FUNCTION public.update_guest_quiz_attempt_review(text, text, integer, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_completions_by_quiz(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_recent_completions(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_best_score(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_quiz_takers_unique(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_site_stats() TO anon, authenticated;

UPDATE public.quizzes q SET total_plays =
  (SELECT COUNT(*)::INTEGER FROM public.completions c WHERE c.quiz_id = q.id) +
  (SELECT COUNT(*)::INTEGER FROM public.guest_quiz_attempts g WHERE g.quiz_id = q.id);
NOTIFY pgrst, 'reload schema';
