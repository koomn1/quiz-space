-- Quiz Space rewards and points foundation
-- Safe to run repeatedly. All point grants are server-side and idempotent.

CREATE TABLE IF NOT EXISTS public.reward_levels (
  level INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  min_points INTEGER NOT NULL CHECK (min_points >= 0)
);

CREATE TABLE IF NOT EXISTS public.reward_badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'award',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.user_reward_balances (
  user_id TEXT PRIMARY KEY REFERENCES public.users(uid) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  level INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reward_points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  event_key TEXT NOT NULL,
  reference_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_key)
);

CREATE TABLE IF NOT EXISTS public.user_reward_badges (
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES public.reward_badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

INSERT INTO public.reward_levels (level, name, name_ar, min_points) VALUES
  (1, 'New Explorer', 'مستكشف جديد', 0),
  (2, 'Curious Learner', 'متعلم فضولي', 100),
  (3, 'Active Scholar', 'باحث نشط', 250),
  (4, 'Knowledge Builder', 'باني المعرفة', 500),
  (5, 'Quiz Champion', 'بطل الاختبارات', 1000),
  (6, 'Master Learner', 'سيد التعلم', 2000)
ON CONFLICT (level) DO UPDATE SET name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, min_points = EXCLUDED.min_points;

INSERT INTO public.reward_badges (id, name, name_ar, description, description_ar, icon, sort_order) VALUES
  ('first_quiz', 'First Step', 'البداية', 'Complete your first quiz.', 'أكمل أول اختبار لك.', 'sparkles', 1),
  ('active_learner', 'Active Learner', 'المتعلم النشط', 'Complete 10 quizzes.', 'أكمل 10 اختبارات.', 'book-open', 2),
  ('high_scorer', 'High Scorer', 'المتفوق', 'Score 90% or higher in five quizzes.', 'احصل على 90% أو أكثر في خمسة اختبارات.', 'trophy', 3),
  ('creator', 'Knowledge Creator', 'صانع المعرفة', 'Create your first quiz.', 'أنشئ أول اختبار لك.', 'pencil', 4),
  ('seven_day_streak', 'Seven Day Streak', 'صاحب السلسلة', 'Learn on seven consecutive days.', 'حافظ على التعلم سبعة أيام متتالية.', 'flame', 5)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, description = EXCLUDED.description, description_ar = EXCLUDED.description_ar, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

CREATE INDEX IF NOT EXISTS reward_points_ledger_user_created_idx ON public.reward_points_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_reward_badges_user_idx ON public.user_reward_badges(user_id, earned_at DESC);

ALTER TABLE public.reward_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reward_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reward_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reward_levels_read ON public.reward_levels;
CREATE POLICY reward_levels_read ON public.reward_levels FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS reward_badges_read ON public.reward_badges;
CREATE POLICY reward_badges_read ON public.reward_badges FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS reward_balance_own_read ON public.user_reward_balances;
CREATE POLICY reward_balance_own_read ON public.user_reward_balances FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS reward_ledger_own_read ON public.reward_points_ledger;
CREATE POLICY reward_ledger_own_read ON public.reward_points_ledger FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS reward_badges_own_read ON public.user_reward_badges;
CREATE POLICY reward_badges_own_read ON public.user_reward_badges FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.reward_level_for_points(p_points INTEGER)
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(level), 1) FROM public.reward_levels WHERE min_points <= GREATEST(0, COALESCE(p_points, 0));
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.award_quiz_completion_rewards(p_completion_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_completion RECORD;
  v_points INTEGER;
  v_event_key TEXT;
  v_inserted BOOLEAN := false;
  v_rows INTEGER := 0;
  v_total_completed INTEGER;
  v_high_scores INTEGER;
  v_level INTEGER;
  v_total_points INTEGER;
BEGIN
  SELECT c.* INTO v_completion FROM public.completions c WHERE c.id = p_completion_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Completion not found'; END IF;
  IF auth.uid()::text <> v_completion.taker_id::text THEN RAISE EXCEPTION 'Not authorized'; END IF;

  v_event_key := 'quiz_completion:' || p_completion_id;
  v_points := 10 + (GREATEST(0, COALESCE(v_completion.score, 0)) * 2);
  IF COALESCE(v_completion.total_questions, 0) > 0
     AND (v_completion.score::numeric / v_completion.total_questions::numeric) >= 0.80 THEN
    v_points := v_points + 15;
  END IF;
  IF COALESCE(v_completion.total_questions, 0) > 0
     AND v_completion.score >= v_completion.total_questions THEN
    v_points := v_points + 30;
  END IF;

  INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id, metadata)
  VALUES (v_completion.taker_id::text, v_points, 'quiz_completion', v_event_key, p_completion_id,
          jsonb_build_object('quiz_id', v_completion.quiz_id, 'score', v_completion.score, 'total_questions', v_completion.total_questions))
  ON CONFLICT (user_id, event_key) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_inserted := v_rows > 0;

  INSERT INTO public.user_reward_balances (user_id, points, level)
  VALUES (v_completion.taker_id::text, CASE WHEN v_inserted THEN v_points ELSE 0 END,
          public.reward_level_for_points(CASE WHEN v_inserted THEN v_points ELSE 0 END))
  ON CONFLICT (user_id) DO UPDATE SET
    points = public.user_reward_balances.points + CASE WHEN v_inserted THEN v_points ELSE 0 END,
    level = public.reward_level_for_points(public.user_reward_balances.points + CASE WHEN v_inserted THEN v_points ELSE 0 END),
    updated_at = now();

  SELECT COUNT(*)::INTEGER INTO v_total_completed FROM public.completions WHERE taker_id = v_completion.taker_id;
  SELECT COUNT(*)::INTEGER INTO v_high_scores FROM public.completions
    WHERE taker_id = v_completion.taker_id AND total_questions > 0 AND score::numeric / total_questions::numeric >= 0.90;
  SELECT b.points, b.level INTO v_total_points, v_level FROM public.user_reward_balances b WHERE b.user_id = v_completion.taker_id::text;

  IF v_total_completed >= 1 THEN INSERT INTO public.user_reward_badges(user_id, badge_id) VALUES (v_completion.taker_id::text, 'first_quiz') ON CONFLICT DO NOTHING; END IF;
  IF v_total_completed >= 10 THEN INSERT INTO public.user_reward_badges(user_id, badge_id) VALUES (v_completion.taker_id::text, 'active_learner') ON CONFLICT DO NOTHING; END IF;
  IF v_high_scores >= 5 THEN INSERT INTO public.user_reward_badges(user_id, badge_id) VALUES (v_completion.taker_id::text, 'high_scorer') ON CONFLICT DO NOTHING; END IF;

  RETURN jsonb_build_object('points_awarded', CASE WHEN v_inserted THEN v_points ELSE 0 END, 'total_points', v_total_points, 'level', v_level);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

INSERT INTO public.user_reward_balances (user_id, points, level)
SELECT u.uid, COALESCE(u.xp, 0), public.reward_level_for_points(COALESCE(u.xp, 0))
FROM public.users u
WHERE u.uid IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.award_quiz_creator_reward()
RETURNS TRIGGER AS $$
DECLARE
  v_points INTEGER := 50;
  v_rows INTEGER := 0;
BEGIN
  IF NEW.creator_id IS NULL OR NEW.creator_id::text = '' THEN RETURN NEW; END IF;
  INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id, metadata)
  VALUES (NEW.creator_id::text, v_points, 'quiz_creation', 'quiz_creation:' || NEW.id, NEW.id,
          jsonb_build_object('quiz_title', NEW.title))
  ON CONFLICT (user_id, event_key) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  INSERT INTO public.user_reward_balances (user_id, points, level)
  VALUES (NEW.creator_id::text, CASE WHEN v_rows > 0 THEN v_points ELSE 0 END,
          public.reward_level_for_points(CASE WHEN v_rows > 0 THEN v_points ELSE 0 END))
  ON CONFLICT (user_id) DO UPDATE SET
    points = public.user_reward_balances.points + CASE WHEN v_rows > 0 THEN v_points ELSE 0 END,
    level = public.reward_level_for_points(public.user_reward_balances.points + CASE WHEN v_rows > 0 THEN v_points ELSE 0 END),
    updated_at = now();
  INSERT INTO public.user_reward_badges(user_id, badge_id)
  VALUES (NEW.creator_id::text, 'creator') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS quizzes_creator_reward ON public.quizzes;
CREATE TRIGGER quizzes_creator_reward
AFTER INSERT ON public.quizzes
FOR EACH ROW EXECUTE FUNCTION public.award_quiz_creator_reward();

GRANT EXECUTE ON FUNCTION public.reward_level_for_points(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_quiz_completion_rewards(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
