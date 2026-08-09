-- QuizSpace: canonical per-user daily quiz RPC repair.
-- Safe to apply after the older daily-quiz migrations.

ALTER TABLE public.daily_quiz_user_slots
  ADD COLUMN IF NOT EXISTS quiz_payload JSONB;

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
  v_interval INTEGER := CASE p_tier WHEN 'diamond' THEN 60 WHEN 'gold' THEN 3600 ELSE 86400 END;
BEGIN
  IF auth.uid()::TEXT <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.daily_quiz_user_slots (user_id, tier, refresh_interval_seconds)
  VALUES (p_user_id, p_tier, v_interval)
  ON CONFLICT (user_id, tier) DO UPDATE
    SET refresh_interval_seconds = EXCLUDED.refresh_interval_seconds;

  RETURN QUERY
  SELECT s.quiz_payload->>'id', s.quiz_payload, s.generated_at, s.answered_at,
         s.next_available_at, s.refreshing, s.refresh_interval_seconds,
         CASE WHEN s.next_available_at IS NULL THEN 0
              ELSE GREATEST(0, CEIL(EXTRACT(EPOCH FROM (s.next_available_at - now())))::INTEGER)
         END
    FROM public.daily_quiz_user_slots AS s
   WHERE s.user_id = p_user_id AND s.tier = p_tier;
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
BEGIN
  IF auth.uid()::TEXT <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.daily_quiz_user_slots (user_id, tier, refresh_interval_seconds)
  VALUES (p_user_id, p_tier, CASE p_tier WHEN 'diamond' THEN 60 WHEN 'gold' THEN 3600 ELSE 86400 END)
  ON CONFLICT (user_id, tier) DO NOTHING;

  SELECT * INTO s
    FROM public.daily_quiz_user_slots
   WHERE user_id = p_user_id AND tier = p_tier
   FOR UPDATE;

  IF s.refreshing AND (s.generated_at IS NULL OR now() - s.generated_at > interval '10 minutes') THEN
    UPDATE public.daily_quiz_user_slots SET refreshing = false
     WHERE user_id = p_user_id AND tier = p_tier;
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
         refresh_interval_seconds = CASE p_tier WHEN 'diamond' THEN 60 WHEN 'gold' THEN 3600 ELSE 86400 END
   WHERE user_id = p_user_id AND tier = p_tier;
  RETURN true;
END;
$$;

DROP FUNCTION IF EXISTS public.finalize_user_daily_quiz_refresh(TEXT, TEXT, JSONB);
CREATE FUNCTION public.finalize_user_daily_quiz_refresh(
  p_user_id TEXT,
  p_tier TEXT,
  p_quiz_payload JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid()::TEXT <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.daily_quiz_user_slots
     SET quiz_id = NULL,
         quiz_payload = p_quiz_payload,
         generated_at = now(),
         answered_at = NULL,
         next_available_at = NULL,
         refreshing = false
   WHERE user_id = p_user_id AND tier = p_tier;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_daily_quiz_slot(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_user_daily_quiz_refresh(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_user_daily_quiz_refresh(TEXT, TEXT, JSONB) TO authenticated;

NOTIFY pgrst, 'reload schema';
