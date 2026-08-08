-- Per-user daily quizzes.
-- A user's current quiz remains pinned until completion. The cooldown starts
-- only after completion, and every user has an independent slot per tier.

CREATE TABLE IF NOT EXISTS daily_quiz_user_slots (
  user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'gold', 'diamond')),
  quiz_id TEXT REFERENCES quizzes(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  next_available_at TIMESTAMPTZ,
  refreshing BOOLEAN NOT NULL DEFAULT false,
  refresh_interval_seconds INTEGER NOT NULL,
  PRIMARY KEY (user_id, tier)
);

CREATE INDEX IF NOT EXISTS idx_daily_quiz_user_slots_quiz
  ON daily_quiz_user_slots(user_id, quiz_id);

ALTER TABLE daily_quiz_user_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS daily_quiz_user_slots_select_own ON daily_quiz_user_slots;
CREATE POLICY daily_quiz_user_slots_select_own ON daily_quiz_user_slots
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE OR REPLACE FUNCTION daily_quiz_interval(p_tier TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE p_tier WHEN 'diamond' THEN 60 WHEN 'gold' THEN 3600 ELSE 86400 END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_user_daily_quiz_slot(p_user_id TEXT, p_tier TEXT)
RETURNS TABLE (
  quiz_id TEXT,
  generated_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  next_available_at TIMESTAMPTZ,
  refreshing BOOLEAN,
  refresh_interval_seconds INTEGER,
  seconds_until_refresh INTEGER
) AS $$
BEGIN
  IF auth.uid()::text <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  INSERT INTO daily_quiz_user_slots (user_id, tier, refresh_interval_seconds)
  VALUES (p_user_id, p_tier, daily_quiz_interval(p_tier))
  ON CONFLICT (user_id, tier) DO UPDATE
    SET refresh_interval_seconds = EXCLUDED.refresh_interval_seconds;
  RETURN QUERY
  SELECT s.quiz_id, s.generated_at, s.answered_at, s.next_available_at,
         s.refreshing, s.refresh_interval_seconds,
         GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(s.next_available_at, now()) - now()))::INTEGER)
    FROM daily_quiz_user_slots s
   WHERE s.user_id = p_user_id AND s.tier = p_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION claim_user_daily_quiz_refresh(p_user_id TEXT, p_tier TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  s daily_quiz_user_slots%ROWTYPE;
BEGIN
  IF auth.uid()::text <> p_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  INSERT INTO daily_quiz_user_slots (user_id, tier, refresh_interval_seconds)
  VALUES (p_user_id, p_tier, daily_quiz_interval(p_tier))
  ON CONFLICT (user_id, tier) DO NOTHING;
  SELECT * INTO s FROM daily_quiz_user_slots
   WHERE user_id = p_user_id AND tier = p_tier FOR UPDATE;
  IF s.refreshing AND (s.generated_at IS NULL OR now() - s.generated_at > interval '10 minutes') THEN
    UPDATE daily_quiz_user_slots SET refreshing = false
     WHERE user_id = p_user_id AND tier = p_tier;
    s.refreshing := false;
  END IF;
  IF s.refreshing OR s.quiz_id IS NOT NULL AND s.answered_at IS NULL THEN RETURN false; END IF;
  IF s.next_available_at IS NOT NULL AND now() < s.next_available_at THEN RETURN false; END IF;
  UPDATE daily_quiz_user_slots SET refreshing = true,
    refresh_interval_seconds = daily_quiz_interval(p_tier)
   WHERE user_id = p_user_id AND tier = p_tier;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION finalize_user_daily_quiz_refresh(p_user_id TEXT, p_tier TEXT, p_quiz_id TEXT)
RETURNS VOID AS $$
BEGIN
  IF auth.uid()::text <> p_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE daily_quiz_user_slots
     SET quiz_id = p_quiz_id, generated_at = now(), answered_at = NULL,
         next_available_at = NULL, refreshing = false
   WHERE user_id = p_user_id AND tier = p_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION release_user_daily_quiz_refresh(p_user_id TEXT, p_tier TEXT)
RETURNS VOID AS $$
BEGIN
  IF auth.uid()::text <> p_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE daily_quiz_user_slots SET refreshing = false
   WHERE user_id = p_user_id AND tier = p_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION complete_user_daily_quiz(p_user_id TEXT, p_quiz_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier TEXT;
BEGIN
  IF auth.uid()::text <> p_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT tier INTO v_tier FROM daily_quiz_user_slots
   WHERE user_id = p_user_id AND quiz_id = p_quiz_id AND answered_at IS NULL
   LIMIT 1;
  IF v_tier IS NULL THEN RETURN false; END IF;
  UPDATE daily_quiz_user_slots
     SET answered_at = now(),
         next_available_at = now() + refresh_interval_seconds * interval '1 second'
   WHERE user_id = p_user_id AND quiz_id = p_quiz_id AND tier = v_tier
     AND answered_at IS NULL;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_daily_quiz_slot(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_user_daily_quiz_refresh(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION finalize_user_daily_quiz_refresh(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION release_user_daily_quiz_refresh(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_user_daily_quiz(TEXT, TEXT) TO authenticated;
