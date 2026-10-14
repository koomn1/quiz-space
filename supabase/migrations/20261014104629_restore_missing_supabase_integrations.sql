-- Restore database objects used by the web app but absent from the tracked
-- schema, and keep their access scoped to the authenticated owner.

-- Community reaction data is publicly readable for public post counts; all
-- writes go through the owner-checked RPC below.
CREATE TABLE IF NOT EXISTS public.post_reactions (
  post_id text NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  reaction text NOT NULL CHECK (reaction IN ('like', 'love', 'laugh', 'wow', 'sad', 'fire')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_reactions_user_id
  ON public.post_reactions (user_id);

ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.post_reactions FROM anon, authenticated;
GRANT SELECT ON public.post_reactions TO anon, authenticated;

-- Remove older permissive policies if the live project has them under legacy
-- names. PostgreSQL combines permissive policies with OR, so owner-scoped
-- policies below must not be weakened by an earlier policy.
DROP POLICY IF EXISTS post_reactions_own ON public.post_reactions;
DROP POLICY IF EXISTS post_reactions_read ON public.post_reactions;
DROP POLICY IF EXISTS post_reactions_public_read ON public.post_reactions;
CREATE POLICY post_reactions_public_read
  ON public.post_reactions FOR SELECT TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.toggle_post_reaction(
  p_post_id text,
  p_reaction text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id text := auth.uid()::text;
  v_previous_reaction text;
  v_counts jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_post_id IS NULL OR char_length(trim(p_post_id)) = 0 THEN
    RAISE EXCEPTION 'Invalid post';
  END IF;
  IF p_reaction IS NULL OR p_reaction NOT IN ('like', 'love', 'laugh', 'wow', 'sad', 'fire') THEN
    RAISE EXCEPTION 'Invalid reaction';
  END IF;

  -- Serialize changes for one post so toggles and aggregate counts stay exact.
  PERFORM 1 FROM public.community_posts WHERE id = p_post_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  SELECT reaction INTO v_previous_reaction
  FROM public.post_reactions
  WHERE post_id = p_post_id AND user_id = v_user_id;

  IF v_previous_reaction = p_reaction THEN
    DELETE FROM public.post_reactions
    WHERE post_id = p_post_id AND user_id = v_user_id;
    v_previous_reaction := NULL;
  ELSE
    INSERT INTO public.post_reactions (post_id, user_id, reaction)
    VALUES (p_post_id, v_user_id, p_reaction)
    ON CONFLICT (post_id, user_id) DO UPDATE
      SET reaction = EXCLUDED.reaction;
    v_previous_reaction := p_reaction;
  END IF;

  SELECT COALESCE(jsonb_object_agg(reaction, reaction_count), '{}'::jsonb)
  INTO v_counts
  FROM (
    SELECT reaction, count(*)::integer AS reaction_count
    FROM public.post_reactions
    WHERE post_id = p_post_id
    GROUP BY reaction
  ) AS counts;

  RETURN jsonb_build_object('counts', v_counts, 'myReaction', v_previous_reaction);
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_post_reaction(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_post_reaction(text, text) TO authenticated;

-- Persisted Cosmo chats are private to the owning user.
CREATE TABLE IF NOT EXISTS public.cosmo_conversations (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'محادثة جديدة' CHECK (char_length(title) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cosmo_conversations_user_updated_idx
  ON public.cosmo_conversations (user_id, updated_at DESC);

ALTER TABLE public.cosmo_conversations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cosmo_conversations FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cosmo_conversations TO authenticated;

DROP POLICY IF EXISTS cosmo_conversations_own ON public.cosmo_conversations;
DROP POLICY IF EXISTS cosmo_conversations_select_own ON public.cosmo_conversations;
CREATE POLICY cosmo_conversations_select_own
  ON public.cosmo_conversations FOR SELECT TO authenticated
  USING ((select auth.uid())::text = user_id);
DROP POLICY IF EXISTS cosmo_conversations_insert_own ON public.cosmo_conversations;
CREATE POLICY cosmo_conversations_insert_own
  ON public.cosmo_conversations FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid())::text = user_id);
DROP POLICY IF EXISTS cosmo_conversations_update_own ON public.cosmo_conversations;
CREATE POLICY cosmo_conversations_update_own
  ON public.cosmo_conversations FOR UPDATE TO authenticated
  USING ((select auth.uid())::text = user_id)
  WITH CHECK ((select auth.uid())::text = user_id);
DROP POLICY IF EXISTS cosmo_conversations_delete_own ON public.cosmo_conversations;
CREATE POLICY cosmo_conversations_delete_own
  ON public.cosmo_conversations FOR DELETE TO authenticated
  USING ((select auth.uid())::text = user_id);

CREATE OR REPLACE FUNCTION public.touch_cosmo_conversation_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.touch_cosmo_conversation_updated_at() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS cosmo_conversations_touch_updated_at ON public.cosmo_conversations;
CREATE TRIGGER cosmo_conversations_touch_updated_at
  BEFORE UPDATE ON public.cosmo_conversations
  FOR EACH ROW EXECUTE FUNCTION public.touch_cosmo_conversation_updated_at();

CREATE TABLE IF NOT EXISTS public.cosmo_messages (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  conversation_id text REFERENCES public.cosmo_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'cosmo')),
  text text NOT NULL,
  had_image boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cosmo_messages_text_length CHECK (char_length(text) <= 100000)
);

CREATE INDEX IF NOT EXISTS cosmo_messages_user_created_idx
  ON public.cosmo_messages (user_id, created_at);
CREATE INDEX IF NOT EXISTS cosmo_messages_conversation_created_idx
  ON public.cosmo_messages (conversation_id, created_at);

ALTER TABLE public.cosmo_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cosmo_messages FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.cosmo_messages TO authenticated;

DROP POLICY IF EXISTS cosmo_messages_own ON public.cosmo_messages;
DROP POLICY IF EXISTS cosmo_messages_select_own ON public.cosmo_messages;
CREATE POLICY cosmo_messages_select_own
  ON public.cosmo_messages FOR SELECT TO authenticated
  USING ((select auth.uid())::text = user_id);
DROP POLICY IF EXISTS cosmo_messages_insert_own ON public.cosmo_messages;
CREATE POLICY cosmo_messages_insert_own
  ON public.cosmo_messages FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid())::text = user_id
    AND (
      conversation_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.cosmo_conversations c
        WHERE c.id = conversation_id AND c.user_id = (select auth.uid())::text
      )
    )
  );
DROP POLICY IF EXISTS cosmo_messages_delete_own ON public.cosmo_messages;
CREATE POLICY cosmo_messages_delete_own
  ON public.cosmo_messages FOR DELETE TO authenticated
  USING ((select auth.uid())::text = user_id);

-- Classrooms and roster snapshot helper used by the database client.
CREATE OR REPLACE FUNCTION public.get_my_classrooms_snapshot()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH actor AS (
    SELECT auth.uid()::text AS user_id
  ), visible_classrooms AS (
    SELECT c.*
    FROM public.classrooms c
    CROSS JOIN actor a
    WHERE a.user_id IS NOT NULL
      AND (
        c.created_by = a.user_id
        OR EXISTS (
          SELECT 1 FROM public.classroom_students cs
          WHERE cs.class_id = c.id AND cs.student_id = a.user_id
        )
      )
  )
  SELECT jsonb_build_object(
    'classrooms', COALESCE((
      SELECT jsonb_agg(to_jsonb(c) ORDER BY c.created_at DESC)
      FROM visible_classrooms c
    ), '[]'::jsonb),
    'students', COALESCE((
      SELECT jsonb_agg(to_jsonb(cs) ORDER BY cs.joined_at)
      FROM public.classroom_students cs
      JOIN visible_classrooms c ON c.id = cs.class_id
    ), '[]'::jsonb)
  );
$$;
REVOKE ALL ON FUNCTION public.get_my_classrooms_snapshot() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_classrooms_snapshot() TO authenticated;

-- Profile and cover images are public assets, but uploads and mutation are
-- limited to the caller's own avatar/cover path.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

DROP POLICY IF EXISTS avatars_public_read ON storage.objects;
CREATE POLICY avatars_public_read
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS avatars_insert_own ON storage.objects;
CREATE POLICY avatars_insert_own
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (
      left(name, length('avatars/' || (select auth.uid())::text || '/')) = 'avatars/' || (select auth.uid())::text || '/'
      OR left(name, length('covers/' || (select auth.uid())::text || '_')) = 'covers/' || (select auth.uid())::text || '_'
    )
  );

DROP POLICY IF EXISTS avatars_update_own ON storage.objects;
CREATE POLICY avatars_update_own
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      left(name, length('avatars/' || (select auth.uid())::text || '/')) = 'avatars/' || (select auth.uid())::text || '/'
      OR left(name, length('covers/' || (select auth.uid())::text || '_')) = 'covers/' || (select auth.uid())::text || '_'
    )
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (
      left(name, length('avatars/' || (select auth.uid())::text || '/')) = 'avatars/' || (select auth.uid())::text || '/'
      OR left(name, length('covers/' || (select auth.uid())::text || '_')) = 'covers/' || (select auth.uid())::text || '_'
    )
  );

DROP POLICY IF EXISTS avatars_delete_own ON storage.objects;
CREATE POLICY avatars_delete_own
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      left(name, length('avatars/' || (select auth.uid())::text || '/')) = 'avatars/' || (select auth.uid())::text || '/'
      OR left(name, length('covers/' || (select auth.uid())::text || '_')) = 'covers/' || (select auth.uid())::text || '_'
    )
  );

-- Prevent creating a public post while impersonating another profile.
DROP POLICY IF EXISTS community_posts_insert_auth ON public.community_posts;
CREATE POLICY community_posts_insert_auth
  ON public.community_posts FOR INSERT TO authenticated
  WITH CHECK (author_id = (select auth.uid())::text);

NOTIFY pgrst, 'reload schema';
