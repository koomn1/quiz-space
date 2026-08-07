-- ============================================
-- Daily Quiz System Schema
-- ============================================

CREATE TABLE IF NOT EXISTS daily_quiz_slots (
    tier TEXT PRIMARY KEY CHECK (tier IN ('free', 'gold', 'diamond')),
    quiz_id TEXT REFERENCES quizzes(id) ON DELETE SET NULL,
    refreshing BOOLEAN DEFAULT false,
    refreshed_at TIMESTAMPTZ DEFAULT now(),
    refresh_interval_seconds INTEGER NOT NULL
);

-- Seed initial slots
INSERT INTO daily_quiz_slots (tier, refresh_interval_seconds)
VALUES 
    ('free', 86400),    -- 24 hours
    ('gold', 3600),     -- 1 hour
    ('diamond', 60)     -- 1 minute
ON CONFLICT (tier) DO NOTHING;

-- RPC: get_daily_quiz_slot
CREATE OR REPLACE FUNCTION get_daily_quiz_slot(p_tier TEXT)
RETURNS TABLE (
    quiz_id TEXT,
    refreshing BOOLEAN,
    refreshed_at TIMESTAMPTZ,
    refresh_interval_seconds INTEGER,
    seconds_until_refresh INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.quiz_id,
        s.refreshing,
        s.refreshed_at,
        s.refresh_interval_seconds,
        GREATEST(0, (s.refresh_interval_seconds - EXTRACT(EPOCH FROM (now() - s.refreshed_at)))::int) as seconds_until_refresh
    FROM daily_quiz_slots s
    WHERE s.tier = p_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: claim_daily_quiz_refresh
CREATE OR REPLACE FUNCTION claim_daily_quiz_refresh(p_tier TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_refreshed_at TIMESTAMPTZ;
    v_interval INTEGER;
    v_refreshing BOOLEAN;
BEGIN
    SELECT refreshed_at, refresh_interval_seconds, refreshing 
    INTO v_refreshed_at, v_interval, v_refreshing
    FROM daily_quiz_slots 
    WHERE tier = p_tier;

    -- Only allow claim if it's expired and not already refreshing
    IF NOT v_refreshing AND (now() - v_refreshed_at >= v_interval * interval '1 second') THEN
        UPDATE daily_quiz_slots 
        SET refreshing = true 
        WHERE tier = p_tier;
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: finalize_daily_quiz_refresh
CREATE OR REPLACE FUNCTION finalize_daily_quiz_refresh(p_tier TEXT, p_quiz_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE daily_quiz_slots 
    SET 
        quiz_id = p_quiz_id,
        refreshing = false,
        refreshed_at = now()
    WHERE tier = p_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: release_daily_quiz_refresh
CREATE OR REPLACE FUNCTION release_daily_quiz_refresh(p_tier TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE daily_quiz_slots 
    SET refreshing = false
    WHERE tier = p_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_daily_quiz_slot(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_daily_quiz_refresh(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION finalize_daily_quiz_refresh(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION release_daily_quiz_refresh(TEXT) TO authenticated;
