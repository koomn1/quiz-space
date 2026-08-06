-- ============================================
-- QuizSpace New Features Migration (Incremental)
-- Run this migration in Supabase SQL Editor if you already have the existing schema.
-- ============================================

-- Helper function to safely drop policies without failing if table/policy doesn't exist
CREATE OR REPLACE FUNCTION _safe_drop_policy(p_policy TEXT, p_table TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p_policy, p_table);
EXCEPTION WHEN undefined_table THEN
    NULL;
END;
$$ LANGUAGE plpgsql;

-- 1. Create USER SESSIONS table for login history tracking
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    device TEXT NOT NULL,
    user_agent TEXT,
    ip_address TEXT,
    location TEXT,
    last_active TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast user session lookup
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- Enable RLS on user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Safe drop existing policies for user_sessions
DROP POLICY IF EXISTS user_sessions_read_own ON user_sessions;
DROP POLICY IF EXISTS user_sessions_insert_own ON user_sessions;
DROP POLICY IF EXISTS user_sessions_update_own ON user_sessions;
DROP POLICY IF EXISTS user_sessions_delete_own ON user_sessions;
DROP POLICY IF EXISTS user_sessions_admin_read ON user_sessions;

-- RLS Policies for user_sessions
CREATE POLICY user_sessions_read_own ON user_sessions FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY user_sessions_insert_own ON user_sessions FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY user_sessions_update_own ON user_sessions FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY user_sessions_delete_own ON user_sessions FOR DELETE USING (auth.uid()::text = user_id);
CREATE POLICY user_sessions_admin_read ON user_sessions FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND is_admin = true));


-- 2. Ensure custom_id column exists on users table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='custom_id') THEN
        ALTER TABLE users ADD COLUMN custom_id TEXT UNIQUE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_custom_id ON users(custom_id);
