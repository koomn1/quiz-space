-- Approve a pending subscription request atomically without allowing client-side
-- writes to protected membership columns.
CREATE OR REPLACE FUNCTION public.approve_premium_request(
  p_request_id text,
  p_user_id text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_user_id text;
  v_request_plan_name text;
  v_payment_screenshot text;
  v_request_status text;
  v_trial_duration smallint;
  v_user_is_premium boolean;
  v_user_plan_name text;
  v_user_plan_id text;
  v_plan_id text;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE uid = auth.uid()::text
      AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Administrator permission is required to approve subscriptions.'
      USING ERRCODE = '42501';
  END IF;

  SELECT user_id, plan_name, payment_screenshot, status
    INTO v_request_user_id, v_request_plan_name, v_payment_screenshot, v_request_status
  FROM public.premium_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_request_user_id IS NULL THEN
    RAISE EXCEPTION 'Subscription request was not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_request_user_id <> p_user_id THEN
    RAISE EXCEPTION 'Subscription request does not belong to the selected user.'
      USING ERRCODE = '42501';
  END IF;

  IF v_request_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Only pending subscription requests can be approved.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_payment_screenshot ~ '^TRIAL_OFFER_(7|14|30)_DAYS$' THEN
    v_trial_duration := (regexp_match(v_payment_screenshot, '^TRIAL_OFFER_(7|14|30)_DAYS$'))[1]::smallint;
  END IF;

  SELECT is_premium, plan_name, plan_id
    INTO v_user_is_premium, v_user_plan_name, v_user_plan_id
  FROM public.users
  WHERE uid = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile was not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_trial_duration IS NOT NULL
     AND v_user_is_premium = true
     AND coalesce(v_user_plan_name, '') NOT ILIKE '%تجريب%'
     AND coalesce(v_user_plan_name, '') NOT ILIKE '%trial%'
     AND coalesce(v_user_plan_id, '') NOT ILIKE '%trial%' THEN
    RAISE EXCEPTION 'A trial cannot replace an active paid subscription.'
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM set_config('app.allow_subscription_update', 'on', true);

  UPDATE public.premium_requests
  SET status = 'approved',
      reject_reason = NULL,
      updated_at = now()
  WHERE id = p_request_id;

  IF v_trial_duration IS NOT NULL THEN
    UPDATE public.users
    SET is_premium = true,
        plan_name = v_request_plan_name,
        plan_id = format('trial_%sd', v_trial_duration),
        is_lifetime = false,
        is_founder = false,
        renewal_date = now() + make_interval(days => v_trial_duration),
        updated_at = now()
    WHERE uid = p_user_id;
  ELSE
    v_plan_id := CASE
      WHEN v_request_plan_name ILIKE '%diamond%' OR v_request_plan_name ILIKE '%ماسي%' THEN 'diamond'
      WHEN v_request_plan_name ILIKE '%gold%' OR v_request_plan_name ILIKE '%ذهبي%' THEN 'gold'
      WHEN v_request_plan_name ILIKE '%silver%' OR v_request_plan_name ILIKE '%فضي%' THEN 'silver'
      ELSE coalesce(v_user_plan_id, 'gold')
    END;

    UPDATE public.users
    SET is_premium = true,
        plan_name = v_request_plan_name,
        plan_id = v_plan_id,
        is_lifetime = false,
        is_founder = v_plan_id = 'diamond',
        renewal_date = now() + interval '30 days',
        updated_at = now()
    WHERE uid = p_user_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_premium_request(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_premium_request(text, text) TO authenticated;
NOTIFY pgrst, 'reload schema';
