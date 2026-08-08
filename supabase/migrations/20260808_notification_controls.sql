-- Notification delivery tracking and per-user throttling controls.
CREATE TABLE IF NOT EXISTS public.push_notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('classroom', 'community', 'quiz', 'promotion', 'system')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_url TEXT NOT NULL DEFAULT '/',
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_events_user_category_opened
  ON public.push_notification_events(user_id, category, opened_at, delivered_at DESC);

CREATE TABLE IF NOT EXISTS public.push_notification_preferences (
  user_id TEXT PRIMARY KEY REFERENCES public.users(uid) ON DELETE CASCADE,
  classroom_missed_count INTEGER NOT NULL DEFAULT 0,
  classroom_paused BOOLEAN NOT NULL DEFAULT FALSE,
  last_promotion_at TIMESTAMPTZ,
  last_promotion_index INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.push_notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_events_select_own ON public.push_notification_events;
CREATE POLICY push_events_select_own ON public.push_notification_events FOR SELECT USING (auth.uid()::text = user_id);
DROP POLICY IF EXISTS push_events_update_own ON public.push_notification_events;
CREATE POLICY push_events_update_own ON public.push_notification_events FOR UPDATE USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
DROP POLICY IF EXISTS push_preferences_select_own ON public.push_notification_preferences;
CREATE POLICY push_preferences_select_own ON public.push_notification_preferences FOR SELECT USING (auth.uid()::text = user_id);
DROP POLICY IF EXISTS push_preferences_update_own ON public.push_notification_preferences;
CREATE POLICY push_preferences_update_own ON public.push_notification_preferences FOR UPDATE USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
GRANT SELECT, UPDATE ON public.push_notification_events TO authenticated;
GRANT SELECT, UPDATE ON public.push_notification_preferences TO authenticated;

CREATE OR REPLACE FUNCTION public.record_push_notification_open(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
BEGIN
  UPDATE public.push_notification_events
  SET opened_at = COALESCE(opened_at, now())
  WHERE id = p_event_id AND user_id = v_user_id;

  IF FOUND THEN
    UPDATE public.push_notification_preferences
    SET classroom_missed_count = 0,
        classroom_paused = FALSE,
        updated_at = now()
    WHERE user_id = v_user_id;
  END IF;
  RETURN jsonb_build_object('success', FOUND);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_push_notification_open(UUID) TO authenticated;
