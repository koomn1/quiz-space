-- Keep the public quiz rating summary synchronized with ratings recorded on
-- authenticated and guest quiz attempts. This migration never edits rating rows.

CREATE OR REPLACE FUNCTION public.refresh_quiz_rating_stats(p_quiz_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_average numeric;
  v_rating_count integer;
BEGIN
  IF p_quiz_id IS NULL THEN
    RETURN;
  END IF;

  -- Serialize rating changes for the same quiz before calculating the summary.
  PERFORM 1
    FROM public.quizzes
   WHERE id = p_quiz_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0), COUNT(*)::integer
    INTO v_average, v_rating_count
    FROM (
      SELECT c.rating
        FROM public.completions AS c
       WHERE c.quiz_id = p_quiz_id
         AND c.rating IS NOT NULL
      UNION ALL
      SELECT g.rating
        FROM public.guest_quiz_attempts AS g
       WHERE g.quiz_id = p_quiz_id
         AND g.rating IS NOT NULL
    ) AS quiz_ratings;

  UPDATE public.quizzes
     SET avg_rating = v_average,
         ratings_count = v_rating_count
   WHERE id = p_quiz_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_quiz_rating_stats_from_attempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_old_quiz_id text;
  v_new_quiz_id text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.refresh_quiz_rating_stats(NEW.quiz_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_quiz_rating_stats(OLD.quiz_id);
  ELSE
    v_old_quiz_id := OLD.quiz_id;
    v_new_quiz_id := NEW.quiz_id;

    IF v_old_quiz_id IS DISTINCT FROM v_new_quiz_id THEN
      -- Lock two affected quizzes in a stable order to reduce deadlock risk.
      IF v_old_quiz_id IS NULL THEN
        PERFORM public.refresh_quiz_rating_stats(v_new_quiz_id);
      ELSIF v_new_quiz_id IS NULL THEN
        PERFORM public.refresh_quiz_rating_stats(v_old_quiz_id);
      ELSIF v_old_quiz_id < v_new_quiz_id THEN
        PERFORM public.refresh_quiz_rating_stats(v_old_quiz_id);
        PERFORM public.refresh_quiz_rating_stats(v_new_quiz_id);
      ELSE
        PERFORM public.refresh_quiz_rating_stats(v_new_quiz_id);
        PERFORM public.refresh_quiz_rating_stats(v_old_quiz_id);
      END IF;
    ELSE
      PERFORM public.refresh_quiz_rating_stats(v_new_quiz_id);
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_quiz_rating_stats(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_quiz_rating_stats_from_attempt() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS completions_rating_stats_insert_delete ON public.completions;
CREATE TRIGGER completions_rating_stats_insert_delete
AFTER INSERT OR DELETE ON public.completions
FOR EACH ROW EXECUTE FUNCTION public.sync_quiz_rating_stats_from_attempt();

DROP TRIGGER IF EXISTS completions_rating_stats_update ON public.completions;
CREATE TRIGGER completions_rating_stats_update
AFTER UPDATE OF rating, quiz_id ON public.completions
FOR EACH ROW EXECUTE FUNCTION public.sync_quiz_rating_stats_from_attempt();

DROP TRIGGER IF EXISTS guest_attempts_rating_stats_insert_delete ON public.guest_quiz_attempts;
CREATE TRIGGER guest_attempts_rating_stats_insert_delete
AFTER INSERT OR DELETE ON public.guest_quiz_attempts
FOR EACH ROW EXECUTE FUNCTION public.sync_quiz_rating_stats_from_attempt();

DROP TRIGGER IF EXISTS guest_attempts_rating_stats_update ON public.guest_quiz_attempts;
CREATE TRIGGER guest_attempts_rating_stats_update
AFTER UPDATE OF rating, quiz_id ON public.guest_quiz_attempts
FOR EACH ROW EXECUTE FUNCTION public.sync_quiz_rating_stats_from_attempt();

-- Backfill only the derived summary columns. Source rating records are untouched.
DO $$
DECLARE
  quiz_row record;
BEGIN
  FOR quiz_row IN
    SELECT id FROM public.quizzes ORDER BY id
  LOOP
    PERFORM public.refresh_quiz_rating_stats(quiz_row.id);
  END LOOP;
END;
$$;
