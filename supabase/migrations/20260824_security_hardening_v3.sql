-- Follow-up hardening: completion review-only updates and race-safe like removal.

DROP POLICY IF EXISTS completions_update_self_or_admin ON public.completions;

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
  IF v_liked_by @> jsonb_build_array(v_uid) THEN
    SELECT COALESCE(jsonb_agg(value), '[]'::jsonb)
      INTO v_liked_by
      FROM jsonb_array_elements(v_liked_by)
     WHERE value <> to_jsonb(v_uid);
  ELSE
    v_liked_by := v_liked_by || jsonb_build_array(v_uid);
  END IF;
  UPDATE public.community_posts
     SET likes = jsonb_array_length(v_liked_by), liked_by = v_liked_by, updated_at = now()
   WHERE id = p_post_id;
  RETURN QUERY SELECT jsonb_array_length(v_liked_by), v_liked_by;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_completion_integrity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_post_like(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_post_like(text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
