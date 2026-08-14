-- Keep notification producers aligned with the database enum-like check.
-- A classroom lesson insert fires notify_classroom_lesson_created(), which
-- writes a notification of type 'lesson'. The original check did not allow it.
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('info', 'community', 'system', 'promotion', 'lesson'));

-- These two feature flags are intentionally public read-only configuration.
-- RLS continues to deny writes; updates remain available only through the
-- protected update_platform_settings RPC.
GRANT SELECT ON TABLE public.platform_settings TO anon, authenticated;
