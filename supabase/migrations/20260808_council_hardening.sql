-- Council hardening: make the durable database state authoritative.
-- Apply after the existing daily/coupon/XP migrations.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0;

-- Rebuild XP from one completion per quiz. This is idempotent and does not
-- depend on the possibly corrupted users.xp value.
CREATE OR REPLACE FUNCTION public.rebuild_user_xp_from_completions(p_user_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_xp INTEGER;
BEGIN
  IF auth.uid()::text <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COALESCE(SUM(10 + GREATEST(0, COALESCE(c.score, 0)) * 10), 0)::INTEGER
    INTO v_xp
    FROM public.completions c
   WHERE c.taker_id = p_user_id
     AND c.id IN (
       SELECT DISTINCT ON (c2.quiz_id) c2.id
         FROM public.completions c2
        WHERE c2.taker_id = p_user_id
        ORDER BY c2.quiz_id, c2.created_at ASC, c2.id ASC
     );

  UPDATE public.users
     SET xp = v_xp, updated_at = now()
   WHERE uid = p_user_id;

  RETURN v_xp;
END;
$$;
GRANT EXECUTE ON FUNCTION public.rebuild_user_xp_from_completions(TEXT) TO authenticated;

-- Any solved private daily slot must never expose its old payload again.
UPDATE public.daily_quiz_user_slots s
   SET quiz_payload = NULL,
       quiz_id = NULL,
       refreshing = false
 WHERE s.answered_at IS NOT NULL;

-- Legacy rows created before private payloads were introduced are not valid
-- daily challenges anymore. Clear their public quiz reference so the next
-- claim generates a fresh private challenge.
UPDATE public.daily_quiz_user_slots
   SET quiz_id = NULL,
       refreshing = false
 WHERE quiz_payload IS NULL
   AND answered_at IS NULL
   AND quiz_id IS NOT NULL;

-- Reconcile slots whose payload was solved before the atomic RPC existed.
UPDATE public.daily_quiz_user_slots s
   SET quiz_payload = NULL,
       quiz_id = NULL,
       answered_at = COALESCE(s.answered_at, c.created_at),
       next_available_at = COALESCE(s.next_available_at,
         c.created_at + s.refresh_interval_seconds * interval '1 second'),
       refreshing = false
  FROM public.completions c
 WHERE s.user_id = c.taker_id
   AND s.quiz_payload->>'id' = c.quiz_id
   AND s.answered_at IS NULL;

-- Ensure the latest daily read repairs a stale solved payload before returning.
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
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_interval INTEGER := CASE p_tier WHEN 'diamond' THEN 60 WHEN 'gold' THEN 3600 ELSE 86400 END;
BEGIN
  IF auth.uid()::text <> p_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;

  INSERT INTO public.daily_quiz_user_slots(user_id, tier, refresh_interval_seconds)
  VALUES (p_user_id, p_tier, v_interval)
  ON CONFLICT (user_id, tier) DO UPDATE
    SET refresh_interval_seconds = EXCLUDED.refresh_interval_seconds;

  UPDATE public.daily_quiz_user_slots s
     SET quiz_payload = NULL,
         quiz_id = NULL,
         answered_at = COALESCE(s.answered_at, c.created_at),
         next_available_at = COALESCE(s.next_available_at,
           c.created_at + s.refresh_interval_seconds * interval '1 second'),
         refreshing = false
    FROM public.completions c
   WHERE s.user_id = p_user_id
     AND s.tier = p_tier
     AND s.answered_at IS NULL
     AND s.quiz_payload->>'id' = c.quiz_id
     AND c.taker_id = p_user_id;

  RETURN QUERY
  SELECT s.quiz_payload->>'id', s.quiz_payload, s.generated_at, s.answered_at,
         s.next_available_at, s.refreshing, s.refresh_interval_seconds,
         CASE WHEN s.next_available_at IS NULL THEN 0
              ELSE GREATEST(0, CEIL(EXTRACT(EPOCH FROM (s.next_available_at - now())))::INTEGER)
         END
    FROM public.daily_quiz_user_slots s
   WHERE s.user_id = p_user_id AND s.tier = p_tier;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_user_daily_quiz_slot(TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.reset_legacy_daily_quiz_slot(p_user_id TEXT, p_tier TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid()::text <> p_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.daily_quiz_user_slots
     SET quiz_id = NULL, refreshing = false
   WHERE user_id = p_user_id
     AND tier = p_tier
     AND quiz_payload IS NULL
     AND answered_at IS NULL;
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.reset_legacy_daily_quiz_slot(TEXT, TEXT) TO authenticated;
NOTIFY pgrst, 'reload schema';
