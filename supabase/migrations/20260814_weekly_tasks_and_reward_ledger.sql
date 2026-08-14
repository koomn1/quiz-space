-- Weekly learning tasks are evaluated lazily when a signed-in user opens or claims them.
-- This avoids a background scheduler while keeping every grant server-authorized and idempotent.

ALTER TABLE public.reward_points_ledger
  ADD COLUMN IF NOT EXISTS coins INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.weekly_task_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('quiz_completion', 'high_score', 'quiz_creation')),
  target INTEGER NOT NULL CHECK (target > 0),
  points_reward INTEGER NOT NULL CHECK (points_reward >= 0),
  coins_reward INTEGER NOT NULL CHECK (coins_reward >= 0),
  icon TEXT NOT NULL DEFAULT 'target',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.user_weekly_task_progress (
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  task_id TEXT NOT NULL REFERENCES public.weekly_task_templates(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0),
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, week_start, task_id)
);

CREATE INDEX IF NOT EXISTS user_weekly_task_progress_user_week_idx
  ON public.user_weekly_task_progress(user_id, week_start DESC);

ALTER TABLE public.weekly_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_weekly_task_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS weekly_task_templates_read ON public.weekly_task_templates;
CREATE POLICY weekly_task_templates_read ON public.weekly_task_templates
  FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS weekly_task_progress_own_read ON public.user_weekly_task_progress;
CREATE POLICY weekly_task_progress_own_read ON public.user_weekly_task_progress
  FOR SELECT TO authenticated USING (user_id = (select auth.uid())::text);

INSERT INTO public.weekly_task_templates
  (id, name, name_ar, description, description_ar, event_type, target, points_reward, coins_reward, icon, sort_order, is_active)
VALUES
  ('weekly_complete_three', 'Three quizzes', 'أكمل ثلاثة اختبارات', 'Complete three quizzes this week.', 'أكمل ثلاثة اختبارات خلال هذا الأسبوع.', 'quiz_completion', 3, 75, 10, 'book-open', 1, true),
  ('weekly_high_score', 'High score', 'نتيجة متفوقة', 'Achieve a score of 80% or higher once this week.', 'احصل على نتيجة 80% أو أكثر مرة واحدة هذا الأسبوع.', 'high_score', 1, 50, 5, 'trophy', 2, true),
  ('weekly_create_quiz', 'Knowledge creator', 'أنشئ اختباراً', 'Create one quiz for learners this week.', 'أنشئ اختباراً واحداً للمتعلمين هذا الأسبوع.', 'quiz_creation', 1, 40, 5, 'pencil', 3, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  event_type = EXCLUDED.event_type,
  target = EXCLUDED.target,
  points_reward = EXCLUDED.points_reward,
  coins_reward = EXCLUDED.coins_reward,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

CREATE OR REPLACE FUNCTION public.refresh_current_weekly_tasks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_week_start DATE := date_trunc('week', timezone('UTC', now()))::date;
  v_completed_quizzes INTEGER := 0;
  v_high_scores INTEGER := 0;
  v_created_quizzes INTEGER := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  INSERT INTO public.user_weekly_task_progress (user_id, week_start, task_id)
  SELECT v_user_id, v_week_start, template.id
  FROM public.weekly_task_templates AS template
  WHERE template.is_active = true
  ON CONFLICT (user_id, week_start, task_id) DO NOTHING;

  SELECT COUNT(*)::integer INTO v_completed_quizzes
  FROM public.completions
  WHERE taker_id::text = v_user_id AND created_at >= v_week_start;

  SELECT COUNT(*)::integer INTO v_high_scores
  FROM public.completions
  WHERE taker_id::text = v_user_id
    AND created_at >= v_week_start
    AND total_questions > 0
    AND score::numeric / total_questions::numeric >= 0.80;

  SELECT COUNT(*)::integer INTO v_created_quizzes
  FROM public.quizzes
  WHERE creator_id::text = v_user_id AND created_at >= v_week_start;

  UPDATE public.user_weekly_task_progress AS progress
  SET
    progress = LEAST(template.target, CASE template.event_type
      WHEN 'quiz_completion' THEN v_completed_quizzes
      WHEN 'high_score' THEN v_high_scores
      WHEN 'quiz_creation' THEN v_created_quizzes
      ELSE 0
    END),
    completed_at = CASE
      WHEN LEAST(template.target, CASE template.event_type
        WHEN 'quiz_completion' THEN v_completed_quizzes
        WHEN 'high_score' THEN v_high_scores
        WHEN 'quiz_creation' THEN v_created_quizzes
        ELSE 0
      END) >= template.target AND progress.completed_at IS NULL THEN now()
      ELSE progress.completed_at
    END,
    updated_at = now()
  FROM public.weekly_task_templates AS template
  WHERE progress.user_id = v_user_id
    AND progress.week_start = v_week_start
    AND progress.task_id = template.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_weekly_tasks()
RETURNS TABLE (
  id TEXT,
  name TEXT,
  name_ar TEXT,
  description TEXT,
  description_ar TEXT,
  event_type TEXT,
  target INTEGER,
  points_reward INTEGER,
  coins_reward INTEGER,
  icon TEXT,
  sort_order INTEGER,
  progress INTEGER,
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_week_start DATE := date_trunc('week', timezone('UTC', now()))::date;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  PERFORM public.refresh_current_weekly_tasks();

  RETURN QUERY
  SELECT template.id, template.name, template.name_ar, template.description, template.description_ar,
    template.event_type, template.target, template.points_reward, template.coins_reward,
    template.icon, template.sort_order, progress.progress, progress.completed_at, progress.claimed_at
  FROM public.weekly_task_templates AS template
  JOIN public.user_weekly_task_progress AS progress
    ON progress.task_id = template.id
    AND progress.user_id = v_user_id
    AND progress.week_start = v_week_start
  WHERE template.is_active = true
  ORDER BY template.sort_order, template.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_weekly_task(p_task_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_week_start DATE := date_trunc('week', timezone('UTC', now()))::date;
  v_task RECORD;
  v_rows INTEGER := 0;
  v_event_key TEXT;
  v_total_points INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  IF p_task_id IS NULL OR char_length(trim(p_task_id)) = 0 OR char_length(p_task_id) > 100 THEN
    RAISE EXCEPTION 'Invalid task';
  END IF;

  PERFORM public.refresh_current_weekly_tasks();

  SELECT template.*, progress.progress, progress.claimed_at
  INTO v_task
  FROM public.user_weekly_task_progress AS progress
  JOIN public.weekly_task_templates AS template ON template.id = progress.task_id
  WHERE progress.user_id = v_user_id
    AND progress.week_start = v_week_start
    AND progress.task_id = p_task_id
    AND template.is_active = true
  FOR UPDATE OF progress;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;
  IF v_task.claimed_at IS NOT NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'already_claimed');
  END IF;
  IF v_task.progress < v_task.target THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'not_complete', 'progress', v_task.progress, 'target', v_task.target);
  END IF;

  v_event_key := format('weekly_task:%s:%s', v_week_start, v_task.id);
  INSERT INTO public.reward_points_ledger (user_id, points, coins, event_type, event_key, reference_id, metadata)
  VALUES (v_user_id, v_task.points_reward, v_task.coins_reward, 'weekly_task', v_event_key, v_task.id,
    jsonb_build_object('task_id', v_task.id, 'task_name', v_task.name, 'task_name_ar', v_task.name_ar, 'week_start', v_week_start))
  ON CONFLICT (user_id, event_key) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    UPDATE public.user_weekly_task_progress
      SET claimed_at = coalesce(claimed_at, now()), updated_at = now()
      WHERE user_id = v_user_id AND week_start = v_week_start AND task_id = v_task.id;
    RETURN jsonb_build_object('claimed', false, 'reason', 'already_claimed');
  END IF;

  INSERT INTO public.user_reward_balances (user_id, points, coins, level)
  VALUES (v_user_id, v_task.points_reward, v_task.coins_reward, public.reward_level_for_points(v_task.points_reward))
  ON CONFLICT (user_id) DO UPDATE SET
    points = public.user_reward_balances.points + EXCLUDED.points,
    coins = public.user_reward_balances.coins + EXCLUDED.coins,
    level = public.reward_level_for_points(public.user_reward_balances.points + EXCLUDED.points),
    updated_at = now();

  UPDATE public.user_weekly_task_progress
    SET claimed_at = now(), updated_at = now()
    WHERE user_id = v_user_id AND week_start = v_week_start AND task_id = v_task.id;

  INSERT INTO public.notifications (id, user_id, type, title, body, sender_name, is_read, created_at)
  VALUES (
    'notif-weekly-' || gen_random_uuid()::text,
    v_user_id,
    'weekly_task',
    'مكافأة مهمة أسبوعية',
    format('حصلت على %s نقطة و%s عملة مقابل إكمال «%s».', v_task.points_reward, v_task.coins_reward, v_task.name_ar),
    'QuizSpace',
    false,
    now()
  );

  SELECT points INTO v_total_points
  FROM public.user_reward_balances
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'claimed', true,
    'points', v_task.points_reward,
    'coins', v_task.coins_reward,
    'total_points', coalesce(v_total_points, 0),
    'task_id', v_task.id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_current_weekly_tasks() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_current_weekly_tasks() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_weekly_task(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_weekly_tasks() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_weekly_task(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
