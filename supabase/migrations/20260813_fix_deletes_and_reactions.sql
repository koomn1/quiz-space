-- Fix deletion for quizzes, community posts, and direct messages.
-- All destructive operations are authenticated and ownership-checked on the server.

-- Direct messages: only the sender may permanently delete a message.
ALTER TABLE IF EXISTS direct_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS direct_messages_delete_sender ON direct_messages;
CREATE POLICY direct_messages_delete_sender
  ON direct_messages FOR DELETE
  USING (auth.uid()::text = sender_id);

-- Community posts: authors may delete their own posts. Admins continue to use
-- the existing administrative path/policy when present.
ALTER TABLE IF EXISTS community_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS community_posts_delete_author ON community_posts;
CREATE POLICY community_posts_delete_author
  ON community_posts FOR DELETE
  USING (auth.uid()::text = author_id);

-- Reliable quiz deletion through an ownership-checked RPC. Foreign keys with
-- ON DELETE CASCADE/SET NULL handle dependent attempts and daily slots.
CREATE OR REPLACE FUNCTION delete_owned_quiz(p_quiz_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted BOOLEAN := FALSE;
  v_deleted_count INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  DELETE FROM quizzes
  WHERE id = p_quiz_id
    AND creator_id = auth.uid()::text;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_deleted := v_deleted_count > 0;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION delete_owned_quiz(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_owned_quiz(TEXT) TO authenticated;

-- Reliable message deletion through an ownership-checked RPC. This avoids
-- depending on a stale or missing client-side policy.
CREATE OR REPLACE FUNCTION delete_own_direct_message(p_message_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted BOOLEAN := FALSE;
  v_deleted_count INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  DELETE FROM direct_messages
  WHERE id = p_message_id
    AND sender_id = auth.uid()::text;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  v_deleted := v_deleted_count > 0;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION delete_own_direct_message(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_own_direct_message(TEXT) TO authenticated;

-- Foreign-key cascade behavior is managed by the schema migrations and is not
-- modified here because pg_constraint is protected by PostgreSQL.
