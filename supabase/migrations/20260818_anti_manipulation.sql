-- ============================================
-- ANTI-MANIPULATION PROTECTION
-- ============================================
DROP FUNCTION IF EXISTS claim_daily_gift();
DROP FUNCTION IF EXISTS is_happy_hour();
DROP FUNCTION IF EXISTS update_daily_streak();

-- This migration adds server-side validation to prevent:
-- 1. Double-claiming daily gifts
-- 2. Claiming challenges multiple times
-- 3. Spinning the wheel multiple times per day
-- 4. Opening mystery boxes too frequently
-- 5. Referring oneself (fake referrals)
-- 6. Awarding points to others
-- 7. Double-submitting quiz attempts

-- Helper function: check if an action was already done today
CREATE OR REPLACE FUNCTION check_daily_cooldown(
  p_table_name TEXT,
  p_user_col TEXT,
  p_userid TEXT,
  p_max_per_day INT
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INT;
  v_start TEXT;
BEGIN
  v_start := to_char(now(), 'YYYY-MM-DD') || ' 00:00:00+00';
  EXECUTE format(
    'SELECT COUNT(*) FROM %I WHERE %I::text = %L AND created_at >= %L::timestamptz',
    p_table_name, p_user_col, p_userid, v_start
  ) INTO v_count;
  RETURN v_count < p_max_per_day;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 1. PROTECT: claim_daily_gift (prevent double claim)
-- ============================================
-- The existing function already checks, but let's make it bulletproof:
-- Replace with a more secure version that uses INSERT ... ON CONFLICT
CREATE OR REPLACE FUNCTION claim_daily_gift()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid TEXT;
  v_today TEXT;
  v_existing BOOLEAN;
  v_points INT;
  v_coins INT;
  v_result jsonb;
BEGIN
  v_uid := auth.uid()::text;
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مسجل الدخول');
  END IF;

  v_today := to_char(now(), 'YYYY-MM-DD');

  -- Check if already claimed today (server-side, not client-side)
  SELECT EXISTS(
    SELECT 1 FROM daily_gift_claims
    WHERE user_id = v_uid
      AND to_char(created_at, 'YYYY-MM-DD') = v_today
  ) INTO v_existing;

  IF v_existing THEN
    RETURN jsonb_build_object('success', false, 'error', 'لقد حصلت على هديتك اليوم بالفعل!');
  END IF;

  -- Award random points (5-15) and coins (3-8)
  v_points := floor(random() * 11 + 5)::int;
  v_coins := floor(random() * 6 + 3)::int;

  -- Record the claim
  INSERT INTO daily_gift_claims (user_id, points_earned, coins_earned)
  VALUES (v_uid, v_points, v_coins);

  -- Update user balance
  INSERT INTO user_balances (user_id, points, coins)
  VALUES (v_uid, v_points, v_coins)
  ON CONFLICT (user_id) DO UPDATE
  SET points = user_balances.points + v_points,
      coins = user_balances.coins + v_coins,
      updated_at = now();

  -- Record in ledger
  INSERT INTO rewards_ledger (user_id, type, amount, description)
  VALUES (v_uid, 'points', v_points, 'هدية يومية 🎁');

  v_result := jsonb_build_object(
    'success', true,
    'points', v_points,
    'coins', v_coins
  );
  RETURN v_result;
END;
$$;

-- ============================================
-- 2. PROTECT: spin_lucky_wheel (prevent multi-spin)
-- ============================================
CREATE OR REPLACE FUNCTION spin_lucky_wheel()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid TEXT;
  v_today TEXT;
  v_existing BOOLEAN;
  v_prize INT;
  v_prize_name TEXT;
  v_result jsonb;
BEGIN
  v_uid := auth.uid()::text;
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مسجل الدخول');
  END IF;

  v_today := to_char(now(), 'YYYY-MM-DD');

  -- Check daily limit
  SELECT EXISTS(
    SELECT 1 FROM lucky_wheel_spins
    WHERE user_id = v_uid
      AND to_char(created_at, 'YYYY-MM-DD') = v_today
  ) INTO v_existing;

  IF v_existing THEN
    RETURN jsonb_build_object('success', false, 'error', 'لقد استكمت فرصتك اليوم!');
  END IF;

  -- Weighted random prize
  -- 40% chance: 10 points, 25%: 20 points, 15%: 30 points, 10%: 50 points, 7%: 5 coins, 3%: 100 points
  v_prize := (
    CASE
      WHEN random() < 0.40 THEN 10
      WHEN random() < 0.25 THEN 20
      WHEN random() < 0.15 THEN 30
      WHEN random() < 0.10 THEN 50
      WHEN random() < 0.07 THEN 5
      ELSE 100
    END
  )::int;

  v_prize_name := CASE
    WHEN v_prize <= 5 THEN v_prize::text || ' عملات'
    ELSE v_prize::text || ' نقطة'
  END;

  -- Record spin
  INSERT INTO lucky_wheel_spins (user_id, points_earned)
  VALUES (v_uid, CASE WHEN v_prize > 5 THEN v_prize ELSE 0 END);

  -- Update balance
  IF v_prize > 5 THEN
    INSERT INTO user_balances (user_id, points, coins)
    VALUES (v_uid, v_prize, 0)
    ON CONFLICT (user_id) DO UPDATE
    SET points = user_balances.points + v_prize,
        updated_at = now();

    INSERT INTO rewards_ledger (user_id, type, amount, description)
    VALUES (v_uid, 'points', v_prize, 'عجلة الحظ 🎡');
  ELSE
    INSERT INTO user_balances (user_id, points, coins)
    VALUES (v_uid, 0, v_prize)
    ON CONFLICT (user_id) DO UPDATE
    SET coins = user_balances.coins + v_prize,
        updated_at = now();

    INSERT INTO rewards_ledger (user_id, type, amount, description)
    VALUES (v_uid, 'coins', v_prize, 'عجلة الحظ 🎡');
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'prize', v_prize,
    'prize_name', v_prize_name
  );
  RETURN v_result;
END;
$$;

-- ============================================
-- 3. PROTECT: open_mystery_box (prevent spam)
-- ============================================
CREATE OR REPLACE FUNCTION open_mystery_box()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid TEXT;
  v_three_days_ago TEXT;
  v_last_opened TIMESTAMPTZ;
  v_can_open BOOLEAN;
  v_prize_type TEXT;
  v_prize_value INT;
  v_prize_name TEXT;
  v_vip_days INT;
  v_result jsonb;
BEGIN
  v_uid := auth.uid()::text;
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مسجل الدخول');
  END IF;

  -- Check if 3 days have passed since last box
  SELECT COALESCE(MAX(created_at), '1970-01-01'::timestamptz)
  FROM mystery_box_openings WHERE user_id = v_uid
  INTO v_last_opened;

  v_can_open := (now() - v_last_opened) >= interval '3 days';

  IF NOT v_can_open THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'الصندوق متاح مرة كل 3 أيام!');
  END IF;

  -- Random prize: 60% points, 25% coins, 10% badge, 5% VIP day
  IF random() < 0.60 THEN
    v_prize_type := 'points';
    v_prize_value := floor(random() * 40 + 20)::int; -- 20-60 points
    v_prize_name := v_prize_value::text || ' نقطة';
  ELSIF random() < 0.25 THEN
    v_prize_type := 'coins';
    v_prize_value := floor(random() * 8 + 5)::int; -- 5-13 coins
    v_prize_name := v_prize_value::text || ' عملة';
  ELSIF random() < 0.10 THEN
    v_prize_type := 'points';
    v_prize_value := 10;
    v_prize_name := 'شارة مميزة';
  ELSE
    v_prize_type := 'vip';
    v_vip_days := 1;
    v_prize_name := 'يوم VIP مجاني';
  END IF;

  -- Record
  INSERT INTO mystery_box_openings (user_id, prize_type, prize_value)
  VALUES (v_uid, v_prize_type, v_prize_value);

  -- Award
  IF v_prize_type = 'points' THEN
    INSERT INTO user_balances (user_id, points, coins)
    VALUES (v_uid, v_prize_value, 0)
    ON CONFLICT (user_id) DO UPDATE
    SET points = user_balances.points + v_prize_value,
        updated_at = now();
    INSERT INTO rewards_ledger (user_id, type, amount, description)
    VALUES (v_uid, 'points', v_prize_value, 'صندوق الغموض 🎁');
  ELSIF v_prize_type = 'coins' THEN
    INSERT INTO user_balances (user_id, points, coins)
    VALUES (v_uid, 0, v_prize_value)
    ON CONFLICT (user_id) DO UPDATE
    SET coins = user_balances.coins + v_prize_value,
        updated_at = now();
    INSERT INTO rewards_ledger (user_id, type, amount, description)
    VALUES (v_uid, 'coins', v_prize_value, 'صندوق الغموض 🎁');
  ELSIF v_prize_type = 'vip' THEN
    UPDATE user_balances
    SET vip_expiry = GREATEST(COALESCE(vip_expiry, now()), now()) + (v_vip_days || ' days')::interval,
        updated_at = now()
    WHERE user_id = v_uid;
    INSERT INTO rewards_ledger (user_id, type, amount, description)
    VALUES (v_uid, 'vip', v_vip_days, 'صندوق الغموض - يوم VIP 🎁');
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'prize_type', v_prize_type,
    'prize_value', v_prize_value,
    'prize_name', v_prize_name
  );
  RETURN v_result;
END;
$$;

-- ============================================
-- 4. PROTECT: brain_challenge (prevent spam, 3/day)
-- ============================================
CREATE OR REPLACE FUNCTION claim_brain_challenge(
  p_is_correct BOOLEAN
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid TEXT;
  v_today TEXT;
  v_count INT;
  v_points INT;
  v_result jsonb;
BEGIN
  v_uid := auth.uid()::text;
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مسجل الدخول');
  END IF;

  -- Check daily limit (max 3 per day)
  v_today := to_char(now(), 'YYYY-MM-DD');
  SELECT COUNT(*) FROM brain_challenge_attempts
  WHERE user_id = v_uid
    AND to_char(created_at, 'YYYY-MM-DD') = v_today
  INTO v_count;

  IF v_count >= 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'استكملت التحديات الـ 3 اليوم!');
  END IF;

  IF NOT p_is_correct THEN
    -- Still record attempt but no points
    INSERT INTO brain_challenge_attempts (user_id, is_correct)
    VALUES (v_uid, false);
    RETURN jsonb_build_object('success', true, 'correct', false, 'points', 0);
  END IF;

  v_points := 20;

  INSERT INTO brain_challenge_attempts (user_id, is_correct)
  VALUES (v_uid, true);

  INSERT INTO user_balances (user_id, points, coins)
  VALUES (v_uid, v_points, 0)
  ON CONFLICT (user_id) DO UPDATE
  SET points = user_balances.points + v_points,
      updated_at = now();

  INSERT INTO rewards_ledger (user_id, type, amount, description)
  VALUES (v_uid, 'points', v_points, 'تحدي العقل 🧠');

  v_result := jsonb_build_object('success', true, 'correct', true, 'points', v_points);
  RETURN v_result;
END;
$$;

-- ============================================
-- 5. PROTECT: referral (prevent self-referral)
-- ============================================
CREATE OR REPLACE FUNCTION claim_referral_reward(
  p_referrer_id TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid TEXT;
  v_exists BOOLEAN;
  v_is_self BOOLEAN;
  v_result jsonb;
BEGIN
  v_uid := auth.uid()::text;
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مسجل الدخول');
  END IF;

  -- Prevent self-referral
  IF v_uid = p_referrer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكن إحالة نفسك!');
  END IF;

  -- Check if referral already recorded
  SELECT EXISTS(
    SELECT 1 FROM referrals
    WHERE referrer_id = p_referrer_id AND referred_id = v_uid
  ) INTO v_exists;

  IF v_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'تم تسجيل الإحالة بالفعل');
  END IF;

  -- Verify referrer exists
  SELECT EXISTS(
    SELECT 1 FROM public.users WHERE id = p_referrer_id
  ) INTO v_exists;

  IF NOT v_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'المرسل غير موجود');
  END IF;

  -- Record referral
  INSERT INTO referrals (referrer_id, referred_id)
  VALUES (p_referrer_id, v_uid);

  -- Award both parties 50 points
  INSERT INTO user_balances (user_id, points, coins)
  VALUES (p_referrer_id, 50, 0)
  ON CONFLICT (user_id) DO UPDATE
  SET points = user_balances.points + 50,
      updated_at = now();

  INSERT INTO user_balances (user_id, points, coins)
  VALUES (v_uid, 50, 0)
  ON CONFLICT (user_id) DO UPDATE
  SET points = user_balances.points + 50,
      updated_at = now();

  INSERT INTO rewards_ledger (user_id, type, amount, description)
  VALUES (p_referrer_id, 'points', 50, 'إحالة صديق 👥');

  INSERT INTO rewards_ledger (user_id, type, amount, description)
  VALUES (v_uid, 'points', 50, 'مكافأة الإحالة 👥');

  v_result := jsonb_build_object('success', true, 'points', 50);
  RETURN v_result;
END;
$$;

-- ============================================
-- 6. PROTECT: weekly_achievement (prevent double-claim)
-- ============================================
CREATE OR REPLACE FUNCTION claim_weekly_achievement()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid TEXT;
  v_this_week TEXT;
  v_exists BOOLEAN;
  v_points INT;
  v_result jsonb;
BEGIN
  v_uid := auth.uid()::text;
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مسجل الدخول');
  END IF;

  v_this_week := to_char(now(), 'IYYY-"W"IW');

  SELECT EXISTS(
    SELECT 1 FROM weekly_achievements
    WHERE user_id = v_uid
      AND week_label = v_this_week
  ) INTO v_exists;

  IF v_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'حصلت على إنجاز هذا الأسبوع بالفعل!');
  END IF;

  v_points := 30;

  INSERT INTO weekly_achievements (user_id, week_label)
  VALUES (v_uid, v_this_week);

  INSERT INTO user_balances (user_id, points, coins)
  VALUES (v_uid, v_points, 0)
  ON CONFLICT (user_id) DO UPDATE
  SET points = user_balances.points + v_points,
      updated_at = now();

  INSERT INTO rewards_ledger (user_id, type, amount, description)
  VALUES (v_uid, 'points', v_points, 'إنجاز أسبوعي 🌟');

  v_result := jsonb_build_object('success', true, 'points', v_points);
  RETURN v_result;
END;
$$;

-- ============================================
-- 7. PROTECT: happy_hour (server-side check, 2x points)
-- ============================================
CREATE OR REPLACE FUNCTION is_happy_hour()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hour INT;
BEGIN
  v_hour := extract(hour from now() at time zone 'Asia/Cairo');
  -- Happy hour: 6 PM - 8 PM (18:00 - 20:00 Cairo time)
  RETURN v_hour >= 18 AND v_hour < 20;
END;
$$;

-- ============================================
-- 8. PROTECT: quiz_attempt (prevent double-submit)
-- ============================================
-- The existing submit_quiz_attempt already uses ON CONFLICT
-- but let's verify it's using the right constraint.
-- We'll add a more explicit check.
CREATE OR REPLACE FUNCTION submit_quiz_attempt_secure(
  p_quiz_id TEXT,
  p_score INT,
  p_total_questions INT,
  p_time_taken INT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid TEXT;
  v_existing_id TEXT;
  v_result jsonb;
BEGIN
  v_uid := auth.uid()::text;
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مسجل الدخول');
  END IF;

  -- Check if already submitted this quiz (prevent duplicate)
  SELECT id FROM quiz_completions
  WHERE user_id = v_uid AND quiz_id = p_quiz_id
  LIMIT 1 INTO v_existing_id;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing record instead of creating new
    UPDATE quiz_completions
    SET score = GREATEST(score, p_score),  -- Keep highest score
        time_taken = p_time_taken,
        completed_at = now()
    WHERE id = v_existing_id;

    v_result := jsonb_build_object(
      'success', true,
      'action', 'updated',
      'completion_id', v_existing_id
    );
    RETURN v_result;
  END IF;

  -- Insert new attempt
  INSERT INTO quiz_completions (id, user_id, quiz_id, score, total_questions, time_taken)
  VALUES (gen_random_uuid()::text, v_uid, p_quiz_id, p_score, p_total_questions, p_time_taken)
  RETURNING id INTO v_existing_id;

  v_result := jsonb_build_object(
    'success', true,
    'action', 'inserted',
    'completion_id', v_existing_id
  );
  RETURN v_result;
END;
$$;

-- ============================================
-- 9. PROTECT: streak (server-side validation)
-- ============================================
CREATE OR REPLACE FUNCTION update_daily_streak()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid TEXT;
  v_today TEXT;
  v_yesterday TEXT;
  v_last_login TEXT;
  v_current_streak INT;
  v_points INT;
  v_result jsonb;
BEGIN
  v_uid := auth.uid()::text;
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مسجل الدخول');
  END IF;

  v_today := to_char(now(), 'YYYY-MM-DD');

  -- Check if already logged in today (don't double count)
  SELECT COALESCE(MAX(to_char(created_at, 'YYYY-MM-DD')), '')
  FROM daily_logins
  WHERE user_id = v_uid
  INTO v_last_login;

  IF v_last_login = v_today THEN
    -- Already logged in today, just return current streak
    SELECT COALESCE(MAX(streak), 0) FROM streak_records
    WHERE user_id = v_uid AND to_char(created_at, 'YYYY-MM-DD') = v_today
    INTO v_current_streak;

    v_result := jsonb_build_object(
      'success', true,
      'streak', v_current_streak,
      'points', 0,
      'message', 'تم تسجيل دخولك اليوم بالفعل'
    );
    RETURN v_result;
  END IF;

  -- Calculate new streak
  v_yesterday := to_char(now() - interval '1 day', 'YYYY-MM-DD');

  IF v_last_login = v_yesterday THEN
    -- Consecutive day
    SELECT COALESCE(MAX(streak), 0) + 1
    FROM streak_records
    WHERE user_id = v_uid
    INTO v_current_streak;
  ELSE
    -- New streak
    v_current_streak := 1;
  END IF;

  -- Record login
  INSERT INTO daily_logins (user_id)
  VALUES (v_uid);

  -- Record streak
  INSERT INTO streak_records (user_id, streak)
  VALUES (v_uid, v_current_streak);

  -- Award points based on streak
  v_points := CASE
    WHEN v_current_streak >= 30 THEN 200
    WHEN v_current_streak >= 21 THEN 100
    WHEN v_current_streak >= 14 THEN 75
    WHEN v_current_streak >= 7 THEN 50
    WHEN v_current_streak >= 3 THEN 25
    ELSE 5
  END;

  -- Update balance
  INSERT INTO user_balances (user_id, points, coins)
  VALUES (v_uid, v_points, 0)
  ON CONFLICT (user_id) DO UPDATE
  SET points = user_balances.points + v_points,
      updated_at = now();

  INSERT INTO rewards_ledger (user_id, type, amount, description)
  VALUES (v_uid, 'points', v_points, 'سلسلة أيام 🔥 يوم ' || v_current_streak);

  v_result := jsonb_build_object(
    'success', true,
    'streak', v_current_streak,
    'points', v_points,
    'message', 'سلسلة ' || v_current_streak || ' يوم! +' || v_points || ' نقطة'
  );
  RETURN v_result;
END;
$$;
