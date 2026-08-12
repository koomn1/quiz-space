-- Canonical admin reward grant RPC.
-- The reward schema stores all user IDs as TEXT, so this function intentionally
-- accepts a TEXT target ID and updates the canonical user_reward_balances table.

DROP FUNCTION IF EXISTS public.admin_grant_reward_points(INTEGER, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.admin_grant_reward_points(TEXT, INTEGER, TEXT, TEXT);

CREATE FUNCTION public.admin_grant_reward_points(
  p_user_id TEXT,
  p_amount INTEGER,
  p_reason TEXT DEFAULT '',
  p_currency TEXT DEFAULT 'points'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id TEXT := auth.uid()::TEXT;
  v_target_id TEXT := NULLIF(trim(p_user_id), '');
  v_new_balance INTEGER;
  v_event_key TEXT := 'admin_grant:' || gen_random_uuid()::TEXT;
BEGIN
  IF v_admin_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE uid = v_admin_id AND is_admin IS TRUE
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF v_target_id IS NULL OR length(v_target_id) > 100 OR NOT EXISTS (
    SELECT 1 FROM public.users WHERE uid = v_target_id
  ) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF p_amount IS NULL OR p_amount < 1 OR p_amount > 1000000 THEN
    RAISE EXCEPTION 'Invalid reward amount';
  END IF;

  IF p_currency NOT IN ('points', 'coins') THEN
    RAISE EXCEPTION 'Invalid reward currency';
  END IF;

  IF p_reason IS NOT NULL AND length(p_reason) > 500 THEN
    RAISE EXCEPTION 'Reward note is too long';
  END IF;

  INSERT INTO public.reward_points_ledger (
    user_id, points, event_type, event_key, reference_id, metadata
  ) VALUES (
    v_target_id,
    CASE WHEN p_currency = 'points' THEN p_amount ELSE 0 END,
    'admin_grant',
    v_event_key,
    v_admin_id,
    jsonb_build_object(
      'currency', p_currency,
      'amount', p_amount,
      'note', COALESCE(p_reason, ''),
      'admin_id', v_admin_id
    )
  );

  IF p_currency = 'points' THEN
    INSERT INTO public.user_reward_balances (user_id, points, level)
    VALUES (v_target_id, p_amount, public.reward_level_for_points(p_amount))
    ON CONFLICT (user_id) DO UPDATE
      SET points = public.user_reward_balances.points + EXCLUDED.points,
          level = public.reward_level_for_points(public.user_reward_balances.points + EXCLUDED.points),
          updated_at = now()
    RETURNING points INTO v_new_balance;
  ELSE
    INSERT INTO public.user_reward_balances (user_id, coins, level)
    VALUES (v_target_id, p_amount, public.reward_level_for_points(0))
    ON CONFLICT (user_id) DO UPDATE
      SET coins = public.user_reward_balances.coins + EXCLUDED.coins,
          updated_at = now()
    RETURNING coins INTO v_new_balance;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_target_id,
    'currency', p_currency,
    'amount_added', p_amount,
    'new_balance', v_new_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_reward_points(TEXT, INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_reward_points(TEXT, INTEGER, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
