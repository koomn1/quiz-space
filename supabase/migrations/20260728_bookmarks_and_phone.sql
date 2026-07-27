-- Bookmarks were previously stored under a single global (non-user-scoped!)
-- localStorage key 'quiz_bookmarks_list', meaning on a shared device every
-- visitor saw the same bookmark list and nothing synced across devices.
-- Phone numbers were stored per-user in localStorage only, never reaching
-- the users table at all.

CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    quiz_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, quiz_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bookmarks_read_own ON bookmarks;
DROP POLICY IF EXISTS bookmarks_insert_own ON bookmarks;
DROP POLICY IF EXISTS bookmarks_delete_own ON bookmarks;

CREATE POLICY bookmarks_read_own ON bookmarks FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY bookmarks_insert_own ON bookmarks FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY bookmarks_delete_own ON bookmarks FOR DELETE
  USING (user_id = auth.uid()::text);

-- Phone number belongs on the users row like any other profile field.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone') THEN
        ALTER TABLE users ADD COLUMN phone TEXT;
    END IF;
END $$;

-- Not a privileged column (unlike is_premium etc.), so no trigger protection
-- needed - users_update_own already allows a user to edit their own phone,
-- same as name/bio/location.
