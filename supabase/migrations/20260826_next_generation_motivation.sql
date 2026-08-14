-- Next-generation motivation foundation.
-- All balance changes remain inside server-authorized functions with idempotent ledger keys.

ALTER TABLE public.user_streaks
  ADD COLUMN IF NOT EXISTS protection_days INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_protection_earned_at DATE,
  ADD COLUMN IF NOT EXISTS last_protection_used_for DATE;

ALTER TABLE public.user_streaks
  DROP CONSTRAINT IF EXISTS user_streaks_protection_days_check;
ALTER TABLE public.user_streaks
  ADD CONSTRAINT user_streaks_protection_days_check CHECK (protection_days BETWEEN 0 AND 2);

CREATE TABLE IF NOT EXISTS public.learning_class_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id TEXT NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 3 AND 80),
  description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 280),
  target_count INTEGER NOT NULL CHECK (target_count BETWEEN 3 AND 500),
  current_count INTEGER NOT NULL DEFAULT 0 CHECK (current_count >= 0),
  reward_points INTEGER NOT NULL DEFAULT 35 CHECK (reward_points BETWEEN 1 AND 500),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_by TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at AND ends_at <= starts_at + INTERVAL '31 days')
);

CREATE TABLE IF NOT EXISTS public.learning_class_challenge_contributions (
  challenge_id UUID NOT NULL REFERENCES public.learning_class_challenges(id) ON DELETE CASCADE,
  completion_id TEXT NOT NULL REFERENCES public.completions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  contributed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (challenge_id, completion_id)
);

CREATE TABLE IF NOT EXISTS public.learning_class_challenge_claims (
  challenge_id UUID NOT NULL REFERENCES public.learning_class_challenges(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (challenge_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.learning_season_reward_choices (
  season_id TEXT NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  choice_key TEXT NOT NULL CHECK (choice_key ~ '^[a-z0-9_]{3,40}$'),
  reward_type TEXT NOT NULL CHECK (reward_type IN ('points', 'coins', 'badge')),
  reward_amount INTEGER NOT NULL DEFAULT 0 CHECK (reward_amount >= 0),
  reward_badge_id TEXT REFERENCES public.reward_badges(id) ON DELETE RESTRICT,
  required_quizzes INTEGER NOT NULL DEFAULT 3 CHECK (required_quizzes BETWEEN 1 AND 100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (season_id, choice_key),
  CHECK (
    (reward_type = 'badge' AND reward_badge_id IS NOT NULL AND reward_amount = 0)
    OR (reward_type IN ('points', 'coins') AND reward_badge_id IS NULL AND reward_amount > 0)
  )
);

CREATE TABLE IF NOT EXISTS public.learning_season_reward_claims (
  season_id TEXT NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  choice_key TEXT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (season_id, user_id),
  FOREIGN KEY (season_id, choice_key)
    REFERENCES public.learning_season_reward_choices(season_id, choice_key)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS learning_class_challenges_class_window_idx
  ON public.learning_class_challenges(class_id, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS learning_class_challenge_contributions_user_idx
  ON public.learning_class_challenge_contributions(user_id, contributed_at DESC);
CREATE INDEX IF NOT EXISTS learning_season_reward_claims_user_idx
  ON public.learning_season_reward_claims(user_id, claimed_at DESC);
CREATE INDEX IF NOT EXISTS completions_taker_created_idx
  ON public.completions(taker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS completions_quiz_created_idx
  ON public.completions(quiz_id, created_at DESC);

ALTER TABLE public.learning_class_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_class_challenge_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_class_challenge_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_season_reward_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_season_reward_claims ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_learning_class_member(p_class_id TEXT, p_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.classrooms c WHERE c.id = p_class_id AND c.created_by = p_user_id
    UNION ALL
    SELECT 1 FROM public.classroom_students s WHERE s.class_id = p_class_id AND s.student_id = p_user_id
  );
$$;

DROP POLICY IF EXISTS learning_class_challenges_member_read ON public.learning_class_challenges;
CREATE POLICY learning_class_challenges_member_read
  ON public.learning_class_challenges FOR SELECT TO authenticated
  USING ((SELECT public.is_learning_class_member(class_id, auth.uid()::text)));

DROP POLICY IF EXISTS learning_class_challenge_contributions_own_read ON public.learning_class_challenge_contributions;
CREATE POLICY learning_class_challenge_contributions_own_read
  ON public.learning_class_challenge_contributions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS learning_class_challenge_claims_own_read ON public.learning_class_challenge_claims;
CREATE POLICY learning_class_challenge_claims_own_read
  ON public.learning_class_challenge_claims FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS learning_season_reward_choices_read ON public.learning_season_reward_choices;
CREATE POLICY learning_season_reward_choices_read
  ON public.learning_season_reward_choices FOR SELECT TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS learning_season_reward_claims_own_read ON public.learning_season_reward_claims;
CREATE POLICY learning_season_reward_claims_own_read
  ON public.learning_season_reward_claims FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::text));

CREATE OR REPLACE FUNCTION public.grant_reward_coins(
  p_user_id TEXT,
  p_coins INTEGER,
  p_event_type TEXT,
  p_event_key TEXT,
  p_reference_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows INTEGER := 0;
  v_total INTEGER := 0;
BEGIN
  IF p_user_id IS NULL OR p_user_id = '' OR p_coins <= 0 THEN
    RAISE EXCEPTION 'Invalid reward request';
  END IF;

  INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id, metadata)
  VALUES (p_user_id, 0, p_event_type, p_event_key, p_reference_id, COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('coins', p_coins))
  ON CONFLICT (user_id, event_key) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  INSERT INTO public.user_reward_balances (user_id, points, coins, level)
  VALUES (p_user_id, 0, CASE WHEN v_rows > 0 THEN p_coins ELSE 0 END, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    coins = public.user_reward_balances.coins + CASE WHEN v_rows > 0 THEN p_coins ELSE 0 END,
    updated_at = now();

  SELECT coins INTO v_total FROM public.user_reward_balances WHERE user_id = p_user_id;
  RETURN jsonb_build_object('coins_awarded', CASE WHEN v_rows > 0 THEN p_coins ELSE 0 END, 'total_coins', COALESCE(v_total, 0));
END;
$$;

CREATE OR REPLACE FUNCTION public.update_daily_streak()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today DATE := current_date;
  v_last DATE;
  v_current INTEGER := 0;
  v_longest INTEGER := 0;
  v_protection INTEGER := 1;
  v_points INTEGER := 0;
  v_used_protection BOOLEAN := false;
  v_earned_protection BOOLEAN := false;
  v_reward JSONB;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT current_streak, longest_streak, NULLIF(last_login_date, '')::date, protection_days
    INTO v_current, v_longest, v_last, v_protection
  FROM public.user_streaks WHERE user_id = v_user_id FOR UPDATE;

  IF NOT FOUND THEN
    v_current := 1;
    v_longest := 1;
    v_protection := 1;
    INSERT INTO public.user_streaks (id, user_id, current_streak, longest_streak, last_login_date, streak_points, protection_days)
    VALUES (gen_random_uuid()::text, v_user_id, v_current, v_longest, v_today::text, 0, v_protection);
  ELSIF v_last = v_today THEN
    RETURN jsonb_build_object('success', true, 'streak', v_current, 'points', 0, 'protection_days', v_protection, 'message', 'Already checked in today');
  ELSIF v_last = v_today - 1 THEN
    v_current := v_current + 1;
  ELSIF v_last = v_today - 2 AND v_protection > 0 THEN
    v_current := v_current + 1;
    v_protection := v_protection - 1;
    v_used_protection := true;
  ELSE
    v_current := 1;
  END IF;

  v_longest := greatest(v_longest, v_current);
  IF v_current >= 7 AND mod(v_current, 7) = 0 AND v_protection < 2 THEN
    v_protection := v_protection + 1;
    v_earned_protection := true;
  END IF;
  v_points := CASE WHEN v_current >= 30 THEN 200 WHEN v_current >= 14 THEN 100 WHEN v_current >= 7 THEN 50 WHEN v_current >= 3 THEN 20 ELSE 5 END;

  UPDATE public.user_streaks SET
    current_streak = v_current,
    longest_streak = v_longest,
    last_login_date = v_today::text,
    streak_points = streak_points + v_points,
    protection_days = v_protection,
    last_protection_earned_at = CASE WHEN v_earned_protection THEN v_today ELSE last_protection_earned_at END,
    last_protection_used_for = CASE WHEN v_used_protection THEN v_today - 1 ELSE last_protection_used_for END,
    updated_at = now()
  WHERE user_id = v_user_id;

  v_reward := public.grant_reward_points(v_user_id, v_points, 'daily_streak', 'daily_streak:' || v_today::text, v_today::text,
    jsonb_build_object('streak', v_current, 'used_protection', v_used_protection, 'earned_protection', v_earned_protection));
  RETURN jsonb_build_object('success', true, 'streak', v_current, 'points', COALESCE((v_reward->>'points_awarded')::integer, 0), 'protection_days', v_protection, 'used_protection', v_used_protection, 'earned_protection', v_earned_protection);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_smart_review_cards()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_cards JSONB;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(card) ORDER BY card.accuracy ASC, card.attempts DESC), '[]'::jsonb)
    INTO v_cards
  FROM (
    SELECT
      COALESCE(NULLIF(trim(q.category), ''), 'general') AS topic,
      COUNT(*)::integer AS attempts,
      ROUND(100 * AVG(c.score::numeric / NULLIF(c.total_questions, 0)), 1) AS accuracy,
      MAX(c.created_at) AS last_attempt_at,
      ARRAY_AGG(DISTINCT c.quiz_id ORDER BY c.quiz_id) FILTER (WHERE c.quiz_id IS NOT NULL) AS quiz_ids
    FROM public.completions c
    JOIN public.quizzes q ON q.id = c.quiz_id
    WHERE c.taker_id = v_user_id
      AND c.total_questions > 0
      AND c.created_at >= now() - INTERVAL '60 days'
    GROUP BY COALESCE(NULLIF(trim(q.category), ''), 'general')
    HAVING COUNT(*) >= 1
    ORDER BY accuracy ASC, attempts DESC
    LIMIT 3
  ) AS card;
  RETURN jsonb_build_object('cards', v_cards, 'window_days', 60);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_personal_learning_improvement()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_current_count INTEGER;
  v_previous_count INTEGER;
  v_current_accuracy NUMERIC;
  v_previous_accuracy NUMERIC;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT COUNT(*)::integer, ROUND(100 * AVG(score::numeric / NULLIF(total_questions, 0)), 1)
    INTO v_current_count, v_current_accuracy
  FROM public.completions
  WHERE taker_id = v_user_id AND total_questions > 0 AND created_at >= now() - INTERVAL '28 days';
  SELECT COUNT(*)::integer, ROUND(100 * AVG(score::numeric / NULLIF(total_questions, 0)), 1)
    INTO v_previous_count, v_previous_accuracy
  FROM public.completions
  WHERE taker_id = v_user_id AND total_questions > 0
    AND created_at >= now() - INTERVAL '56 days' AND created_at < now() - INTERVAL '28 days';
  RETURN jsonb_build_object(
    'current_period', jsonb_build_object('days', 28, 'completed', COALESCE(v_current_count, 0), 'accuracy', COALESCE(v_current_accuracy, 0)),
    'previous_period', jsonb_build_object('days', 28, 'completed', COALESCE(v_previous_count, 0), 'accuracy', COALESCE(v_previous_accuracy, 0)),
    'accuracy_change', COALESCE(v_current_accuracy, 0) - COALESCE(v_previous_accuracy, 0),
    'completion_change', COALESCE(v_current_count, 0) - COALESCE(v_previous_count, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_learning_class_challenge(
  p_class_id TEXT,
  p_title TEXT,
  p_description TEXT,
  p_target_count INTEGER,
  p_ends_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_id UUID;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF char_length(trim(COALESCE(p_title, ''))) NOT BETWEEN 3 AND 80
    OR char_length(COALESCE(p_description, '')) > 280
    OR COALESCE(p_target_count, 0) NOT BETWEEN 3 AND 500
    OR p_ends_at IS NULL OR p_ends_at <= now() + INTERVAL '1 hour' OR p_ends_at > now() + INTERVAL '31 days' THEN
    RAISE EXCEPTION 'Invalid class challenge';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.classrooms WHERE id = p_class_id AND created_by = v_user_id) THEN
    RAISE EXCEPTION 'Only the classroom teacher can create a challenge';
  END IF;
  INSERT INTO public.learning_class_challenges(class_id, title, description, target_count, ends_at, created_by)
  VALUES (p_class_id, trim(p_title), trim(COALESCE(p_description, '')), p_target_count, p_ends_at, v_user_id)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'challenge_id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_learning_class_challenge_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class_id TEXT;
  v_challenge RECORD;
  v_inserted INTEGER;
BEGIN
  SELECT classroom_id INTO v_class_id FROM public.quizzes WHERE id = NEW.quiz_id;
  IF v_class_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.classroom_students WHERE class_id = v_class_id AND student_id = NEW.taker_id
  ) THEN RETURN NEW; END IF;
  FOR v_challenge IN
    SELECT id, target_count FROM public.learning_class_challenges
    WHERE class_id = v_class_id AND completed_at IS NULL AND starts_at <= NEW.created_at AND ends_at >= NEW.created_at
  LOOP
    INSERT INTO public.learning_class_challenge_contributions(challenge_id, completion_id, user_id)
    VALUES (v_challenge.id, NEW.id, NEW.taker_id)
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    IF v_inserted > 0 THEN
      UPDATE public.learning_class_challenges
      SET current_count = LEAST(current_count + 1, target_count),
          completed_at = CASE WHEN current_count + 1 >= target_count THEN now() ELSE completed_at END,
          updated_at = now()
      WHERE id = v_challenge.id;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS learning_class_challenge_on_completion ON public.completions;
CREATE TRIGGER learning_class_challenge_on_completion
  AFTER INSERT ON public.completions
  FOR EACH ROW EXECUTE FUNCTION public.record_learning_class_challenge_completion();

CREATE OR REPLACE FUNCTION public.get_learning_class_challenges(p_class_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_challenges JSONB;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_learning_class_member(p_class_id, v_user_id) THEN RAISE EXCEPTION 'Not authorized for this classroom'; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id, 'title', c.title, 'description', c.description, 'target_count', c.target_count,
    'current_count', c.current_count, 'ends_at', c.ends_at, 'completed_at', c.completed_at,
    'reward_points', c.reward_points,
    'my_contributions', (SELECT COUNT(*) FROM public.learning_class_challenge_contributions p WHERE p.challenge_id = c.id AND p.user_id = v_user_id),
    'claimed', EXISTS (SELECT 1 FROM public.learning_class_challenge_claims cl WHERE cl.challenge_id = c.id AND cl.user_id = v_user_id)
  ) ORDER BY c.ends_at ASC), '[]'::jsonb)
  INTO v_challenges
  FROM public.learning_class_challenges c
  WHERE c.class_id = p_class_id AND c.ends_at >= now() - INTERVAL '7 days';
  RETURN jsonb_build_object('challenges', v_challenges);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_learning_class_challenge(p_challenge_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_challenge public.learning_class_challenges%ROWTYPE;
  v_rows INTEGER := 0;
  v_reward JSONB;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_challenge FROM public.learning_class_challenges WHERE id = p_challenge_id FOR UPDATE;
  IF NOT FOUND OR NOT public.is_learning_class_member(v_challenge.class_id, v_user_id) THEN RAISE EXCEPTION 'Not authorized for this challenge'; END IF;
  IF v_challenge.completed_at IS NULL THEN RAISE EXCEPTION 'Challenge is not complete yet'; END IF;
  INSERT INTO public.learning_class_challenge_claims(challenge_id, user_id)
  VALUES (p_challenge_id, v_user_id) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RETURN jsonb_build_object('claimed', false, 'message', 'Already claimed'); END IF;
  v_reward := public.grant_reward_points(v_user_id, v_challenge.reward_points, 'class_challenge', 'class_challenge:' || p_challenge_id::text, p_challenge_id::text, jsonb_build_object('class_id', v_challenge.class_id));
  RETURN jsonb_build_object('claimed', true, 'points', COALESCE((v_reward->>'points_awarded')::integer, 0));
END;
$$;

INSERT INTO public.reward_badges (id, name, name_ar, description, description_ar, icon, sort_order)
VALUES ('season_learning_sprint', 'Learning Sprint', 'عدّاء التعلّم', 'Earned by completing a seasonal learning sprint.', 'تُكتسب بإكمال موسم تعليمي قصير.', 'sparkles', 90)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.seasons (id, name, name_ar, description, description_ar, start_date, end_date, is_active, is_archived, prize_description, rules_text, rules_text_ar)
SELECT 'learning_sprint_2026', 'Learning Sprint', 'سباق التعلّم', 'A four-week learning season with a fair earned reward choice.', 'موسم تعليمي لأربعة أسابيع مع اختيار مكافأة مكتسبة وعادلة.', now(), now() + INTERVAL '28 days', true, false, 'Choose one earned season reward.', 'Complete three quizzes during the season to choose one reward.', 'أكمل ثلاثة اختبارات خلال الموسم لاختيار مكافأة واحدة.'
WHERE NOT EXISTS (SELECT 1 FROM public.seasons WHERE is_active = true AND is_archived = false AND start_date <= now() AND end_date >= now());

INSERT INTO public.learning_season_reward_choices(season_id, choice_key, reward_type, reward_amount, reward_badge_id, required_quizzes)
SELECT s.id, v.choice_key, v.reward_type, v.reward_amount, v.reward_badge_id, 3
FROM public.seasons s
CROSS JOIN (VALUES
  ('focus_points', 'points', 120, NULL::text),
  ('focus_coins', 'coins', 25, NULL::text),
  ('focus_badge', 'badge', 0, 'season_learning_sprint'::text)
) AS v(choice_key, reward_type, reward_amount, reward_badge_id)
WHERE s.is_active = true AND s.is_archived = false AND s.start_date <= now() AND s.end_date >= now()
ON CONFLICT (season_id, choice_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_active_learning_season()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_season public.seasons%ROWTYPE;
  v_completed INTEGER := 0;
  v_choices JSONB;
  v_claim TEXT;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT s.* INTO v_season FROM public.seasons s
  WHERE s.is_active = true AND s.is_archived = false AND s.start_date <= now() AND s.end_date >= now()
    AND EXISTS (SELECT 1 FROM public.learning_season_reward_choices c WHERE c.season_id = s.id AND c.is_active = true)
  ORDER BY s.end_date ASC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('season', null, 'choices', '[]'::jsonb); END IF;
  SELECT COUNT(*)::integer INTO v_completed FROM public.completions c
  WHERE c.taker_id = v_user_id AND c.created_at >= v_season.start_date AND c.created_at <= v_season.end_date;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('key', c.choice_key, 'type', c.reward_type, 'amount', c.reward_amount, 'badge_id', c.reward_badge_id, 'required_quizzes', c.required_quizzes) ORDER BY c.choice_key), '[]'::jsonb)
    INTO v_choices FROM public.learning_season_reward_choices c WHERE c.season_id = v_season.id AND c.is_active = true;
  SELECT choice_key INTO v_claim FROM public.learning_season_reward_claims WHERE season_id = v_season.id AND user_id = v_user_id;
  RETURN jsonb_build_object('season', jsonb_build_object('id', v_season.id, 'name', v_season.name, 'name_ar', v_season.name_ar, 'description', v_season.description, 'description_ar', v_season.description_ar, 'ends_at', v_season.end_date), 'completed_quizzes', v_completed, 'choices', v_choices, 'claimed_choice', v_claim);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_learning_season_reward(p_season_id TEXT, p_choice_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_season public.seasons%ROWTYPE;
  v_choice public.learning_season_reward_choices%ROWTYPE;
  v_completed INTEGER := 0;
  v_reward JSONB;
  v_rows INTEGER := 0;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_season FROM public.seasons WHERE id = p_season_id AND is_active = true AND is_archived = false AND start_date <= now() AND end_date >= now();
  IF NOT FOUND THEN RAISE EXCEPTION 'Season is not active'; END IF;
  SELECT * INTO v_choice FROM public.learning_season_reward_choices WHERE season_id = p_season_id AND choice_key = p_choice_key AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reward choice not found'; END IF;
  SELECT COUNT(*)::integer INTO v_completed FROM public.completions WHERE taker_id = v_user_id AND created_at >= v_season.start_date AND created_at <= v_season.end_date;
  IF v_completed < v_choice.required_quizzes THEN RAISE EXCEPTION 'Season requirement is not complete'; END IF;
  INSERT INTO public.learning_season_reward_claims(season_id, user_id, choice_key) VALUES (p_season_id, v_user_id, p_choice_key) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RETURN jsonb_build_object('claimed', false, 'message', 'A season reward was already selected'); END IF;
  IF v_choice.reward_type = 'points' THEN
    v_reward := public.grant_reward_points(v_user_id, v_choice.reward_amount, 'season_reward', 'season_reward:' || p_season_id, p_season_id, jsonb_build_object('choice', p_choice_key));
  ELSIF v_choice.reward_type = 'coins' THEN
    v_reward := public.grant_reward_coins(v_user_id, v_choice.reward_amount, 'season_reward', 'season_reward:' || p_season_id, p_season_id, jsonb_build_object('choice', p_choice_key));
  ELSE
    INSERT INTO public.user_reward_badges(user_id, badge_id) VALUES (v_user_id, v_choice.reward_badge_id) ON CONFLICT DO NOTHING;
    INSERT INTO public.reward_points_ledger(user_id, points, event_type, event_key, reference_id, metadata)
    VALUES (v_user_id, 0, 'season_reward', 'season_reward:' || p_season_id, p_season_id, jsonb_build_object('choice', p_choice_key, 'badge_id', v_choice.reward_badge_id)) ON CONFLICT DO NOTHING;
    v_reward := jsonb_build_object('badge_id', v_choice.reward_badge_id);
  END IF;
  RETURN jsonb_build_object('claimed', true, 'choice', p_choice_key, 'reward', v_reward);
END;
$$;

REVOKE ALL ON FUNCTION public.grant_reward_points(TEXT, INTEGER, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_reward_coins(TEXT, INTEGER, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_learning_class_member(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_learning_class_challenge_completion() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_daily_streak() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_smart_review_cards() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_personal_learning_improvement() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_learning_class_challenge(TEXT, TEXT, TEXT, INTEGER, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_learning_class_challenges(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_learning_class_challenge(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_active_learning_season() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_learning_season_reward(TEXT, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.update_daily_streak() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_smart_review_cards() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_personal_learning_improvement() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_learning_class_challenge(TEXT, TEXT, TEXT, INTEGER, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_learning_class_challenges(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_learning_class_challenge(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_learning_season() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_learning_season_reward(TEXT, TEXT) TO authenticated;
