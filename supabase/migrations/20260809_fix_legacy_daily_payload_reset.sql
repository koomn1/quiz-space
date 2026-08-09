CREATE OR REPLACE FUNCTION public.reset_legacy_daily_quiz_slot(p_user_id text, p_tier text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid()::text <> p_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.daily_quiz_user_slots
     SET quiz_id = NULL,
         quiz_payload = NULL,
         generated_at = NULL,
         answered_at = NULL,
         next_available_at = NULL,
         refreshing = false,
         refresh_interval_seconds = CASE p_tier WHEN 'diamond' THEN 60 WHEN 'gold' THEN 3600 ELSE 86400 END
   WHERE user_id = p_user_id
     AND tier = p_tier
     AND answered_at IS NULL;
  RETURN FOUND;
END;
$function$;

-- Clear unanswered payloads from the old Date.now()-based ID format.
UPDATE public.daily_quiz_user_slots
SET quiz_id = NULL,
    quiz_payload = NULL,
    generated_at = NULL,
    next_available_at = NULL,
    refreshing = false
WHERE answered_at IS NULL
  AND (quiz_payload->>'id') ~ '^daily-.+-[0-9]{10,}-[0-9]+$';

NOTIFY pgrst, 'reload schema';
