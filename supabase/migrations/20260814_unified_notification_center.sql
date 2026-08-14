-- Route lesson and administrator events into each recipient's existing notifications table.

CREATE OR REPLACE FUNCTION public.notify_classroom_lesson_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.notifications (id, user_id, type, title, body, sender_name, is_read, created_at)
  SELECT
    'notif-lesson-' || gen_random_uuid()::text,
    student.student_id::text,
    'lesson',
    'حصة جديدة في الفصل',
    format('أضاف %s حصة جديدة بعنوان «%s».', coalesce(NEW.creator_name, 'المعلم'), NEW.title),
    coalesce(NEW.creator_name, 'QuizSpace'),
    false,
    now()
  FROM public.classroom_students AS student
  WHERE student.class_id = NEW.class_id
    AND student.student_id::text <> NEW.creator_id::text;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS classroom_lesson_notification ON public.classroom_lesson_videos;
CREATE TRIGGER classroom_lesson_notification
  AFTER INSERT ON public.classroom_lesson_videos
  FOR EACH ROW EXECUTE FUNCTION public.notify_classroom_lesson_created();

CREATE OR REPLACE FUNCTION public.broadcast_platform_notification(p_title TEXT, p_body TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_id TEXT := auth.uid()::text;
  v_is_admin BOOLEAN := false;
  v_count INTEGER := 0;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  IF p_title IS NULL OR char_length(trim(p_title)) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'Notification title must be between 1 and 120 characters';
  END IF;
  IF p_body IS NULL OR char_length(trim(p_body)) NOT BETWEEN 1 AND 800 THEN
    RAISE EXCEPTION 'Notification body must be between 1 and 800 characters';
  END IF;

  SELECT coalesce(is_admin, false) INTO v_is_admin
  FROM public.users
  WHERE uid::text = v_actor_id;
  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Administrator access is required';
  END IF;

  INSERT INTO public.notifications (id, user_id, type, title, body, sender_name, is_read, created_at)
  SELECT
    'notif-system-' || gen_random_uuid()::text,
    user_profile.uid::text,
    'system',
    trim(p_title),
    trim(p_body),
    'QuizSpace Administration',
    false,
    now()
  FROM public.users AS user_profile
  WHERE user_profile.uid IS NOT NULL
    AND user_profile.uid::text <> v_actor_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_classroom_lesson_created() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.broadcast_platform_notification(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.broadcast_platform_notification(TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
