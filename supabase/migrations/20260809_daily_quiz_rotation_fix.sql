-- Ensure a completed daily quiz can never remain visible as the active slot.
-- The next slot is generated only after the tier-specific cooldown.

DROP FUNCTION IF EXISTS public.complete_user_daily_quiz(TEXT, TEXT);
CREATE FUNCTION public.complete_user_daily_quiz(
  p_user_id TEXT,
  p_quiz_id TEXT
)
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

  SELECT tier
    INTO v_tier
    FROM public.daily_quiz_user_slots
   WHERE user_id = p_user_id
     AND answered_at IS NULL
     AND (
       quiz_payload->>'id' = p_quiz_id
       OR quiz_id = p_quiz_id
     )
   ORDER BY generated_at DESC NULLS LAST
   LIMIT 1
   FOR UPDATE;

  IF v_tier IS NULL THEN
    RETURN FALSE;
  END IF;

  v_interval := CASE v_tier
    WHEN 'diamond' THEN 60
    WHEN 'gold' THEN 3600
    ELSE 86400
  END;

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
     AND (
       quiz_payload->>'id' = p_quiz_id
       OR quiz_id = p_quiz_id
     );

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_user_daily_quiz(TEXT, TEXT) TO authenticated;
NOTIFY pgrst, 'reload schema';
