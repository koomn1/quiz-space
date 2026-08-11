-- Weekly VIP leaderboard for Quiz Space
-- Scores are calculated from the server-side reward ledger for the current UTC week.

CREATE OR REPLACE FUNCTION public.get_weekly_vip_leaderboard(p_week_start DATE DEFAULT date_trunc('week', (now() AT TIME ZONE 'UTC')::date)::date)
RETURNS TABLE (
  leaderboard_rank BIGINT,
  user_id TEXT,
  display_name TEXT,
  photo_url TEXT,
  vip_tier TEXT,
  weekly_points INTEGER,
  is_me BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH weekly_scores AS (
    SELECT
      l.user_id,
      SUM(l.points)::INTEGER AS weekly_points
    FROM public.reward_points_ledger l
    INNER JOIN public.user_reward_balances b ON b.user_id = l.user_id
    WHERE l.created_at >= p_week_start::timestamp
      AND l.created_at < (p_week_start + 7)::timestamp
      AND b.vip_tier <> 'none'
      AND l.points > 0
    GROUP BY l.user_id
  ), ranked AS (
    SELECT
      ROW_NUMBER() OVER (ORDER BY ws.weekly_points DESC, ws.user_id ASC) AS leaderboard_rank,
      ws.user_id,
      ws.weekly_points
    FROM weekly_scores ws
  )
  SELECT
      r.leaderboard_rank,
    r.user_id,
    COALESCE(NULLIF(TRIM(u.name), ''), 'Quiz Space Player') AS display_name,
    u.photo_url,
    b.vip_tier,
    r.weekly_points,
    (r.user_id = auth.uid()::text) AS is_me
  FROM ranked r
  INNER JOIN public.users u ON u.uid = r.user_id
  INNER JOIN public.user_reward_balances b ON b.user_id = r.user_id
  WHERE r.leaderboard_rank <= 50 OR r.user_id = auth.uid()::text
  ORDER BY r.leaderboard_rank
  LIMIT 51;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.get_weekly_vip_leaderboard(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_weekly_vip_leaderboard(DATE) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMENT ON FUNCTION public.get_weekly_vip_leaderboard(DATE) IS 'Returns the top 50 VIP users by server-recorded reward points for a UTC week, plus the authenticated user if outside the top 50.';

CREATE INDEX IF NOT EXISTS reward_points_leaderboard_week_idx
  ON public.reward_points_ledger (created_at, user_id)
  WHERE points > 0;
CREATE INDEX IF NOT EXISTS reward_balances_vip_user_idx
  ON public.user_reward_balances (vip_tier, user_id)
  WHERE vip_tier <> 'none';
CREATE INDEX IF NOT EXISTS users_uid_name_idx
  ON public.users (uid, name);

-- Weekly competition policy: leaderboard scores are based on earned points only.
-- No client-provided score is accepted by the RPC.

-- The SECURITY DEFINER RPC is the only public entry point. Base tables remain protected by their existing RLS policies.
