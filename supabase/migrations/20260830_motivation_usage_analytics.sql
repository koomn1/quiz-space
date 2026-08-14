-- Privacy-preserving Motivation Hub usage telemetry.
-- One row per authenticated learner, tab, event type, and UTC date keeps the
-- data set bounded and records daily unique engagement rather than click trails.

CREATE TABLE IF NOT EXISTS public.motivation_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  tab TEXT NOT NULL CHECK (tab IN (
    'motivation', 'motivation-lucky', 'motivation-brain', 'motivation-review',
    'motivation-season', 'motivation-duel', 'motivation-store'
  )),
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'engaged')),
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tab, event_type, event_date)
);

CREATE INDEX IF NOT EXISTS motivation_usage_events_date_tab_idx
  ON public.motivation_usage_events (event_date DESC, tab, event_type);

ALTER TABLE public.motivation_usage_events ENABLE ROW LEVEL SECURITY;

-- The client must use the validated RPC boundary.  Neither learners nor
-- administrators can read or alter raw event rows directly.
REVOKE ALL ON TABLE public.motivation_usage_events FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS motivation_usage_events_no_direct_access ON public.motivation_usage_events;
CREATE POLICY motivation_usage_events_no_direct_access
  ON public.motivation_usage_events
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.record_motivation_usage_event(
  p_tab TEXT,
  p_event_type TEXT DEFAULT 'view'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  IF p_tab NOT IN (
    'motivation', 'motivation-lucky', 'motivation-brain', 'motivation-review',
    'motivation-season', 'motivation-duel', 'motivation-store'
  ) OR p_event_type NOT IN ('view', 'engaged') THEN
    RAISE EXCEPTION 'Invalid motivation usage event';
  END IF;

  INSERT INTO public.motivation_usage_events (user_id, tab, event_type)
  VALUES (v_user_id, p_tab, p_event_type)
  ON CONFLICT (user_id, tab, event_type, event_date) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_motivation_usage_summary(
  p_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_days INTEGER := COALESCE(p_days, 30);
BEGIN
  IF v_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users WHERE uid = v_user_id AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Administrator privileges are required';
  END IF;

  IF v_days < 7 OR v_days > 90 THEN
    RAISE EXCEPTION 'Invalid reporting window';
  END IF;

  RETURN (
    WITH tabs(tab, sort_order) AS (
      VALUES
        ('motivation', 1), ('motivation-lucky', 2), ('motivation-brain', 3),
        ('motivation-review', 4), ('motivation-season', 5),
        ('motivation-duel', 6), ('motivation-store', 7)
    ), events AS (
      SELECT tab, event_type, event_date, user_id
      FROM public.motivation_usage_events
      WHERE event_date >= CURRENT_DATE - (v_days - 1)
    ), tab_stats AS (
      SELECT
        t.tab,
        t.sort_order,
        COUNT(e.*) FILTER (WHERE e.event_type = 'view')::INTEGER AS unique_daily_opens,
        COUNT(DISTINCT e.user_id) FILTER (WHERE e.event_type = 'view')::INTEGER AS unique_learners,
        COUNT(e.*) FILTER (WHERE e.event_type = 'engaged')::INTEGER AS unique_daily_engagements
      FROM tabs t
      LEFT JOIN events e ON e.tab = t.tab
      GROUP BY t.tab, t.sort_order
    ), daily_stats AS (
      SELECT
        d.day::DATE AS day,
        COUNT(e.*) FILTER (WHERE e.event_type = 'view')::INTEGER AS unique_daily_opens,
        COUNT(DISTINCT e.user_id) FILTER (WHERE e.event_type = 'view')::INTEGER AS unique_learners
      FROM generate_series(CURRENT_DATE - (v_days - 1), CURRENT_DATE, INTERVAL '1 day') AS d(day)
      LEFT JOIN events e ON e.event_date = d.day::DATE
      GROUP BY d.day
      ORDER BY d.day
    )
    SELECT jsonb_build_object(
      'window_days', v_days,
      'total_unique_daily_opens', COALESCE((SELECT SUM(unique_daily_opens) FROM tab_stats), 0),
      'total_unique_learners', COALESCE((SELECT COUNT(DISTINCT user_id) FROM events WHERE event_type = 'view'), 0),
      'total_unique_daily_engagements', COALESCE((SELECT SUM(unique_daily_engagements) FROM tab_stats), 0),
      'tabs', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'tab', tab,
        'unique_daily_opens', unique_daily_opens,
        'unique_learners', unique_learners,
        'unique_daily_engagements', unique_daily_engagements
      ) ORDER BY sort_order) FROM tab_stats), '[]'::JSONB),
      'daily', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'date', day,
        'unique_daily_opens', unique_daily_opens,
        'unique_learners', unique_learners
      ) ORDER BY day) FROM daily_stats), '[]'::JSONB)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_motivation_usage_event(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_motivation_usage_summary(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_motivation_usage_event(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_motivation_usage_summary(INTEGER) TO authenticated;

NOTIFY pgrst, 'reload schema';
