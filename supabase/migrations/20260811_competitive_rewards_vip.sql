-- Quiz Space competitive rewards, daily gifts, streaks, VIP tiers and challenges
-- Server-side, idempotent reward claims. User identifiers follow public.users.uid (TEXT).

ALTER TABLE public.user_reward_balances
  ADD COLUMN IF NOT EXISTS coins INTEGER NOT NULL DEFAULT 0 CHECK (coins >= 0),
  ADD COLUMN IF NOT EXISTS daily_streak INTEGER NOT NULL DEFAULT 0 CHECK (daily_streak >= 0),
  ADD COLUMN IF NOT EXISTS last_daily_claim DATE,
  ADD COLUMN IF NOT EXISTS vip_tier TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS vip_updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.vip_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  min_points INTEGER NOT NULL CHECK (min_points >= 0),
  points_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.00 CHECK (points_multiplier >= 1.00),
  daily_coin_bonus INTEGER NOT NULL DEFAULT 0 CHECK (daily_coin_bonus >= 0),
  challenge_slots INTEGER NOT NULL DEFAULT 3 CHECK (challenge_slots BETWEEN 1 AND 10),
  color TEXT NOT NULL DEFAULT '#94a3b8',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.reward_challenge_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  event_type TEXT NOT NULL,
  target INTEGER NOT NULL CHECK (target > 0),
  points_reward INTEGER NOT NULL CHECK (points_reward >= 0),
  coins_reward INTEGER NOT NULL CHECK (coins_reward >= 0),
  icon TEXT NOT NULL DEFAULT 'target',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.daily_gift_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  claim_date DATE NOT NULL,
  day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 7),
  points_reward INTEGER NOT NULL DEFAULT 0,
  coins_reward INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, claim_date)
);

INSERT INTO public.vip_tiers (id, name, name_ar, min_points, points_multiplier, daily_coin_bonus, challenge_slots, color, sort_order) VALUES
  ('none', 'Explorer', 'مستكشف', 0, 1.00, 0, 3, '#94a3b8', 0),
  ('bronze', 'VIP Bronze', 'VIP برونزي', 500, 1.05, 5, 3, '#cd7f32', 1),
  ('silver', 'VIP Silver', 'VIP فضي', 1500, 1.10, 10, 4, '#cbd5e1', 2),
  ('gold', 'VIP Gold', 'VIP ذهبي', 4000, 1.20, 20, 5, '#fbbf24', 3),
  ('platinum', 'VIP Platinum', 'VIP بلاتيني', 10000, 1.35, 35, 6, '#a78bfa', 4)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, min_points = EXCLUDED.min_points, points_multiplier = EXCLUDED.points_multiplier, daily_coin_bonus = EXCLUDED.daily_coin_bonus, challenge_slots = EXCLUDED.challenge_slots, color = EXCLUDED.color, sort_order = EXCLUDED.sort_order;

INSERT INTO public.reward_challenge_templates (id, name, name_ar, description, description_ar, event_type, target, points_reward, coins_reward, icon, sort_order) VALUES
  ('complete_quiz', 'Daily Starter', 'بداية اليوم', 'Complete one quiz today.', 'أكمل اختباراً واحداً اليوم.', 'complete_quiz', 1, 25, 15, 'book-open', 1),
  ('score_80', 'Accuracy Run', 'جولة الدقة', 'Score 80% or higher in one quiz today.', 'احصل على 80% أو أكثر في اختبار اليوم.', 'score_80', 1, 35, 20, 'target', 2),
  ('complete_two', 'Double Play', 'المحاولة المزدوجة', 'Complete two quizzes today.', 'أكمل اختبارين اليوم.', 'complete_quiz', 2, 50, 30, 'zap', 3),
  ('create_quiz', 'Knowledge Creator', 'صانع المعرفة', 'Create one quiz today.', 'أنشئ اختباراً واحداً اليوم.', 'create_quiz', 1, 40, 25, 'pencil', 4),
  ('perfect_score', 'Perfect Strike', 'الضربة الكاملة', 'Get a perfect score in one quiz today.', 'احصل على الدرجة الكاملة في اختبار اليوم.', 'perfect_score', 1, 60, 40, 'trophy', 5),
  ('three_quizzes', 'Quiz Marathon', 'ماراثون الاختبارات', 'Complete three quizzes today.', 'أكمل ثلاثة اختبارات اليوم.', 'complete_quiz', 3, 80, 55, 'flame', 6)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, description = EXCLUDED.description, description_ar = EXCLUDED.description_ar, event_type = EXCLUDED.event_type, target = EXCLUDED.target, points_reward = EXCLUDED.points_reward, coins_reward = EXCLUDED.coins_reward, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

ALTER TABLE public.vip_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_challenge_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_gift_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vip_tiers_read ON public.vip_tiers;
CREATE POLICY vip_tiers_read ON public.vip_tiers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS challenge_templates_read ON public.reward_challenge_templates;
CREATE POLICY challenge_templates_read ON public.reward_challenge_templates FOR SELECT TO authenticated USING (is_active = true);
DROP POLICY IF EXISTS daily_gifts_own_read ON public.daily_gift_claims;
CREATE POLICY daily_gifts_own_read ON public.daily_gift_claims FOR SELECT TO authenticated USING (user_id = auth.uid()::text);

CREATE OR REPLACE FUNCTION public.vip_tier_for_points(p_points INTEGER)
RETURNS TEXT AS $$
  SELECT COALESCE(MAX(id) FILTER (WHERE min_points = (SELECT MAX(min_points) FROM public.vip_tiers WHERE min_points <= GREATEST(0, COALESCE(p_points, 0)))), 'none')
  FROM public.vip_tiers;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.vip_multiplier_for_user(p_user_id TEXT)
RETURNS NUMERIC AS $$
  SELECT COALESCE(t.points_multiplier, 1.00)
  FROM public.user_reward_balances b
  LEFT JOIN public.vip_tiers t ON t.id = b.vip_tier
  WHERE b.user_id = p_user_id;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.claim_daily_gift()
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today DATE := (now() AT TIME ZONE 'UTC')::date;
  v_last DATE;
  v_streak INTEGER;
  v_day INTEGER;
  v_points INTEGER;
  v_coins INTEGER;
  v_bonus INTEGER := 0;
  v_inserted INTEGER := 0;
  v_tier TEXT;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN RAISE EXCEPTION 'Authentication required'; END IF;
  INSERT INTO public.user_reward_balances (user_id, points, level, vip_tier) VALUES (v_user_id, 0, 1, 'none') ON CONFLICT (user_id) DO NOTHING;
  SELECT last_daily_claim, daily_streak, vip_tier INTO v_last, v_streak, v_tier FROM public.user_reward_balances WHERE user_id = v_user_id FOR UPDATE;
  IF v_last = v_today THEN
    RETURN jsonb_build_object('claimed', false, 'claim_date', v_today, 'streak', v_streak, 'message', 'Already claimed today');
  END IF;
  IF v_last = v_today - 1 THEN v_streak := GREATEST(1, v_streak + 1); ELSE v_streak := 1; END IF;
  v_day := ((v_streak - 1) % 7) + 1;
  v_points := CASE v_day WHEN 1 THEN 10 WHEN 2 THEN 15 WHEN 3 THEN 20 WHEN 4 THEN 25 WHEN 5 THEN 35 WHEN 6 THEN 50 ELSE 100 END;
  v_coins := CASE v_day WHEN 1 THEN 20 WHEN 2 THEN 25 WHEN 3 THEN 35 WHEN 4 THEN 45 WHEN 5 THEN 60 WHEN 6 THEN 80 ELSE 150 END;
  SELECT daily_coin_bonus INTO v_bonus FROM public.vip_tiers WHERE id = v_tier;
  v_coins := v_coins + COALESCE(v_bonus, 0);
  INSERT INTO public.daily_gift_claims(user_id, claim_date, day_number, points_reward, coins_reward)
  VALUES (v_user_id, v_today, v_day, v_points, v_coins) ON CONFLICT (user_id, claim_date) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN RETURN jsonb_build_object('claimed', false, 'claim_date', v_today, 'streak', v_streak); END IF;
  INSERT INTO public.reward_points_ledger(user_id, points, event_type, event_key, reference_id, metadata)
  VALUES (v_user_id, v_points, 'daily_gift', 'daily_gift:' || v_today, v_today::text, jsonb_build_object('day_number', v_day, 'coins', v_coins));
  UPDATE public.user_reward_balances SET points = points + v_points, coins = coins + v_coins, daily_streak = v_streak, last_daily_claim = v_today, level = public.reward_level_for_points(points + v_points), vip_tier = public.vip_tier_for_points(points + v_points), vip_updated_at = now(), updated_at = now() WHERE user_id = v_user_id;
  RETURN jsonb_build_object('claimed', true, 'claim_date', v_today, 'day_number', v_day, 'streak', v_streak, 'points', v_points, 'coins', v_coins);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.claim_daily_challenge(p_challenge_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today DATE := (now() AT TIME ZONE 'UTC')::date;
  v_template RECORD;
  v_count INTEGER := 0;
  v_event_key TEXT;
  v_inserted INTEGER := 0;
  v_multiplier NUMERIC := 1.00;
  v_points INTEGER;
  v_coins INTEGER;
  v_total_points INTEGER;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_template FROM public.reward_challenge_templates WHERE id = p_challenge_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Challenge not found'; END IF;
  IF v_template.event_type = 'complete_quiz' THEN SELECT COUNT(*) INTO v_count FROM public.completions WHERE taker_id = v_user_id AND created_at::date = v_today;
  ELSIF v_template.event_type = 'score_80' THEN SELECT COUNT(*) INTO v_count FROM public.completions WHERE taker_id = v_user_id AND created_at::date = v_today AND total_questions > 0 AND score::numeric / total_questions::numeric >= 0.80;
  ELSIF v_template.event_type = 'perfect_score' THEN SELECT COUNT(*) INTO v_count FROM public.completions WHERE taker_id = v_user_id AND created_at::date = v_today AND total_questions > 0 AND score >= total_questions;
  ELSIF v_template.event_type = 'create_quiz' THEN SELECT COUNT(*) INTO v_count FROM public.quizzes WHERE creator_id = v_user_id AND created_at::date = v_today;
  END IF;
  IF v_count < v_template.target THEN RAISE EXCEPTION 'Challenge is not complete yet'; END IF;
  v_event_key := 'daily_challenge:' || v_today || ':' || p_challenge_id;
  SELECT points_multiplier INTO v_multiplier FROM public.vip_tiers t JOIN public.user_reward_balances b ON b.vip_tier = t.id WHERE b.user_id = v_user_id;
  v_points := ROUND(v_template.points_reward * COALESCE(v_multiplier, 1.00));
  v_coins := v_template.coins_reward;
  INSERT INTO public.reward_points_ledger(user_id, points, event_type, event_key, reference_id, metadata)
  VALUES (v_user_id, v_points, 'daily_challenge', v_event_key, p_challenge_id, jsonb_build_object('date', v_today, 'coins', v_coins)) ON CONFLICT (user_id, event_key) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN RETURN jsonb_build_object('claimed', false, 'challenge_id', p_challenge_id, 'message', 'Already claimed'); END IF;
  INSERT INTO public.user_reward_balances(user_id, points, level, vip_tier) VALUES (v_user_id, v_points, public.reward_level_for_points(v_points), public.vip_tier_for_points(v_points)) ON CONFLICT (user_id) DO UPDATE SET points = public.user_reward_balances.points + v_points, coins = public.user_reward_balances.coins + v_coins, level = public.reward_level_for_points(public.user_reward_balances.points + v_points), vip_tier = public.vip_tier_for_points(public.user_reward_balances.points + v_points), vip_updated_at = now(), updated_at = now();
  SELECT points INTO v_total_points FROM public.user_reward_balances WHERE user_id = v_user_id;
  RETURN jsonb_build_object('claimed', true, 'challenge_id', p_challenge_id, 'points', v_points, 'coins', v_coins, 'total_points', v_total_points);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.vip_tier_for_points(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vip_multiplier_for_user(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_gift() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_challenge(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
