-- Weekly-task claims create a user notification after the ledger and balance
-- updates. The type must be accepted so the entire claim transaction commits.
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('info', 'community', 'system', 'promotion', 'lesson', 'weekly_task'));
