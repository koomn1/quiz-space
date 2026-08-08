-- Quiz Space: XP persistence and daily-quiz first-generation fixes.
-- Safe to run repeatedly.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0;

-- Fix the initial empty slot: a slot with no quiz must be claimable immediately,
-- even though its seeded refreshed_at is now(). Also lock the row so two tabs
-- cannot both win the generation race.
CREATE OR REPLACE FUNCTION claim_daily_quiz_refresh(p_tier TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_quiz_id TEXT;
    v_refreshed_at TIMESTAMPTZ;
    v_interval INTEGER;
    v_refreshing BOOLEAN;
BEGIN
    SELECT quiz_id, refreshed_at, refresh_interval_seconds, refreshing
      INTO v_quiz_id, v_refreshed_at, v_interval, v_refreshing
      FROM daily_quiz_slots
     WHERE tier = p_tier
     FOR UPDATE;

    IF NOT FOUND THEN
        RETURN false;
    END IF;
    -- Recover a slot left locked by a crashed browser/Worker attempt.
    IF v_refreshing AND (v_refreshed_at IS NULL OR now() - v_refreshed_at > interval '10 minutes') THEN
        UPDATE daily_quiz_slots
           SET refreshing = false
         WHERE tier = p_tier;
        v_refreshing := false;
    END IF;
    IF v_refreshing THEN
        RETURN false;
    END IF;
    IF v_quiz_id IS NULL
       OR v_refreshed_at IS NULL
       OR now() - v_refreshed_at >= v_interval * interval '1 second' THEN
        UPDATE daily_quiz_slots
           SET refreshing = true
         WHERE tier = p_tier;
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The old function counted rows in quizzes (0 or 1), not questions in the
-- JSONB payload, and never awarded XP. Replace it with an atomic first-attempt
-- award. Retakes update the completion but do not farm XP repeatedly.
-- The return shape now includes xp_awarded, so drop the old signature first;
-- PostgreSQL cannot change a function's OUT parameters with CREATE OR REPLACE.
DROP FUNCTION IF EXISTS submit_quiz_attempt(TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION submit_quiz_attempt(
    p_quiz_id TEXT,
    p_taker_id TEXT,
    p_taker_name TEXT,
    p_score INTEGER,
    p_rating INTEGER DEFAULT NULL,
    p_feedback TEXT DEFAULT ''
)
RETURNS TABLE (
    id TEXT,
    quiz_id TEXT,
    taker_id TEXT,
    taker_name TEXT,
    score INTEGER,
    total_questions INTEGER,
    rating INTEGER,
    feedback TEXT,
    created_at TIMESTAMPTZ,
    xp_awarded INTEGER
) AS $$
DECLARE
    v_completion_id TEXT;
    v_total_questions INTEGER;
    v_xp_awarded INTEGER := 0;
    v_existing_id TEXT;
    v_score INTEGER := GREATEST(0, COALESCE(p_score, 0));
BEGIN
    SELECT COALESCE(jsonb_array_length(q.questions), 0)
      INTO v_total_questions
      FROM quizzes q
     WHERE q.id = p_quiz_id;
    IF v_total_questions <= 0 THEN v_total_questions := 1; END IF;

    SELECT c.id INTO v_existing_id
      FROM completions c
     WHERE c.quiz_id = p_quiz_id AND c.taker_id = p_taker_id
     LIMIT 1
     FOR UPDATE;

    IF v_existing_id IS NULL THEN
        v_completion_id := 'comp_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 8);
        INSERT INTO completions (id, quiz_id, quiz_title, taker_id, taker_name, score, total_questions, rating, feedback)
        SELECT v_completion_id, p_quiz_id, q.title, p_taker_id, p_taker_name, v_score, v_total_questions, p_rating, COALESCE(p_feedback, '')
          FROM quizzes q WHERE q.id = p_quiz_id;
        UPDATE quizzes SET total_plays = COALESCE(total_plays, 0) + 1 WHERE id = p_quiz_id;

        -- 100 XP for a perfect quiz, with a fair 10 XP per correct answer and
        -- a 10 XP participation bonus. Keep the first-attempt award stable.
        v_xp_awarded := 10 + (v_score * 10);
        UPDATE users
           SET xp = COALESCE(xp, 0) + v_xp_awarded,
               updated_at = now()
         WHERE uid = p_taker_id;
    ELSE
        v_completion_id := v_existing_id;
        UPDATE completions
           SET score = v_score,
               total_questions = v_total_questions,
               rating = p_rating,
               feedback = COALESCE(p_feedback, '')
         WHERE id = v_existing_id;
    END IF;

    RETURN QUERY
    SELECT c.id, c.quiz_id, c.taker_id, c.taker_name, c.score, c.total_questions,
           c.rating, c.feedback, c.created_at, v_xp_awarded
      FROM completions c
     WHERE c.id = v_completion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION submit_quiz_attempt(TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_daily_quiz_refresh(TEXT) TO authenticated;
