-- Follower notifications for newly published quizzes.
-- Adds optional resource columns so a notification can deep-link to the quiz,
-- and allows inserting targeted notification rows while keeping reads public.

ALTER TABLE IF EXISTS public.notifications ADD COLUMN IF NOT EXISTS resource_type TEXT;
ALTER TABLE IF EXISTS public.notifications ADD COLUMN IF NOT EXISTS resource_id TEXT;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created
  ON public.notifications(user_id, created_at DESC);

DROP POLICY IF EXISTS notifications_insert_authenticated ON public.notifications;
CREATE POLICY notifications_insert_authenticated
  ON public.notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Targeted notifications: rows with a user_id are visible only to that user.
-- Rows without user_id remain part of the global broadcast feed.
DROP POLICY IF EXISTS notifications_read_targeted ON public.notifications;
CREATE POLICY notifications_read_targeted
  ON public.notifications
  FOR SELECT
  USING ((user_id IS NULL) OR (user_id IS NOT NULL AND auth.uid()::text = user_id));
