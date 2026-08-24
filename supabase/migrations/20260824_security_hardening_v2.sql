-- QuizSpace security hardening v2
-- This migration is intentionally additive and does not mutate existing user data.
-- It removes broad policies, exposes only allow-listed public fields, and binds
-- sensitive mutations to auth.uid().

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE uid = auth.uid()::text
      AND is_admin IS TRUE
  );
$$;
REVOKE ALL ON FUNCTION public.current_user_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;

-- ---------------------------------------------------------------------------
-- Safe public profile surface. Private fields stay in public.users and are
-- readable only by the owner or an administrator.
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_barrier = true)
AS
SELECT
  uid,
  name,
  photo_url,
  bio,
  location,
  custom_id,
  badge_tier,
  badge_symbol,
  badge_color,
  name_color,
  cover_url,
  is_premium
FROM public.users;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

DROP POLICY IF EXISTS users_read_own ON public.users;
DROP POLICY IF EXISTS users_read_policy ON public.users;
DROP POLICY IF EXISTS users_insert_own ON public.users;
DROP POLICY IF EXISTS users_insert_policy ON public.users;
DROP POLICY IF EXISTS users_update_own ON public.users;
DROP POLICY IF EXISTS users_admin_update_all ON public.users;
DROP POLICY IF EXISTS users_admin_update_own_team ON public.users;
DROP POLICY IF EXISTS users_admin_all ON public.users;
CREATE POLICY users_read_self_or_admin
  ON public.users FOR SELECT TO authenticated
  USING ((auth.uid()::text = uid) OR public.current_user_is_admin());
CREATE POLICY users_insert_self
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = uid);
CREATE POLICY users_update_self_or_admin
  ON public.users FOR UPDATE TO authenticated
  USING ((auth.uid()::text = uid) OR public.current_user_is_admin())
  WITH CHECK ((auth.uid()::text = uid) OR public.current_user_is_admin());

CREATE OR REPLACE FUNCTION public.admin_list_profiles()
RETURNS SETOF public.users
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  RETURN QUERY SELECT u FROM public.users u ORDER BY u.created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_profiles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;

-- ---------------------------------------------------------------------------
-- Public completion feed: no feedback, email, or private metadata.
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.public_completion_feed;
CREATE VIEW public.public_completion_feed
WITH (security_barrier = true)
AS
SELECT
  id,
  quiz_id,
  quiz_title,
  taker_id,
  taker_name,
  score,
  total_questions,
  rating,
  created_at,
  attempt_number,
  is_best
FROM public.completions;
GRANT SELECT ON public.public_completion_feed TO anon, authenticated;

DROP POLICY IF EXISTS completions_read_own ON public.completions;
DROP POLICY IF EXISTS completions_read_public ON public.completions;
DROP POLICY IF EXISTS completions_insert_own ON public.completions;
DROP POLICY IF EXISTS completions_update_own ON public.completions;
CREATE POLICY completions_read_self_or_admin
  ON public.completions FOR SELECT TO authenticated
  USING ((auth.uid()::text = taker_id) OR public.current_user_is_admin());
CREATE POLICY completions_insert_self
  ON public.completions FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = taker_id);
CREATE POLICY completions_update_self_or_admin
  ON public.completions FOR UPDATE TO authenticated
  USING ((auth.uid()::text = taker_id) OR public.current_user_is_admin())
  WITH CHECK ((auth.uid()::text = taker_id) OR public.current_user_is_admin());

CREATE OR REPLACE FUNCTION public.protect_completion_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
BEGIN
  IF public.current_user_is_admin() THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NULL OR NEW.taker_id <> auth.uid()::text OR OLD.taker_id <> auth.uid()::text THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW.id IS DISTINCT FROM OLD.id OR
    NEW.quiz_id IS DISTINCT FROM OLD.quiz_id OR
    NEW.quiz_title IS DISTINCT FROM OLD.quiz_title OR
    NEW.taker_id IS DISTINCT FROM OLD.taker_id OR
    NEW.taker_name IS DISTINCT FROM OLD.taker_name OR
    NEW.score IS DISTINCT FROM OLD.score OR
    NEW.total_questions IS DISTINCT FROM OLD.total_questions OR
    NEW.attempt_number IS DISTINCT FROM OLD.attempt_number OR
    NEW.is_best IS DISTINCT FROM OLD.is_best OR
    NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'Only rating and feedback may be edited';
  END IF;
  SELECT COALESCE(jsonb_array_length(q.questions), 0)
    INTO v_total
    FROM public.quizzes q
   WHERE q.id = NEW.quiz_id;
  IF TG_OP = 'INSERT' AND (v_total IS NULL OR v_total <= 0 OR NEW.total_questions <> v_total OR NEW.score < 0 OR NEW.score > v_total) THEN
    RAISE EXCEPTION 'Invalid completion score';
  END IF;
  IF NEW.rating IS NOT NULL AND (NEW.rating < 1 OR NEW.rating > 5) THEN
    RAISE EXCEPTION 'Invalid rating';
  END IF;
  IF NEW.feedback IS NOT NULL AND char_length(NEW.feedback) > 2000 THEN
    RAISE EXCEPTION 'Feedback is too long';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_completion_integrity_trigger ON public.completions;
CREATE TRIGGER protect_completion_integrity_trigger
BEFORE INSERT OR UPDATE ON public.completions
FOR EACH ROW EXECUTE FUNCTION public.protect_completion_integrity();
REVOKE ALL ON FUNCTION public.protect_completion_integrity() FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- Atomic, validated quiz submission and review update.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
  p_quiz_id text,
  p_taker_id text,
  p_taker_name text,
  p_score integer,
  p_rating integer DEFAULT NULL,
  p_feedback text DEFAULT ''
)
RETURNS TABLE(
  id text,
  quiz_id text,
  taker_id text,
  taker_name text,
  score integer,
  total_questions integer,
  rating integer,
  feedback text,
  created_at timestamptz,
  attempt_number integer,
  is_best boolean,
  xp_awarded integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completion_id text;
  v_total_questions integer;
  v_attempt_number integer;
  v_previous_best integer;
  v_score integer := COALESCE(p_score, -1);
  v_xp_awarded integer;
  v_is_best boolean;
  v_quiz_title text;
BEGIN
  IF auth.uid() IS NULL OR auth.uid()::text <> p_taker_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_quiz_id IS NULL OR char_length(trim(p_quiz_id)) = 0 OR char_length(p_quiz_id) > 200 THEN
    RAISE EXCEPTION 'Invalid quiz';
  END IF;
  IF p_taker_name IS NULL OR char_length(trim(p_taker_name)) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'Invalid taker name';
  END IF;
  IF p_rating IS NOT NULL AND (p_rating < 1 OR p_rating > 5) THEN
    RAISE EXCEPTION 'Invalid rating';
  END IF;
  IF p_feedback IS NOT NULL AND char_length(p_feedback) > 2000 THEN
    RAISE EXCEPTION 'Feedback is too long';
  END IF;

  SELECT q.title, COALESCE(jsonb_array_length(q.questions), 0)
    INTO v_quiz_title, v_total_questions
    FROM public.quizzes q
   WHERE q.id = p_quiz_id
   FOR SHARE;
  IF NOT FOUND OR v_total_questions <= 0 THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;
  IF v_score < 0 OR v_score > v_total_questions THEN
    RAISE EXCEPTION 'Invalid score';
  END IF;

  SELECT COUNT(*)::integer, COALESCE(MAX(c.score), 0)
    INTO v_attempt_number, v_previous_best
    FROM public.completions c
   WHERE c.quiz_id = p_quiz_id AND c.taker_id = p_taker_id;
  v_attempt_number := v_attempt_number + 1;
  v_is_best := v_attempt_number = 1 OR v_score > v_previous_best;
  v_xp_awarded := CASE
    WHEN v_attempt_number = 1 THEN 10 + (v_score * 10)
    ELSE GREATEST(0, v_score - v_previous_best) * 10
  END;

  v_completion_id := 'comp_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 10);
  IF v_is_best THEN
    UPDATE public.completions
       SET is_best = false
     WHERE quiz_id = p_quiz_id AND taker_id = p_taker_id;
  END IF;

  INSERT INTO public.completions (
    id, quiz_id, quiz_title, taker_id, taker_name, score, total_questions,
    rating, feedback, attempt_number, is_best
  ) VALUES (
    v_completion_id, p_quiz_id, v_quiz_title, p_taker_id, trim(p_taker_name),
    v_score, v_total_questions, p_rating, COALESCE(p_feedback, ''),
    v_attempt_number, v_is_best
  );

  IF v_xp_awarded > 0 THEN
    UPDATE public.users
       SET xp = COALESCE(xp, 0) + v_xp_awarded,
           updated_at = now()
     WHERE uid = p_taker_id;
  END IF;

  RETURN QUERY
  SELECT c.id, c.quiz_id, c.taker_id, c.taker_name, c.score, c.total_questions,
         c.rating, c.feedback, c.created_at, c.attempt_number, c.is_best,
         v_xp_awarded
    FROM public.completions c
   WHERE c.id = v_completion_id;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_quiz_attempt(text, text, text, integer, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(text, text, text, integer, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_completion_review(
  p_completion_id text,
  p_rating integer,
  p_feedback text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_completion_id IS NULL OR p_rating IS NULL OR p_rating < 1 OR p_rating > 5 OR char_length(COALESCE(p_feedback, '')) > 2000 THEN
    RAISE EXCEPTION 'Invalid review';
  END IF;
  UPDATE public.completions
     SET rating = p_rating,
         feedback = COALESCE(p_feedback, '')
   WHERE id = p_completion_id
     AND taker_id = auth.uid()::text;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Completion not found';
  END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.update_completion_review(text, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_completion_review(text, integer, text) TO authenticated;

-- Legacy function references a removed table and must not remain callable.
REVOKE ALL ON FUNCTION public.submit_quiz_attempt_secure(text, integer, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_quiz_attempt_secure(text, integer, integer, integer) FROM authenticated;

-- ---------------------------------------------------------------------------
-- Like mutation: bind p_user_id to auth.uid() and lock the row.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.toggle_post_like(p_post_id text, p_user_id text)
RETURNS TABLE(likes integer, liked_by jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post public.community_posts%ROWTYPE;
  v_liked_by jsonb;
  v_uid text := auth.uid()::text;
BEGIN
  IF v_uid IS NULL OR p_user_id IS NULL OR p_user_id <> v_uid THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO v_post
    FROM public.community_posts
   WHERE id = p_post_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found';
  END IF;
  v_liked_by := CASE WHEN jsonb_typeof(v_post.liked_by) = 'array' THEN v_post.liked_by ELSE '[]'::jsonb END;
  IF v_liked_by @> to_jsonb(v_uid) THEN
    v_liked_by := v_liked_by - v_uid;
  ELSE
    v_liked_by := v_liked_by || to_jsonb(v_uid);
  END IF;
  UPDATE public.community_posts
     SET likes = jsonb_array_length(v_liked_by), liked_by = v_liked_by, updated_at = now()
   WHERE id = p_post_id;
  RETURN QUERY SELECT jsonb_array_length(v_liked_by), v_liked_by;
END;
$$;
REVOKE ALL ON FUNCTION public.toggle_post_like(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_post_like(text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Notifications: targeted rows are private; broadcasts are admin-only.
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY['info','community','system','promotion','lesson','weekly_task','direct_message']));
DROP POLICY IF EXISTS notifications_own_access ON public.notifications;
DROP POLICY IF EXISTS notifications_read_own ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_authenticated ON public.notifications;
DROP POLICY IF EXISTS notifications_read_targeted ON public.notifications;
CREATE POLICY notifications_read_scoped
  ON public.notifications FOR SELECT TO authenticated
  USING ((user_id = auth.uid()::text) OR (user_id IS NULL));
CREATE POLICY notifications_insert_self_or_admin
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK ((user_id = auth.uid()::text) OR public.current_user_is_admin());
CREATE POLICY notifications_update_self
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id text,
  p_title text,
  p_body text,
  p_sender_name text DEFAULT 'System',
  p_type text DEFAULT 'info'
)
RETURNS public.notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.notifications;
  v_uid text := auth.uid()::text;
BEGIN
  IF v_uid IS NULL OR p_title IS NULL OR char_length(trim(p_title)) NOT BETWEEN 1 AND 200 OR char_length(COALESCE(p_body, '')) > 2000 THEN
    RAISE EXCEPTION 'Invalid notification';
  END IF;
  IF p_type NOT IN ('info','community','system','promotion','lesson','weekly_task','direct_message') THEN
    RAISE EXCEPTION 'Invalid notification type';
  END IF;
  IF p_user_id IS NULL AND NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF p_user_id IS NOT NULL AND p_user_id <> v_uid AND NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  INSERT INTO public.notifications (id, user_id, title, body, sender_name, type, created_at)
  VALUES ('notif-' || gen_random_uuid()::text, p_user_id, trim(p_title), COALESCE(p_body, ''), COALESCE(NULLIF(trim(p_sender_name), ''), 'System'), p_type, now())
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.create_notification(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_notification(text, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_direct_message_notification(
  p_recipient_id text,
  p_sender_name text,
  p_preview text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid text := auth.uid()::text;
BEGIN
  IF v_uid IS NULL OR p_recipient_id IS NULL OR p_recipient_id = v_uid OR char_length(COALESCE(p_preview, '')) > 200 THEN
    RAISE EXCEPTION 'Invalid direct notification';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.direct_messages
    WHERE sender_id = v_uid AND receiver_id = p_recipient_id
      AND created_at >= now() - interval '5 minutes'
  ) THEN
    RAISE EXCEPTION 'No recent direct message found';
  END IF;
  INSERT INTO public.notifications (id, user_id, type, title, body, sender_name, is_read, created_at)
  VALUES ('notif-dm-' || gen_random_uuid()::text, p_recipient_id, 'direct_message', 'رسالة مباشرة جديدة',
          format('%s أرسل لك رسالة: "%s"', COALESCE(NULLIF(trim(p_sender_name), ''), 'عضو'), COALESCE(p_preview, '')),
          COALESCE(NULLIF(trim(p_sender_name), ''), 'System'), false, now());
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.create_direct_message_notification(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_direct_message_notification(text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_followers_about_quiz(p_quiz_id text, p_quiz_title text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid text := auth.uid()::text;
  v_name text;
  v_count integer := 0;
BEGIN
  IF v_uid IS NULL OR p_quiz_id IS NULL OR char_length(COALESCE(p_quiz_title, '')) > 240 THEN
    RAISE EXCEPTION 'Invalid quiz notification';
  END IF;
  SELECT creator_name INTO v_name FROM public.quizzes WHERE id = p_quiz_id AND creator_id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;
  INSERT INTO public.notifications (id, user_id, type, title, body, sender_name, resource_type, resource_id, is_read, created_at)
  SELECT 'notif-fq-' || v_uid || '-' || p_quiz_id || '-' || f.follower_id,
         f.follower_id, 'info', 'كويز جديد من شخص تتابعه',
         left(COALESCE(v_name, 'عضو') || ' نشر كويزاً جديداً: ' || p_quiz_title, 220),
         COALESCE(v_name, 'QuizSpace'), 'quiz', p_quiz_id, false, now()
    FROM public.follows f
   WHERE f.following_id = v_uid AND f.follower_id <> v_uid
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_followers_about_quiz(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_followers_about_quiz(text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Classroom roster privacy and admin-only featured quiz management.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS classroom_students_read ON public.classroom_students;
DROP POLICY IF EXISTS classroom_students_admin_write ON public.classroom_students;
DROP POLICY IF EXISTS classroom_students_insert_own ON public.classroom_students;
CREATE POLICY classroom_students_read_scoped
  ON public.classroom_students FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = class_id AND c.created_by = auth.uid()::text)
    OR public.current_user_is_admin()
  );
CREATE POLICY classroom_students_insert_scoped
  ON public.classroom_students FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = class_id AND c.created_by = auth.uid()::text)
    OR public.current_user_is_admin()
  );

CREATE OR REPLACE FUNCTION public.touch_classroom_presence(p_class_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_class_code IS NULL OR char_length(p_class_code) > 100 THEN
    RAISE EXCEPTION 'Invalid classroom';
  END IF;
  UPDATE public.classroom_students
     SET last_active = now()
   WHERE class_code = p_class_code AND student_id = auth.uid()::text;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.touch_classroom_presence(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_classroom_presence(text) TO authenticated;

DROP POLICY IF EXISTS featured_quizzes_insert ON public.featured_quizzes;
DROP POLICY IF EXISTS featured_quizzes_delete ON public.featured_quizzes;
CREATE POLICY featured_quizzes_admin_insert
  ON public.featured_quizzes FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_admin());
CREATE POLICY featured_quizzes_admin_update
  ON public.featured_quizzes FOR UPDATE TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());
CREATE POLICY featured_quizzes_admin_delete
  ON public.featured_quizzes FOR DELETE TO authenticated
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Users can read progress" ON public.group_challenge_progress;
CREATE POLICY group_challenge_progress_scoped_read
  ON public.group_challenge_progress FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.group_challenges gc
      JOIN public.classrooms c ON c.id = gc.class_id
      WHERE gc.id = challenge_id AND (c.created_by = auth.uid()::text OR public.current_user_is_admin())
    )
  );
DROP POLICY IF EXISTS "Class members can read challenges" ON public.group_challenges;
CREATE POLICY group_challenges_scoped_read
  ON public.group_challenges FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.classroom_students cs WHERE cs.class_id = group_challenges.class_id AND cs.student_id = auth.uid()::text)
    OR public.current_user_is_admin()
  );

NOTIFY pgrst, 'reload schema';
