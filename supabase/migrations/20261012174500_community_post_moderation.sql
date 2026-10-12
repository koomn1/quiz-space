-- Community moderation: owners may edit/delete within two minutes;
-- admins may moderate any post; the designated super admin has no time limit.

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_posts_delete_own ON public.community_posts;
DROP POLICY IF EXISTS community_posts_delete_author ON public.community_posts;
DROP POLICY IF EXISTS community_posts_update_author ON public.community_posts;

-- Mutations go through the SECURITY DEFINER RPCs below so the time window,
-- ownership and role checks cannot be bypassed by a browser client.

CREATE OR REPLACE FUNCTION public.community_is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid()::text = '00000000-0000-4000-8000-000000000001';
$$;

CREATE OR REPLACE FUNCTION public.update_community_post(
  p_post_id text,
  p_text text
)
RETURNS public.community_posts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post public.community_posts;
  v_uid text := auth.uid()::text;
  v_admin boolean := public.current_user_is_admin();
  v_super_admin boolean := public.community_is_super_admin();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_post_id IS NULL OR char_length(trim(p_post_id)) = 0 THEN
    RAISE EXCEPTION 'Invalid post';
  END IF;
  IF p_text IS NULL OR char_length(trim(p_text)) NOT BETWEEN 1 AND 5000 THEN
    RAISE EXCEPTION 'Post text must contain between 1 and 5000 characters';
  END IF;

  SELECT * INTO v_post
  FROM public.community_posts
  WHERE id = p_post_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  IF NOT v_super_admin AND NOT v_admin AND v_post.author_id <> v_uid THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF NOT v_super_admin AND NOT v_admin AND v_post.created_at < now() - interval '2 minutes' THEN
    RAISE EXCEPTION 'The edit window has expired';
  END IF;

  UPDATE public.community_posts
  SET text = trim(p_text), updated_at = now()
  WHERE id = p_post_id
  RETURNING * INTO v_post;
  RETURN v_post;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_community_post(p_post_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post public.community_posts;
  v_uid text := auth.uid()::text;
  v_admin boolean := public.current_user_is_admin();
  v_super_admin boolean := public.community_is_super_admin();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  SELECT * INTO v_post
  FROM public.community_posts
  WHERE id = p_post_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF NOT v_super_admin AND NOT v_admin AND v_post.author_id <> v_uid THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF NOT v_super_admin AND NOT v_admin AND v_post.created_at < now() - interval '2 minutes' THEN
    RAISE EXCEPTION 'The delete window has expired';
  END IF;

  DELETE FROM public.community_posts WHERE id = p_post_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.community_is_super_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_community_post(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_community_post(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.community_is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_community_post(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_community_post(text) TO authenticated;

NOTIFY pgrst, 'reload schema';
