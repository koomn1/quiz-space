-- QuizSpace: tier-aware exclusive daily challenge rotation.
-- Free: 24 hours, Gold: 6 hours, Diamond: 1 hour.
-- The server remains the source of truth; the client only displays the timer.

CREATE OR REPLACE FUNCTION public.quizspace_daily_quiz_interval(p_tier TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(coalesce(p_tier, 'free'))
    WHEN 'diamond' THEN 3600
    WHEN 'gold' THEN 21600
    ELSE 86400
  END;
$$;

UPDATE public.daily_quiz_user_slots
   SET refresh_interval_seconds = public.quizspace_daily_quiz_interval(tier)
 WHERE refresh_interval_seconds IS DISTINCT FROM public.quizspace_daily_quiz_interval(tier);

DROP FUNCTION IF EXISTS public.get_user_daily_quiz_slot(TEXT, TEXT);
CREATE FUNCTION public.get_user_daily_quiz_slot(p_user_id TEXT, p_tier TEXT)
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
SET search_path = public
AS $$
DECLARE
  v_interval INTEGER := public.quizspace_daily_quiz_interval(p_tier);
BEGIN
  IF auth.uid()::TEXT <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.daily_quiz_user_slots (user_id, tier, refresh_interval_seconds)
  VALUES (p_user_id, lower(coalesce(p_tier, 'free')), v_interval)
  ON CONFLICT (user_id, tier) DO UPDATE
    SET refresh_interval_seconds = EXCLUDED.refresh_interval_seconds;

  RETURN QUERY
  SELECT s.quiz_payload->>'id', s.quiz_payload, s.generated_at, s.answered_at,
         s.next_available_at, s.refreshing, s.refresh_interval_seconds,
         CASE WHEN s.next_available_at IS NULL THEN 0
              ELSE GREATEST(0, CEIL(EXTRACT(EPOCH FROM (s.next_available_at - now())))::INTEGER)
         END
    FROM public.daily_quiz_user_slots AS s
   WHERE s.user_id = p_user_id AND s.tier = lower(coalesce(p_tier, 'free'));
END;
$$;

DROP FUNCTION IF EXISTS public.claim_user_daily_quiz_refresh(TEXT, TEXT);
CREATE FUNCTION public.claim_user_daily_quiz_refresh(p_user_id TEXT, p_tier TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.daily_quiz_user_slots%ROWTYPE;
  v_tier TEXT := lower(coalesce(p_tier, 'free'));
  v_interval INTEGER := public.quizspace_daily_quiz_interval(p_tier);
BEGIN
  IF auth.uid()::TEXT <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.daily_quiz_user_slots (user_id, tier, refresh_interval_seconds)
  VALUES (p_user_id, v_tier, v_interval)
  ON CONFLICT (user_id, tier) DO UPDATE
    SET refresh_interval_seconds = EXCLUDED.refresh_interval_seconds;

  SELECT * INTO s
    FROM public.daily_quiz_user_slots
   WHERE user_id = p_user_id AND tier = v_tier
   FOR UPDATE;

  IF s.refreshing AND (s.generated_at IS NULL OR now() - s.generated_at > interval '10 minutes') THEN
    UPDATE public.daily_quiz_user_slots SET refreshing = false
     WHERE user_id = p_user_id AND tier = v_tier;
    s.refreshing := false;
  END IF;

  IF s.refreshing OR (s.quiz_payload IS NOT NULL AND s.answered_at IS NULL) THEN
    RETURN false;
  END IF;
  IF s.next_available_at IS NOT NULL AND now() < s.next_available_at THEN
    RETURN false;
  END IF;

  UPDATE public.daily_quiz_user_slots
     SET refreshing = true,
         refresh_interval_seconds = v_interval
   WHERE user_id = p_user_id AND tier = v_tier;
  RETURN true;
END;
$$;

DROP FUNCTION IF EXISTS public.complete_user_daily_quiz(TEXT, TEXT);
CREATE FUNCTION public.complete_user_daily_quiz(p_user_id TEXT, p_quiz_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier TEXT;
  v_interval INTEGER;
  v_updated INTEGER;
BEGIN
  IF auth.uid()::TEXT <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT tier INTO v_tier
    FROM public.daily_quiz_user_slots
   WHERE user_id = p_user_id
     AND answered_at IS NULL
     AND (quiz_payload->>'id' = p_quiz_id OR quiz_id = p_quiz_id)
   ORDER BY generated_at DESC NULLS LAST
   LIMIT 1
   FOR UPDATE;

  IF v_tier IS NULL THEN
    RETURN FALSE;
  END IF;

  v_interval := public.quizspace_daily_quiz_interval(v_tier);
  UPDATE public.daily_quiz_user_slots
     SET quiz_id = NULL,
         quiz_payload = NULL,
         answered_at = now(),
         next_available_at = now() + (v_interval * interval '1 second'),
         refresh_interval_seconds = v_interval,
         refreshing = false
   WHERE user_id = p_user_id
     AND tier = v_tier
     AND answered_at IS NULL
     AND (quiz_payload->>'id' = p_quiz_id OR quiz_id = p_quiz_id);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.quizspace_daily_quiz_interval(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_daily_quiz_slot(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_user_daily_quiz_refresh(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_user_daily_quiz(TEXT, TEXT) TO authenticated;
NOTIFY pgrst, 'reload schema';
