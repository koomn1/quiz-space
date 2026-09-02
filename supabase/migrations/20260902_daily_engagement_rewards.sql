-- Daily engagement rewards are server-authoritative and idempotent.
-- The client may request an activity name only; points and event keys are fixed here.
CREATE OR REPLACE FUNCTION public.claim_daily_engagement_reward(p_activity TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today TEXT := to_char(now(), 'YYYY-MM-DD');
  v_points INTEGER;
  v_event_type TEXT := 'daily_engagement';
  v_event_key TEXT;
  v_reward JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  CASE p_activity
    WHEN 'notifications_opened' THEN v_points := 2;
    WHEN 'daily_notification_action' THEN v_points := 3;
    ELSE RAISE EXCEPTION 'Unsupported daily engagement activity';
  END CASE;

  v_event_key := v_event_type || ':' || p_activity || ':' || v_today;
  v_reward := public.grant_reward_points(
    v_user_id,
    v_points,
    v_event_type,
    v_event_key,
    v_today,
    jsonb_build_object('activity', p_activity, 'date', v_today)
  );

  RETURN v_reward || jsonb_build_object('activity', p_activity, 'date', v_today);
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_daily_engagement_reward(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_engagement_reward(TEXT) TO authenticated;
