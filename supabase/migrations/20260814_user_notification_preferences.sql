CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  user_id TEXT PRIMARY KEY REFERENCES public.users(uid) ON DELETE CASCADE,
  email_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  rank_updates BOOLEAN NOT NULL DEFAULT TRUE,
  weekly_reports BOOLEAN NOT NULL DEFAULT FALSE,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_notification_preferences_select_own ON public.user_notification_preferences;
CREATE POLICY user_notification_preferences_select_own
  ON public.user_notification_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid())::text);

DROP POLICY IF EXISTS user_notification_preferences_insert_own ON public.user_notification_preferences;
CREATE POLICY user_notification_preferences_insert_own
  ON public.user_notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid())::text);

DROP POLICY IF EXISTS user_notification_preferences_update_own ON public.user_notification_preferences;
CREATE POLICY user_notification_preferences_update_own
  ON public.user_notification_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid())::text)
  WITH CHECK (user_id = (select auth.uid())::text);

GRANT SELECT, INSERT, UPDATE ON public.user_notification_preferences TO authenticated;
