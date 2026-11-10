-- Derive daily challenge tier from the authenticated user's effective membership.
-- p_tier remains in the RPC signatures for client compatibility, but is never trusted.

CREATE OR REPLACE FUNCTION public.quizspace_resolve_daily_quiz_tier(p_user_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user public.users%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR auth.uid()::TEXT <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_user
  FROM public.users
  WHERE uid::TEXT = p_user_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  IF NOT public.effective_membership_active(
    v_user.is_premium, v_user.is_lifetime, v_user.is_founder, v_user.renewal_date
  ) THEN
    RETURN 'free';
  END IF;

  IF lower(coalesce(v_user.plan_name, '')) LIKE '%diamond%'
     OR lower(coalesce(v_user.plan_name, '')) LIKE '%الماسي%'
     OR lower(coalesce(v_user.plan_name, '')) LIKE '%الماسية%' THEN
    RETURN 'diamond';
  END IF;

  IF lower(coalesce(v_user.plan_name, '')) LIKE '%gold%'
     OR lower(coalesce(v_user.plan_name, '')) LIKE '%الذهبي%'
     OR lower(coalesce(v_user.plan_name, '')) LIKE '%الذهبية%' THEN
    RETURN 'gold';
  END IF;

  -- Active legacy premium accounts without a recognized label retain Gold behavior.
  RETURN 'gold';
END;
$$;

REVOKE ALL ON FUNCTION public.quizspace_resolve_daily_quiz_tier(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.quizspace_resolve_daily_quiz_tier(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_user_daily_quiz_slot(p_user_id TEXT, p_tier TEXT)
RETURNS TABLE (
  quiz_id TEXT, quiz_payload JSONB, generated_at TIMESTAMPTZ, answered_at TIMESTAMPTZ,
  next_available_at TIMESTAMPTZ, refreshing BOOLEAN, refresh_interval_seconds INTEGER,
  seconds_until_refresh INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tier TEXT := public.quizspace_resolve_daily_quiz_tier(p_user_id);
  v_interval INTEGER := public.quizspace_daily_quiz_interval(v_tier);
BEGIN
  INSERT INTO public.daily_quiz_user_slots (user_id, tier, refresh_interval_seconds)
  VALUES (p_user_id, v_tier, v_interval)
  ON CONFLICT (user_id, tier) DO UPDATE
    SET refresh_interval_seconds = EXCLUDED.refresh_interval_seconds;

  RETURN QUERY
  SELECT s.quiz_payload->>'id', s.quiz_payload, s.generated_at, s.answered_at,
         s.next_available_at, s.refreshing, s.refresh_interval_seconds,
         CASE WHEN s.next_available_at IS NULL THEN 0
              ELSE GREATEST(0, CEIL(EXTRACT(EPOCH FROM (s.next_available_at - now())))::INTEGER)
         END
  FROM public.daily_quiz_user_slots AS s
  WHERE s.user_id = p_user_id AND s.tier = v_tier;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_user_daily_quiz_refresh(p_user_id TEXT, p_tier TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  s public.daily_quiz_user_slots%ROWTYPE;
  v_tier TEXT := public.quizspace_resolve_daily_quiz_tier(p_user_id);
  v_interval INTEGER := public.quizspace_daily_quiz_interval(v_tier);
BEGIN
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

  IF s.refreshing THEN RETURN false; END IF;

  IF s.quiz_payload IS NOT NULL AND s.answered_at IS NULL THEN
    IF s.generated_at IS NULL OR now() - s.generated_at < (v_interval * interval '1 second') THEN
      RETURN false;
    END IF;
    UPDATE public.daily_quiz_user_slots
    SET quiz_id = NULL, quiz_payload = NULL, generated_at = NULL
    WHERE user_id = p_user_id AND tier = v_tier;
  END IF;

  IF s.next_available_at IS NOT NULL AND now() < s.next_available_at THEN
    RETURN false;
  END IF;

  UPDATE public.daily_quiz_user_slots
  SET refreshing = true, refresh_interval_seconds = v_interval
  WHERE user_id = p_user_id AND tier = v_tier;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_user_daily_quiz_refresh(
  p_user_id TEXT, p_tier TEXT, p_quiz_payload JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tier TEXT := public.quizspace_resolve_daily_quiz_tier(p_user_id);
  v_rows INTEGER;
BEGIN
  IF p_quiz_payload IS NULL OR jsonb_typeof(p_quiz_payload) <> 'object'
     OR jsonb_typeof(p_quiz_payload->'questions') IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_quiz_payload->'questions') NOT BETWEEN 1 AND 50
     OR coalesce(p_quiz_payload->>'id', '') !~ '^daily-[A-Za-z0-9-]{8,200}$' THEN
    RAISE EXCEPTION 'Invalid daily quiz payload';
  END IF;

  UPDATE public.daily_quiz_user_slots
  SET quiz_id = NULL,
      quiz_payload = p_quiz_payload,
      generated_at = now(),
      answered_at = NULL,
      next_available_at = NULL,
      refreshing = false,
      refresh_interval_seconds = public.quizspace_daily_quiz_interval(v_tier)
  WHERE user_id = p_user_id AND tier = v_tier AND refreshing = true;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'Daily quiz refresh was not claimed';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_user_daily_quiz_refresh(p_user_id TEXT, p_tier TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tier TEXT := public.quizspace_resolve_daily_quiz_tier(p_user_id);
BEGIN
  UPDATE public.daily_quiz_user_slots
  SET refreshing = false
  WHERE user_id = p_user_id AND tier = v_tier AND refreshing = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_legacy_daily_quiz_slot(p_user_id TEXT, p_tier TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tier TEXT := public.quizspace_resolve_daily_quiz_tier(p_user_id);
BEGIN
  UPDATE public.daily_quiz_user_slots
  SET quiz_id = NULL, quiz_payload = NULL, generated_at = NULL, answered_at = NULL,
      next_available_at = NULL, refreshing = false,
      refresh_interval_seconds = public.quizspace_daily_quiz_interval(v_tier)
  WHERE user_id = p_user_id AND tier = v_tier AND answered_at IS NULL;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_daily_quiz_slot(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_user_daily_quiz_refresh(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_user_daily_quiz_refresh(TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_user_daily_quiz_refresh(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_legacy_daily_quiz_slot(TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
