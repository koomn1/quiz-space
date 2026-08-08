-- Keep daily challenges private to their user slot.
-- The quiz payload is stored only while it is unsolved; it is cleared on completion.
ALTER TABLE public.daily_quiz_user_slots
  ADD COLUMN IF NOT EXISTS quiz_payload JSONB;

DROP FUNCTION IF EXISTS public.get_user_daily_quiz_slot(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.get_user_daily_quiz_slot(p_user_id TEXT, p_tier TEXT)
RETURNS TABLE (
  quiz_id TEXT,
  quiz_payload JSONB,
  generated_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  next_available_at TIMESTAMPTZ,
  refreshing BOOLEAN,
  refresh_interval_seconds INTEGER,
  seconds_until_refresh INTEGER
) AS $$
BEGIN
  IF auth.uid()::text <> p_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  INSERT INTO public.daily_quiz_user_slots (user_id, tier, refresh_interval_seconds)
  VALUES (p_user_id, p_tier, daily_quiz_interval(p_tier))
  ON CONFLICT (user_id, tier) DO UPDATE
    SET refresh_interval_seconds = EXCLUDED.refresh_interval_seconds;
  RETURN QUERY
  SELECT s.quiz_payload->>'id', s.quiz_payload, s.generated_at, s.answered_at,
         s.next_available_at, s.refreshing, s.refresh_interval_seconds,
         GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(s.next_available_at, now()) - now()))::INTEGER)
    FROM public.daily_quiz_user_slots s
   WHERE s.user_id = p_user_id AND s.tier = p_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS public.finalize_user_daily_quiz_refresh(TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.finalize_user_daily_quiz_refresh(
  p_user_id TEXT, p_tier TEXT, p_quiz_payload JSONB
) RETURNS VOID AS $$
BEGIN
  IF auth.uid()::text <> p_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.daily_quiz_user_slots
     SET quiz_id = NULL,
         quiz_payload = p_quiz_payload,
         generated_at = now(),
         answered_at = NULL,
         next_available_at = NULL,
         refreshing = false
   WHERE user_id = p_user_id AND tier = p_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS public.complete_user_daily_quiz(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.complete_user_daily_quiz(p_user_id TEXT, p_quiz_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier TEXT;
BEGIN
  IF auth.uid()::text <> p_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT tier INTO v_tier
    FROM public.daily_quiz_user_slots
   WHERE user_id = p_user_id
     AND quiz_payload->>'id' = p_quiz_id
     AND answered_at IS NULL
   LIMIT 1;
  IF v_tier IS NULL THEN RETURN false; END IF;
  UPDATE public.daily_quiz_user_slots
     SET quiz_payload = NULL,
         quiz_id = NULL,
         answered_at = now(),
         next_available_at = now() + refresh_interval_seconds * interval '1 second'
   WHERE user_id = p_user_id AND tier = v_tier
     AND answered_at IS NULL;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_user_daily_quiz_slot(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_user_daily_quiz_refresh(TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_user_daily_quiz(TEXT, TEXT) TO authenticated;

-- Remove any old daily rows that were accidentally published as public quizzes.
DELETE FROM public.quizzes
 WHERE category IN ('يومي', 'Daily')
    OR title ILIKE '%التحدي اليومي%'
    OR title ILIKE '%Daily Challenge%';

NOTIFY pgrst, 'reload schema';
