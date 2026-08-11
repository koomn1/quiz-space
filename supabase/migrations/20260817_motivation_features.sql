-- =====================================================
-- Motivation Features — Free Limited Engagement System
-- Created: Aug 15, 2026
-- Features: Lucky Spin, Streak, Leaderboard, Mystery Box,
--           Brain Challenge, Referral, AI Quiz, Weekly Achievement,
--           Happy Hour, Group Challenge
-- =====================================================

-- 1. User Streaks Table
CREATE TABLE IF NOT EXISTS user_streaks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_login_date TEXT NOT NULL,
  streak_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Lucky Spin Claims
CREATE TABLE IF NOT EXISTS lucky_spin_claims (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  claimed_date TEXT NOT NULL,
  points_won INTEGER NOT NULL,
  reward_type TEXT DEFAULT 'points',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Mystery Box Claims
CREATE TABLE IF NOT EXISTS mystery_box_claims (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  claimed_date TEXT NOT NULL,
  reward_type TEXT NOT NULL DEFAULT 'points',
  reward_value INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Brain Challenge Attempts
CREATE TABLE IF NOT EXISTS brain_challenge_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  challenge_date TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer_submitted TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  points_earned INTEGER DEFAULT 0,
  attempt_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Referrals
CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  referrer_id TEXT NOT NULL,
  referred_user_id TEXT NOT NULL UNIQUE,
  referral_date TEXT NOT NULL,
  points_awarded INTEGER DEFAULT 50,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Weekly Achievements
CREATE TABLE IF NOT EXISTS weekly_achievements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  week_start TEXT NOT NULL,
  achievement_type TEXT NOT NULL,
  target_count INTEGER DEFAULT 5,
  current_count INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  badge_earned TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Happy Hour Config
CREATE TABLE IF NOT EXISTS happy_hour_config (
  id TEXT PRIMARY KEY,
  start_hour INTEGER DEFAULT 18,
  end_hour INTEGER DEFAULT 20,
  multiplier FLOAT DEFAULT 2.0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Group Challenges
CREATE TABLE IF NOT EXISTS group_challenges (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_quizzes INTEGER DEFAULT 50,
  current_quizzes INTEGER DEFAULT 0,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  reward_points INTEGER DEFAULT 100,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Group Challenge Progress
CREATE TABLE IF NOT EXISTS group_challenge_progress (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  quiz_completed_id TEXT,
  contributed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all new tables
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lucky_spin_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE mystery_box_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_challenge_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE happy_hour_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_challenge_progress ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies
-- =====================================================

-- User Streaks
CREATE POLICY "Users can read own streak" ON user_streaks FOR SELECT
  USING (user_id = auth.uid()::TEXT);
CREATE POLICY "Users can update own streak" ON user_streaks FOR UPDATE
  USING (user_id = auth.uid()::TEXT);
CREATE POLICY "Users can insert own streak" ON user_streaks FOR INSERT
  WITH CHECK (user_id = auth.uid()::TEXT);

-- Lucky Spin
CREATE POLICY "Users can read own spins" ON lucky_spin_claims FOR SELECT
  USING (user_id = auth.uid()::TEXT);
CREATE POLICY "Users can insert own spin" ON lucky_spin_claims FOR INSERT
  WITH CHECK (user_id = auth.uid()::TEXT);

-- Mystery Box
CREATE POLICY "Users can read own boxes" ON mystery_box_claims FOR SELECT
  USING (user_id = auth.uid()::TEXT);
CREATE POLICY "Users can insert own box" ON mystery_box_claims FOR INSERT
  WITH CHECK (user_id = auth.uid()::TEXT);

-- Brain Challenge
CREATE POLICY "Users can read own attempts" ON brain_challenge_attempts FOR SELECT
  USING (user_id = auth.uid()::TEXT);
CREATE POLICY "Users can insert own attempts" ON brain_challenge_attempts FOR INSERT
  WITH CHECK (user_id = auth.uid()::TEXT);

-- Referrals
CREATE POLICY "Users can read own referrals" ON referrals FOR SELECT
  USING (referrer_id = auth.uid()::TEXT);
CREATE POLICY "Users can insert own referral" ON referrals FOR INSERT
  WITH CHECK (referrer_id = auth.uid()::TEXT);

-- Weekly Achievements
CREATE POLICY "Users can read own achievements" ON weekly_achievements FOR SELECT
  USING (user_id = auth.uid()::TEXT);
CREATE POLICY "Users can update own achievements" ON weekly_achievements FOR UPDATE
  USING (user_id = auth.uid()::TEXT);
CREATE POLICY "Users can insert own achievements" ON weekly_achievements FOR INSERT
  WITH CHECK (user_id = auth.uid()::TEXT);

-- Happy Hour Config (read-only for all)
CREATE POLICY "Anyone can read happy hour config" ON happy_hour_config FOR SELECT
  USING (TRUE);

-- Group Challenges
CREATE POLICY "Class members can read challenges" ON group_challenges FOR SELECT
  USING (TRUE);
CREATE POLICY "Teachers can insert challenges" ON group_challenges FOR INSERT
  WITH CHECK (created_by = auth.uid()::TEXT);
CREATE POLICY "Teachers can update own challenges" ON group_challenges FOR UPDATE
  USING (created_by = auth.uid()::TEXT);

-- Group Challenge Progress
CREATE POLICY "Users can read progress" ON group_challenge_progress FOR SELECT
  USING (TRUE);
CREATE POLICY "Users can insert own progress" ON group_challenge_progress FOR INSERT
  WITH CHECK (user_id = auth.uid()::TEXT);

-- =====================================================
-- RPC Functions
-- =====================================================

-- Update daily streak
CREATE OR REPLACE FUNCTION update_daily_streak()
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_today TEXT := TO_CHAR(NOW(), 'YYYY-MM-DD');
  v_yesterday TEXT := TO_CHAR(NOW() - INTERVAL '1 day', 'YYYY-MM-DD');
  v_streak user_streaks%ROWTYPE;
  v_points INTEGER := 0;
BEGIN
  SELECT * INTO v_streak FROM user_streaks WHERE user_id = v_user_id;

  IF v_streak IS NULL THEN
    INSERT INTO user_streaks (id, user_id, current_streak, longest_streak, last_login_date, streak_points)
    VALUES (gen_random_uuid(), v_user_id, 1, 1, v_today, 5);
    RETURN jsonb_build_object('success', TRUE, 'streak', 1, 'points', 5, 'message', 'First day! +5 points');
  END IF;

  IF v_streak.last_login_date = v_today THEN
    RETURN jsonb_build_object('success', TRUE, 'streak', v_streak.current_streak, 'points', 0, 'message', 'Already checked in today');
  END IF;

  IF v_streak.last_login_date = v_yesterday THEN
    v_streak.current_streak := v_streak.current_streak + 1;
    v_points := CASE
      WHEN v_streak.current_streak >= 30 THEN 200
      WHEN v_streak.current_streak >= 14 THEN 100
      WHEN v_streak.current_streak >= 7 THEN 50
      WHEN v_streak.current_streak >= 3 THEN 20
      ELSE 5
    END;
  ELSE
    v_streak.current_streak := 1;
    v_points := 5;
  END IF;

  v_streak.longest_streak := GREATEST(v_streak.longest_streak, v_streak.current_streak);
  v_streak.last_login_date := v_today;
  v_streak.streak_points := v_streak.streak_points + v_points;

  UPDATE user_streaks SET
    current_streak = v_streak.current_streak,
    longest_streak = v_streak.longest_streak,
    last_login_date = v_today,
    streak_points = v_streak.streak_points,
    updated_at = NOW()
  WHERE user_id = v_user_id;

  -- Add points to balance
  INSERT INTO user_balances (id, user_id, points, coins)
  VALUES (gen_random_uuid(), v_user_id, v_points, 0)
  ON CONFLICT (user_id) DO UPDATE SET points = user_balances.points + v_points;

  RETURN jsonb_build_object('success', TRUE, 'streak', v_streak.current_streak, 'points', v_points, 'message', 'Streak day ' || v_streak.current_streak || '! +' || v_points || ' points');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Lucky Spin
CREATE OR REPLACE FUNCTION claim_lucky_spin()
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_today TEXT := TO_CHAR(NOW(), 'YYYY-MM-DD');
  v_already BOOLEAN;
  v_points INTEGER;
  v_rewards INTEGER[] := ARRAY[1, 2, 3, 5, 10, 15, 20, 25, 30, 50];
  v_idx INTEGER;
BEGIN
  SELECT COUNT(*) > 0 INTO v_already FROM lucky_spin_claims WHERE user_id = v_user_id AND claimed_date = v_today;
  IF v_already THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Already spun today! Come back tomorrow');
  END IF;

  v_idx := floor(random() * 10)::INTEGER + 1;
  v_points := v_rewards[v_idx];

  INSERT INTO lucky_spin_claims (id, user_id, claimed_date, points_won, reward_type)
  VALUES (gen_random_uuid(), v_user_id, v_today, v_points, 'points');

  INSERT INTO user_balances (id, user_id, points, coins)
  VALUES (gen_random_uuid(), v_user_id, v_points, 0)
  ON CONFLICT (user_id) DO UPDATE SET points = user_balances.points + v_points;

  RETURN jsonb_build_object('success', TRUE, 'points', v_points, 'message', '🎉 You won ' || v_points || ' points!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mystery Box (every 3 days)
CREATE OR REPLACE FUNCTION claim_mystery_box()
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_today TEXT := TO_CHAR(NOW(), 'YYYY-MM-DD');
  v_last_claim TEXT;
  v_days_since INTEGER;
  v_reward_type TEXT;
  v_reward_value INTEGER;
  v_rand FLOAT;
BEGIN
  SELECT claimed_date INTO v_last_claim FROM mystery_box_claims
  WHERE user_id = v_user_id ORDER BY claimed_date DESC LIMIT 1;

  IF v_last_claim IS NOT NULL THEN
    v_days_since := (v_today::DATE - v_last_claim::DATE);
    IF v_days_since < 3 THEN
      RETURN jsonb_build_object('success', FALSE, 'days_remaining', 3 - v_days_since, 'message', 'Come back in ' || (3 - v_days_since) || ' days!');
    END IF;
  END IF;

  v_rand := random();
  IF v_rand < 0.4 THEN
    v_reward_type := 'points';
    v_reward_value := floor(random() * 40 + 10)::INTEGER;
  ELSIF v_rand < 0.7 THEN
    v_reward_type := 'coins';
    v_reward_value := floor(random() * 20 + 5)::INTEGER;
  ELSIF v_rand < 0.9 THEN
    v_reward_type := 'vip_day';
    v_reward_value := 1;
  ELSE
    v_reward_type := 'points';
    v_reward_value := 100;
  END IF;

  INSERT INTO mystery_box_claims (id, user_id, claimed_date, reward_type, reward_value)
  VALUES (gen_random_uuid(), v_user_id, v_today, v_reward_type, v_reward_value);

  IF v_reward_type = 'points' THEN
    INSERT INTO user_balances (id, user_id, points, coins)
    VALUES (gen_random_uuid(), v_user_id, v_reward_value, 0)
    ON CONFLICT (user_id) DO UPDATE SET points = user_balances.points + v_reward_value;
  ELSIF v_reward_type = 'coins' THEN
    INSERT INTO user_balances (id, user_id, points, coins)
    VALUES (gen_random_uuid(), v_user_id, 0, v_reward_value)
    ON CONFLICT (user_id) DO UPDATE SET coins = user_balances.coins + v_reward_value;
  END IF;

  RETURN jsonb_build_object('success', TRUE, 'reward_type', v_reward_type, 'reward_value', v_reward_value, 'message', '🎁 Mystery Box: ' || v_reward_value || ' ' || v_reward_type);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Brain Challenge
CREATE OR REPLACE FUNCTION submit_brain_challenge(p_answer TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_today TEXT := TO_CHAR(NOW(), 'YYYY-MM-DD');
  v_correct_answer TEXT;
  v_is_correct BOOLEAN;
  v_attempts INTEGER;
  v_points INTEGER := 0;
  v_questions TEXT[] := ARRAY[
    'ما هو الجذر التربيعي لـ 144؟',
    'كم عدد أضلاع المثلث؟',
    'ما هو ناتج 7 × 8؟',
    'ما هو اللون الناتج من مزج الأحمر والأزرق؟',
    'كم ساعة في اليوم؟',
    'ما هو عكس كلمة ''سريع''؟',
    'كم صفر في المليون؟',
    'ما هو الحيوان الوطني لمصر؟'
  ];
  v_answers TEXT[] := ARRAY['12', '3', '56', 'أرجواني', '24', 'بطيء', '6', 'النسر'];
  v_q_idx INTEGER;
  v_day_num INTEGER;
BEGIN
  -- Pick question based on day of year
  v_day_num := EXTRACT(DOY FROM NOW())::INTEGER;
  v_q_idx := MOD(v_day_num - 1, 8) + 1;
  v_correct_answer := v_answers[v_q_idx];

  SELECT COUNT(*) INTO v_attempts FROM brain_challenge_attempts WHERE user_id = v_user_id AND challenge_date = v_today;

  IF v_attempts >= 3 THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Maximum 3 attempts per day');
  END IF;

  v_is_correct := LOWER(TRIM(p_answer)) = LOWER(TRIM(v_correct_answer));
  v_points := CASE WHEN v_is_correct THEN 20 ELSE 0 END;

  INSERT INTO brain_challenge_attempts (id, user_id, challenge_date, question_text, answer_submitted, is_correct, points_earned, attempt_order)
  VALUES (gen_random_uuid(), v_user_id, v_today, v_questions[v_q_idx], p_answer, v_is_correct, v_points, v_attempts + 1);

  IF v_is_correct AND v_points > 0 THEN
    INSERT INTO user_balances (id, user_id, points, coins)
    VALUES (gen_random_uuid(), v_user_id, v_points, 0)
    ON CONFLICT (user_id) DO UPDATE SET points = user_balances.points + v_points;
  END IF;

  RETURN jsonb_build_object('success', TRUE, 'is_correct', v_is_correct, 'points', v_points, 'message', CASE WHEN v_is_correct THEN '🧠 Correct! +20 points!' ELSE 'Try again!' END);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Referral
CREATE OR REPLACE FUNCTION add_referral(p_referred_user_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_today TEXT := TO_CHAR(NOW(), 'YYYY-MM-DD');
  v_month_count INTEGER;
BEGIN
  -- Max 5 referrals per month
  SELECT COUNT(*) INTO v_month_count FROM referrals
  WHERE referrer_id = v_user_id AND referral_date LIKE SUBSTRING(v_today FROM 1 FOR 7) || '%';

  IF v_month_count >= 5 THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Maximum 5 referrals per month reached');
  END IF;

  INSERT INTO referrals (id, referrer_id, referred_user_id, referral_date, points_awarded, status)
  VALUES (gen_random_uuid(), v_user_id, p_referred_user_id, v_today, 50, 'completed');

  INSERT INTO user_balances (id, user_id, points, coins)
  VALUES (gen_random_uuid(), v_user_id, 50, 0)
  ON CONFLICT (user_id) DO UPDATE SET points = user_balances.points + 50;

  RETURN jsonb_build_object('success', TRUE, 'points', 50, 'message', '🎉 Referral bonus: +50 points!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Weekly Achievement
CREATE OR REPLACE FUNCTION update_weekly_achievement(p_achievement_type TEXT, p_count_increment INTEGER DEFAULT 1)
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_week_start TEXT := TO_CHAR(NOW() - (EXTRACT(DOW FROM NOW())::INTEGER - 1) * INTERVAL '1 day', 'YYYY-MM-DD');
  v_achievement weekly_achievements%ROWTYPE;
  v_new_count INTEGER;
  v_completed BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_achievement FROM weekly_achievements
  WHERE user_id = v_user_id AND week_start = v_week_start AND achievement_type = p_achievement_type;

  IF v_achievement IS NULL THEN
    INSERT INTO weekly_achievements (id, user_id, week_start, achievement_type, target_count, current_count, completed)
    VALUES (gen_random_uuid(), v_user_id, v_week_start, p_achievement_type, 5, p_count_increment, p_count_increment >= 5);
    v_completed := p_count_increment >= 5;
  ELSE
    v_new_count := v_achievement.current_count + p_count_increment;
    v_completed := v_new_count >= v_achievement.target_count;
    UPDATE weekly_achievements SET
      current_count = v_new_count,
      completed = v_completed,
      badge_earned = CASE WHEN v_completed THEN p_achievement_type || '_badge' ELSE NULL END,
      updated_at = NOW()
    WHERE id = v_achievement.id;
  END IF;

  IF v_completed AND v_achievement.completed = FALSE THEN
    INSERT INTO user_balances (id, user_id, points, coins)
    VALUES (gen_random_uuid(), v_user_id, 30, 0)
    ON CONFLICT (user_id) DO UPDATE SET points = user_balances.points + 30;
    RETURN jsonb_build_object('success', TRUE, 'completed', TRUE, 'points', 30, 'message', '🌟 Weekly achievement completed! +30 points');
  END IF;

  RETURN jsonb_build_object('success', TRUE, 'completed', v_completed, 'current', COALESCE(v_new_count, p_count_increment), 'message', 'Progress: ' || COALESCE(v_new_count, p_count_increment) || '/5');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check Happy Hour
CREATE OR REPLACE FUNCTION is_happy_hour()
RETURNS JSONB AS $$
DECLARE
  v_config happy_hour_config%ROWTYPE;
  v_hour INTEGER;
BEGIN
  SELECT * INTO v_config FROM happy_hour_config WHERE id = 'default' LIMIT 1;

  IF v_config IS NULL OR v_config.is_active = FALSE THEN
    RETURN jsonb_build_object('is_happy_hour', FALSE, 'multiplier', 1.0);
  END IF;

  v_hour := EXTRACT(HOUR FROM NOW())::INTEGER;

  RETURN jsonb_build_object('is_happy_hour', v_hour >= v_config.start_hour AND v_hour < v_config.end_hour, 'multiplier', v_config.multiplier, 'start_hour', v_config.start_hour, 'end_hour', v_config.end_hour);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Group Challenge Functions
CREATE OR REPLACE FUNCTION create_group_challenge(p_class_id TEXT, p_title TEXT, p_description TEXT, p_target INTEGER, p_end_date TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
BEGIN
  INSERT INTO group_challenges (id, class_id, title, description, target_quizzes, start_date, end_date, created_by)
  VALUES (gen_random_uuid(), p_class_id, p_title, p_description, p_target, TO_CHAR(NOW(), 'YYYY-MM-DD'), p_end_date, v_user_id);

  RETURN jsonb_build_object('success', TRUE, 'message', 'Group challenge created!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION contribute_to_group_challenge(p_challenge_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_challenge group_challenges%ROWTYPE;
  v_already BOOLEAN;
BEGIN
  SELECT * INTO v_challenge FROM group_challenges WHERE id = p_challenge_id;

  IF v_challenge IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Challenge not found');
  END IF;

  SELECT COUNT(*) > 0 INTO v_already FROM group_challenge_progress
  WHERE challenge_id = p_challenge_id AND user_id = v_user_id
  AND contributed_at >= NOW() - INTERVAL '1 day';

  IF v_already THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Already contributed today');
  END IF;

  INSERT INTO group_challenge_progress (id, challenge_id, user_id)
  VALUES (gen_random_uuid(), p_challenge_id, v_user_id);

  UPDATE group_challenges SET
    current_quizzes = current_quizzes + 1,
    completed = (current_quizzes + 1 >= target_quizzes),
    updated_at = NOW()
  WHERE id = p_challenge_id;

  RETURN jsonb_build_object('success', TRUE, 'current', v_challenge.current_quizzes + 1, 'target', v_challenge.target_quizzes);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user motivation status (all features)
CREATE OR REPLACE FUNCTION get_motivation_status()
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_today TEXT := TO_CHAR(NOW(), 'YYYY-MM-DD');
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'streak', (SELECT jsonb_build_object('current', current_streak, 'longest', longest_streak, 'points', streak_points) FROM user_streaks WHERE user_id = v_user_id),
    'lucky_spin', (SELECT COUNT(*) > 0 FROM lucky_spin_claims WHERE user_id = v_user_id AND claimed_date = v_today),
    'mystery_box', (SELECT CASE WHEN COUNT(*) = 0 THEN TRUE ELSE (v_today::DATE - MAX(claimed_date)::DATE) >= 3 END FROM mystery_box_claims WHERE user_id = v_user_id),
    'brain_challenge', jsonb_build_object('attempts_today', (SELECT COUNT(*) FROM brain_challenge_attempts WHERE user_id = v_user_id AND challenge_date = v_today), 'correct', (SELECT COALESCE(SUM(CASE WHEN is_correct THEN 1 ELSE 0 END), 0) FROM brain_challenge_attempts WHERE user_id = v_user_id AND challenge_date = v_today)),
    'referrals_used', (SELECT COUNT(*) FROM referrals WHERE referrer_id = v_user_id AND referral_date LIKE SUBSTRING(v_today FROM 1 FOR 7) || '%'),
    'happy_hour', (SELECT is_happy_hour())
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default happy hour config
INSERT INTO happy_hour_config (id, start_hour, end_hour, multiplier, is_active)
VALUES ('default', 18, 20, 2.0, TRUE)
ON CONFLICT (id) DO NOTHING;
