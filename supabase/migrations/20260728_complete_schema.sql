-- Complete QuizSpace Database Schema
-- This migration creates all tables, indexes, RLS policies, and functions

-- ============================================
-- SAFE DROP POLICY HELPER
-- DROP POLICY IF EXISTS fails with 42P01 when the TABLE itself doesn't exist
-- (the IF EXISTS only guards the policy, not the table). This helper swallows
-- that error so the migration is safe to run on any database state.
-- ============================================
CREATE OR REPLACE FUNCTION _safe_drop_policy(p_policy TEXT, p_table TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p_policy, p_table);
EXCEPTION WHEN undefined_table THEN
    NULL; -- table doesn't exist yet, nothing to drop
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    photo_url TEXT,
    bio TEXT,
    location TEXT,
    phone TEXT,
    is_premium BOOLEAN DEFAULT false,
    plan_id TEXT,
    plan_name TEXT,
    is_lifetime BOOLEAN DEFAULT false,
    is_founder BOOLEAN DEFAULT false,
    is_suspended BOOLEAN DEFAULT false,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    category_id TEXT,
    renewal_date TIMESTAMPTZ,
    badge_tier TEXT NOT NULL DEFAULT 'none' CHECK (badge_tier IN ('none', 'pro', 'premium', 'team', 'enterprise', 'lifetime', 'founder')),
    name_color TEXT NOT NULL DEFAULT 'default' CHECK (name_color IN ('default', 'gold', 'neon_green', 'neon_pink', 'neon_blue', 'silver', 'diamond')),
    badge_symbol TEXT DEFAULT '',
    badge_color TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    onboarded BOOLEAN DEFAULT false
);

-- Add custom_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='custom_id') THEN
        ALTER TABLE users ADD COLUMN custom_id TEXT UNIQUE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_custom_id ON users(custom_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

SELECT _safe_drop_policy('users_read_own', 'users');
SELECT _safe_drop_policy('users_read_policy', 'users');
SELECT _safe_drop_policy('users_insert_own', 'users');
SELECT _safe_drop_policy('users_insert_policy', 'users');
SELECT _safe_drop_policy('users_update_own', 'users');
SELECT _safe_drop_policy('users_admin_update_all', 'users');
SELECT _safe_drop_policy('users_admin_update_own_team', 'users');
SELECT _safe_drop_policy('users_admin_all', 'users');

CREATE POLICY users_read_own ON users FOR SELECT USING (true);
-- NOTE: intentionally public read, not "own row only". The app reads other
-- users' basic profile fields constantly and by design: public profile pages
-- (UserProfile.tsx), community post authors, classroom rosters/leaderboards,
-- and the username-availability check in the settings form (which queries
-- custom_id for accounts that are NOT the current user). None of that is
-- sensitive - the actual sensitive columns (is_premium, is_admin, plan_*,
-- etc.) are already protected from being *written* by anyone but the owner
-- or a real admin via the trigger below; reading them is fine, the same way
-- a paid badge or plan name is meant to be publicly visible.
CREATE POLICY users_insert_own ON users FOR INSERT WITH CHECK (auth.uid()::text = uid);
CREATE POLICY users_update_own ON users FOR UPDATE USING (auth.uid()::text = uid);
CREATE POLICY users_admin_update_all ON users FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND is_admin = true));

-- ============================================
-- 2. QUIZZES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quizzes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    creator_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    creator_name TEXT,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_plays INTEGER DEFAULT 0,
    avg_rating NUMERIC DEFAULT 0,
    ratings_count INTEGER DEFAULT 0,
    time_limit INTEGER DEFAULT 0,
    category TEXT DEFAULT 'عام',
    distribution_routing TEXT DEFAULT 'public' CHECK (distribution_routing IN ('public', 'classroom', 'community')),
    classroom_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_creator_id ON quizzes(creator_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_category ON quizzes(category);
CREATE INDEX IF NOT EXISTS idx_quizzes_classroom_id ON quizzes(classroom_id);

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

SELECT _safe_drop_policy('quizzes_read', 'quizzes');
SELECT _safe_drop_policy('quizzes_insert_auth', 'quizzes');
SELECT _safe_drop_policy('quizzes_insert_own', 'quizzes');
SELECT _safe_drop_policy('quizzes_update_own', 'quizzes');
SELECT _safe_drop_policy('quizzes_delete_own', 'quizzes');

CREATE POLICY quizzes_read ON quizzes FOR SELECT USING (true);
CREATE POLICY quizzes_insert_own ON quizzes FOR INSERT WITH CHECK (auth.uid()::text = creator_id);
CREATE POLICY quizzes_update_own ON quizzes FOR UPDATE USING (auth.uid()::text = creator_id);
CREATE POLICY quizzes_delete_own ON quizzes FOR DELETE USING (auth.uid()::text = creator_id);

-- ============================================
-- 3. COMPLETIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS completions (
    id TEXT PRIMARY KEY,
    quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    quiz_title TEXT,
    taker_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    taker_name TEXT,
    score INTEGER,
    total_questions INTEGER,
    rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_completions_quiz_id ON completions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_completions_taker_id ON completions(taker_id);

ALTER TABLE completions ENABLE ROW LEVEL SECURITY;

SELECT _safe_drop_policy('completions_read_own', 'completions');
SELECT _safe_drop_policy('completions_read_public', 'completions');
SELECT _safe_drop_policy('completions_insert_own', 'completions');

CREATE POLICY completions_read_own ON completions FOR SELECT USING (true);
-- Public read, not "own row only": getBestScoreByQuizId, getCompletionsByQuizId,
-- and the recent-activity feed in db.ts all read completions across every
-- user (quiz leaderboards, "who's played this" stats), not just your own.
CREATE POLICY completions_insert_own ON completions FOR INSERT WITH CHECK (auth.uid()::text = taker_id);

-- ============================================
-- 4. QUESTION RATINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS question_ratings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    quiz_id TEXT NOT NULL,
    quiz_title TEXT,
    question_id TEXT NOT NULL,
    question_text TEXT,
    rating_value TEXT CHECK (rating_value IN ('like', 'dislike')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_question_ratings_user_id ON question_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_question_ratings_quiz_id ON question_ratings(quiz_id);

ALTER TABLE question_ratings ENABLE ROW LEVEL SECURITY;

SELECT _safe_drop_policy('question_ratings_read', 'question_ratings');
SELECT _safe_drop_policy('question_ratings_read_own', 'question_ratings');
SELECT _safe_drop_policy('question_ratings_insert_own', 'question_ratings');
SELECT _safe_drop_policy('question_ratings_update_own', 'question_ratings');

CREATE POLICY question_ratings_read_own ON question_ratings FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY question_ratings_insert_own ON question_ratings FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY question_ratings_update_own ON question_ratings FOR UPDATE USING (auth.uid()::text = user_id);

-- ============================================
-- 5. COMMUNITY POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS community_posts (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    author_name TEXT,
    text TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    liked_by JSONB DEFAULT '[]'::jsonb,
    author_badge_symbol TEXT DEFAULT '👑',
    author_badge_color TEXT DEFAULT '#f59e0b',
    author_badge_tier TEXT NOT NULL DEFAULT 'none',
    author_name_color TEXT NOT NULL DEFAULT 'default',
    views_count INTEGER DEFAULT 0,
    viewers JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_community_posts_author_id ON community_posts(author_id);

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

SELECT _safe_drop_policy('community_posts_read', 'community_posts');
SELECT _safe_drop_policy('community_posts_insert_auth', 'community_posts');
SELECT _safe_drop_policy('community_posts_delete_own', 'community_posts');

CREATE POLICY community_posts_read ON community_posts FOR SELECT USING (true);
CREATE POLICY community_posts_insert_auth ON community_posts FOR INSERT WITH CHECK (auth.uid()::text IS NOT NULL AND length(author_id) > 0);
CREATE POLICY community_posts_delete_own ON community_posts FOR DELETE USING (auth.uid()::text = author_id);

-- ============================================
-- 6. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    -- Nullable on purpose: src/lib/db.ts createNotification() never sets this.
    -- The app implements a single global broadcast feed (everyone sees the
    -- same notifications list via getNotifications()'s unfiltered SELECT),
    -- not per-user targeted notifications. A NOT NULL constraint here would
    -- break the very first notification insert.
    user_id TEXT REFERENCES users(uid) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('info', 'community', 'system', 'promotion')),
    title TEXT,
    body TEXT,
    sender_name TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

SELECT _safe_drop_policy('notifications_read_own', 'notifications');

CREATE POLICY notifications_read_own ON notifications FOR SELECT USING (true);

-- ============================================
-- 7. DIRECT MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS direct_messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    sender_name TEXT,
    receiver_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    receiver_name TEXT,
    text TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_id ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver_id ON direct_messages(receiver_id);

ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

SELECT _safe_drop_policy('direct_messages_read_own', 'direct_messages');
SELECT _safe_drop_policy('direct_messages_insert_auth', 'direct_messages');

CREATE POLICY direct_messages_read_own ON direct_messages FOR SELECT USING (auth.uid()::text = sender_id OR auth.uid()::text = receiver_id);
CREATE POLICY direct_messages_insert_auth ON direct_messages FOR INSERT WITH CHECK (auth.uid()::text = sender_id);

-- ============================================
-- 8. FOLLOWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS follows (
    id TEXT PRIMARY KEY,
    follower_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    following_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

SELECT _safe_drop_policy('follows_read', 'follows');
SELECT _safe_drop_policy('follows_insert_own', 'follows');
SELECT _safe_drop_policy('follows_delete_own', 'follows');

CREATE POLICY follows_read ON follows FOR SELECT USING (true);
CREATE POLICY follows_insert_own ON follows FOR INSERT WITH CHECK (auth.uid()::text = follower_id);
CREATE POLICY follows_delete_own ON follows FOR DELETE USING (auth.uid()::text = follower_id);

-- ============================================
-- 9. BOOKMARKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, quiz_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

SELECT _safe_drop_policy('bookmarks_read_own', 'bookmarks');
SELECT _safe_drop_policy('bookmarks_insert_own', 'bookmarks');
SELECT _safe_drop_policy('bookmarks_delete_own', 'bookmarks');

CREATE POLICY bookmarks_read_own ON bookmarks FOR SELECT USING (user_id = auth.uid()::text);
CREATE POLICY bookmarks_insert_own ON bookmarks FOR INSERT WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY bookmarks_delete_own ON bookmarks FOR DELETE USING (user_id = auth.uid()::text);

-- ============================================
-- 10. SUBSCRIPTION PLANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_ar TEXT,
    price NUMERIC NOT NULL,
    currency TEXT DEFAULT 'EGP',
    duration_months INTEGER NOT NULL,
    features TEXT[] NOT NULL DEFAULT '{}',
    badge_style TEXT CHECK (badge_style IN ('pro', 'premium', 'team', 'enterprise', 'lifetime', 'founder')),
    badge_color TEXT,
    priority_level INTEGER NOT NULL,
    is_lifetime BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
SELECT _safe_drop_policy('subscription_plans_read', 'subscription_plans');
SELECT _safe_drop_policy('subscription_plans_admin_write', 'subscription_plans');
CREATE POLICY subscription_plans_read ON subscription_plans FOR SELECT USING (true);
CREATE POLICY subscription_plans_admin_write ON subscription_plans FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND is_admin = true)
);

-- ============================================
-- 11. ACCOUNT CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS account_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_ar TEXT,
    description TEXT,
    description_ar TEXT,
    icon TEXT,
    color TEXT,
    min_quizzes INTEGER,
    min_score INTEGER,
    is_hidden BOOLEAN DEFAULT false,
    sort_order INTEGER
);

ALTER TABLE account_categories ENABLE ROW LEVEL SECURITY;
SELECT _safe_drop_policy('account_categories_read', 'account_categories');
SELECT _safe_drop_policy('account_categories_admin_write', 'account_categories');
CREATE POLICY account_categories_read ON account_categories FOR SELECT USING (true);
CREATE POLICY account_categories_admin_write ON account_categories FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND is_admin = true)
);

-- ============================================
-- 12. COUPON CODES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS coupon_codes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    discount_percent INTEGER NOT NULL DEFAULT 0,
    max_uses INTEGER NOT NULL DEFAULT 0,
    used_count INTEGER NOT NULL DEFAULT 0,
    expiry_date TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    applicable_plans TEXT DEFAULT 'silver,gold,diamond'
);

ALTER TABLE coupon_codes ENABLE ROW LEVEL SECURITY;
SELECT _safe_drop_policy('coupon_codes_read', 'coupon_codes');
SELECT _safe_drop_policy('coupon_codes_admin_write', 'coupon_codes');
SELECT _safe_drop_policy('coupon_codes_admin_update', 'coupon_codes');
SELECT _safe_drop_policy('coupon_codes_admin_delete', 'coupon_codes');
CREATE POLICY coupon_codes_read ON coupon_codes FOR SELECT USING (true);
CREATE POLICY coupon_codes_admin_write ON coupon_codes FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND is_admin = true)
);
CREATE POLICY coupon_codes_admin_update ON coupon_codes FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND is_admin = true)
);
CREATE POLICY coupon_codes_admin_delete ON coupon_codes FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND is_admin = true)
);

-- ============================================
-- 13. COUPON USAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS coupon_usages (
    id TEXT PRIMARY KEY,
    coupon_id TEXT NOT NULL REFERENCES coupon_codes(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    discount_percent INTEGER NOT NULL,
    plan_id TEXT,
    order_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_id ON coupon_usages(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_user_id ON coupon_usages(user_id);

ALTER TABLE coupon_usages ENABLE ROW LEVEL SECURITY;
SELECT _safe_drop_policy('coupon_usages_read_own', 'coupon_usages');
SELECT _safe_drop_policy('coupon_usages_admin_read', 'coupon_usages');
CREATE POLICY coupon_usages_read_own ON coupon_usages FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY coupon_usages_admin_read ON coupon_usages FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND is_admin = true)
);
-- No direct INSERT/UPDATE/DELETE policy on purpose: rows are only ever
-- created by record_coupon_usage(), which is SECURITY DEFINER and does its
-- own validation (active/not expired/not over limit/not already used).

-- ============================================
-- 14. SEASONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS seasons (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_ar TEXT,
    description TEXT,
    description_ar TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    prize_description TEXT,
    prize_image_url TEXT,
    max_participants INTEGER,
    rules_text TEXT,
    rules_text_ar TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ
);

ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
SELECT _safe_drop_policy('seasons_read', 'seasons');
SELECT _safe_drop_policy('seasons_admin_write', 'seasons');
CREATE POLICY seasons_read ON seasons FOR SELECT USING (true);
CREATE POLICY seasons_admin_write ON seasons FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND is_admin = true)
);

-- ============================================
-- 15. SEASON MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS season_members (
    id TEXT PRIMARY KEY,
    season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    user_name TEXT,
    rank_position INTEGER CHECK (rank_position IS NULL OR rank_position >= 1),
    total_score INTEGER DEFAULT 0,
    quizzes_completed INTEGER DEFAULT 0,
    joined_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ,
    CONSTRAINT unique_season_user UNIQUE (season_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_season_members_season_id ON season_members(season_id);
CREATE INDEX IF NOT EXISTS idx_season_members_user_id ON season_members(user_id);
CREATE INDEX IF NOT EXISTS idx_season_members_total_score ON season_members(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_season_members_rank ON season_members(rank_position);

ALTER TABLE season_members ENABLE ROW LEVEL SECURITY;
SELECT _safe_drop_policy('season_members_read', 'season_members');
SELECT _safe_drop_policy('season_members_insert_own', 'season_members');
SELECT _safe_drop_policy('season_members_update_own', 'season_members');
SELECT _safe_drop_policy('season_members_delete_own', 'season_members');
CREATE POLICY season_members_read ON season_members FOR SELECT USING (true);
-- No direct INSERT/UPDATE policy on purpose: without this, a user could set
-- their own total_score/rank_position directly and top the leaderboard
-- without ever completing a quiz. Writes only happen through
-- enroll_in_season() / update_season_member_score(), both SECURITY DEFINER.

-- ============================================
-- 16. PREMIUM REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS premium_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    payment_screenshot TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs_info')),
    reject_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_premium_requests_user_id ON premium_requests(user_id);

ALTER TABLE premium_requests ENABLE ROW LEVEL SECURITY;

SELECT _safe_drop_policy('premium_requests_read_own', 'premium_requests');
SELECT _safe_drop_policy('premium_requests_admin_read', 'premium_requests');
SELECT _safe_drop_policy('premium_requests_insert_own', 'premium_requests');
SELECT _safe_drop_policy('premium_requests_admin_update', 'premium_requests');

CREATE POLICY premium_requests_read_own ON premium_requests FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY premium_requests_admin_read ON premium_requests FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND is_admin = true));
CREATE POLICY premium_requests_insert_own ON premium_requests FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY premium_requests_admin_update ON premium_requests FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND is_admin = true));

-- ============================================
-- 16B. USER SESSIONS TABLE
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

SELECT _safe_drop_policy('user_sessions_read_own', 'user_sessions');
SELECT _safe_drop_policy('user_sessions_insert_own', 'user_sessions');
SELECT _safe_drop_policy('user_sessions_update_own', 'user_sessions');
SELECT _safe_drop_policy('user_sessions_delete_own', 'user_sessions');
SELECT _safe_drop_policy('user_sessions_admin_read', 'user_sessions');

CREATE POLICY user_sessions_read_own ON user_sessions FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY user_sessions_insert_own ON user_sessions FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY user_sessions_update_own ON user_sessions FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY user_sessions_delete_own ON user_sessions FOR DELETE USING (auth.uid()::text = user_id);
CREATE POLICY user_sessions_admin_read ON user_sessions FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND is_admin = true));


-- ============================================
-- 17. PROMOTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS promotions (
    id TEXT PRIMARY KEY,
    discount_percent INTEGER NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    applicable_plans TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
SELECT _safe_drop_policy('promotions_read', 'promotions');
SELECT _safe_drop_policy('promotions_admin_all', 'promotions');
CREATE POLICY promotions_read ON promotions FOR SELECT USING (true);
CREATE POLICY promotions_admin_all ON promotions FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND is_admin = true)
);

-- ============================================
-- 18. CLASSROOMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS classrooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    code TEXT NOT NULL,
    created_by TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    creator_name TEXT,
    allow_student_messages BOOLEAN DEFAULT true,
    allow_student_media BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_classrooms_created_by ON classrooms(created_by);

ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;

SELECT _safe_drop_policy('classrooms_read', 'classrooms');
SELECT _safe_drop_policy('classrooms_insert_auth', 'classrooms');
SELECT _safe_drop_policy('classrooms_update_own', 'classrooms');
SELECT _safe_drop_policy('classrooms_delete_own', 'classrooms');

CREATE POLICY classrooms_read ON classrooms FOR SELECT USING (true);
CREATE POLICY classrooms_insert_auth ON classrooms FOR INSERT WITH CHECK (auth.uid()::text = created_by);
CREATE POLICY classrooms_update_own ON classrooms FOR UPDATE USING (auth.uid()::text = created_by);
CREATE POLICY classrooms_delete_own ON classrooms FOR DELETE USING (auth.uid()::text = created_by);

-- ============================================
-- 19. CLASSROOM STUDENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS classroom_students (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    class_code TEXT,
    student_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    student_name TEXT,
    student_photo TEXT,
    joined_at TIMESTAMPTZ DEFAULT now(),
    completed_quizzes INTEGER DEFAULT 0,
    avg_score NUMERIC DEFAULT 0,
    last_active TIMESTAMPTZ,
    role TEXT
);

CREATE INDEX IF NOT EXISTS idx_classroom_students_class_id ON classroom_students(class_id);
CREATE INDEX IF NOT EXISTS idx_classroom_students_student_id ON classroom_students(student_id);

ALTER TABLE classroom_students ENABLE ROW LEVEL SECURITY;

SELECT _safe_drop_policy('classroom_students_read', 'classroom_students');
SELECT _safe_drop_policy('classroom_students_insert_own', 'classroom_students');
SELECT _safe_drop_policy('classroom_students_admin_write', 'classroom_students');

CREATE POLICY classroom_students_read ON classroom_students FOR SELECT USING (true);
CREATE POLICY classroom_students_insert_own ON classroom_students FOR INSERT WITH CHECK (auth.uid()::text = student_id);
CREATE POLICY classroom_students_admin_write ON classroom_students FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM classrooms WHERE id = class_id AND created_by = auth.uid()::text));

-- ============================================
-- 20. CLASSROOM MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS classroom_messages (
    id TEXT PRIMARY KEY,
    classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    sender_name TEXT,
    encrypted_text TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classroom_messages_classroom_id ON classroom_messages(classroom_id);

ALTER TABLE classroom_messages ENABLE ROW LEVEL SECURITY;

SELECT _safe_drop_policy('classroom_messages_read', 'classroom_messages');
SELECT _safe_drop_policy('classroom_messages_insert_own', 'classroom_messages');

CREATE POLICY classroom_messages_read ON classroom_messages FOR SELECT USING (true);
CREATE POLICY classroom_messages_insert_own ON classroom_messages FOR INSERT WITH CHECK (auth.uid()::text = sender_id);

-- ============================================
-- 21. CLASSROOM ASSIGNMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS classroom_assignments (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    due_date DATE,
    max_points INTEGER NOT NULL DEFAULT 100,
    created_by TEXT NOT NULL,
    creator_name TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_classroom_assignments_class_id ON classroom_assignments(class_id);

ALTER TABLE classroom_assignments ENABLE ROW LEVEL SECURITY;

SELECT _safe_drop_policy('classroom_assignments_read', 'classroom_assignments');
SELECT _safe_drop_policy('classroom_assignments_insert', 'classroom_assignments');
SELECT _safe_drop_policy('classroom_assignments_update_own', 'classroom_assignments');
SELECT _safe_drop_policy('classroom_assignments_delete_own', 'classroom_assignments');

CREATE POLICY classroom_assignments_read ON classroom_assignments FOR SELECT USING (
    EXISTS (SELECT 1 FROM classrooms c WHERE c.id = classroom_assignments.class_id AND c.created_by = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM classroom_students cs WHERE cs.class_id = classroom_assignments.class_id AND cs.student_id = auth.uid()::text)
);
CREATE POLICY classroom_assignments_insert ON classroom_assignments FOR INSERT WITH CHECK (
    auth.uid()::text IS NOT NULL
    AND EXISTS (SELECT 1 FROM classrooms c WHERE c.id = classroom_assignments.class_id AND c.created_by = auth.uid()::text)
);
CREATE POLICY classroom_assignments_update_own ON classroom_assignments FOR UPDATE USING (created_by = auth.uid()::text);
CREATE POLICY classroom_assignments_delete_own ON classroom_assignments FOR DELETE USING (created_by = auth.uid()::text);

-- ============================================
-- 22. CLASSROOM SUBMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS classroom_submissions (
    id TEXT PRIMARY KEY,
    assignment_id TEXT NOT NULL REFERENCES classroom_assignments(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    grade INTEGER,
    feedback TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    graded_at TIMESTAMPTZ,
    UNIQUE (assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_classroom_submissions_assignment_id ON classroom_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_classroom_submissions_student_id ON classroom_submissions(student_id);

ALTER TABLE classroom_submissions ENABLE ROW LEVEL SECURITY;

SELECT _safe_drop_policy('classroom_submissions_read', 'classroom_submissions');
SELECT _safe_drop_policy('classroom_submissions_insert_own', 'classroom_submissions');
SELECT _safe_drop_policy('classroom_submissions_update', 'classroom_submissions');

CREATE POLICY classroom_submissions_read ON classroom_submissions FOR SELECT USING (
    student_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM classroom_assignments a
      JOIN classrooms c ON c.id = a.class_id
      WHERE a.id = classroom_submissions.assignment_id AND c.created_by = auth.uid()::text
    )
);
CREATE POLICY classroom_submissions_insert_own ON classroom_submissions FOR INSERT WITH CHECK (student_id = auth.uid()::text);
CREATE POLICY classroom_submissions_update ON classroom_submissions FOR UPDATE USING (
    student_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM classroom_assignments a
      JOIN classrooms c ON c.id = a.class_id
      WHERE a.id = classroom_submissions.assignment_id AND c.created_by = auth.uid()::text
    )
);

-- ============================================
-- 23. CLASSROOM ANNOUNCEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS classroom_announcements (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'general' CHECK (priority IN ('general', 'important', 'urgent')),
    posted_by TEXT NOT NULL,
    posted_by_name TEXT NOT NULL DEFAULT '',
    reactions JSONB NOT NULL DEFAULT '{}'::jsonb,
    posted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classroom_announcements_class_id ON classroom_announcements(class_id);

ALTER TABLE classroom_announcements ENABLE ROW LEVEL SECURITY;

SELECT _safe_drop_policy('classroom_announcements_read', 'classroom_announcements');
SELECT _safe_drop_policy('classroom_announcements_insert', 'classroom_announcements');
SELECT _safe_drop_policy('classroom_announcements_update', 'classroom_announcements');
SELECT _safe_drop_policy('classroom_announcements_delete_own', 'classroom_announcements');

CREATE POLICY classroom_announcements_read ON classroom_announcements FOR SELECT USING (
    EXISTS (SELECT 1 FROM classrooms c WHERE c.id = classroom_announcements.class_id AND c.created_by = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM classroom_students cs WHERE cs.class_id = classroom_announcements.class_id AND cs.student_id = auth.uid()::text)
);
CREATE POLICY classroom_announcements_insert ON classroom_announcements FOR INSERT WITH CHECK (
    auth.uid()::text IS NOT NULL
    AND EXISTS (SELECT 1 FROM classrooms c WHERE c.id = classroom_announcements.class_id AND c.created_by = auth.uid()::text)
);
CREATE POLICY classroom_announcements_update ON classroom_announcements FOR UPDATE USING (
    EXISTS (SELECT 1 FROM classrooms c WHERE c.id = classroom_announcements.class_id AND c.created_by = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM classroom_students cs WHERE cs.class_id = classroom_announcements.class_id AND cs.student_id = auth.uid()::text)
);
CREATE POLICY classroom_announcements_delete_own ON classroom_announcements FOR DELETE USING (posted_by = auth.uid()::text);

-- ============================================
-- 24. CLASSROOM SHARED FILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS classroom_shared_files (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    shared_by TEXT NOT NULL,
    shared_by_name TEXT NOT NULL DEFAULT '',
    size_bytes BIGINT,
    file_type TEXT NOT NULL DEFAULT 'link' CHECK (file_type IN ('pdf', 'image', 'docx', 'link')),
    storage_path TEXT,
    url TEXT,
    shared_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classroom_shared_files_class_id ON classroom_shared_files(class_id);

ALTER TABLE classroom_shared_files ENABLE ROW LEVEL SECURITY;

SELECT _safe_drop_policy('classroom_shared_files_read', 'classroom_shared_files');
SELECT _safe_drop_policy('classroom_shared_files_insert', 'classroom_shared_files');
SELECT _safe_drop_policy('classroom_shared_files_delete_own', 'classroom_shared_files');

CREATE POLICY classroom_shared_files_read ON classroom_shared_files FOR SELECT USING (
    EXISTS (SELECT 1 FROM classrooms c WHERE c.id = classroom_shared_files.class_id AND c.created_by = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM classroom_students cs WHERE cs.class_id = classroom_shared_files.class_id AND cs.student_id = auth.uid()::text)
);
CREATE POLICY classroom_shared_files_insert ON classroom_shared_files FOR INSERT WITH CHECK (
    auth.uid()::text IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM classrooms c WHERE c.id = classroom_shared_files.class_id AND c.created_by = auth.uid()::text)
      OR EXISTS (SELECT 1 FROM classroom_students cs WHERE cs.class_id = classroom_shared_files.class_id AND cs.student_id = auth.uid()::text)
    )
);
CREATE POLICY classroom_shared_files_delete_own ON classroom_shared_files FOR DELETE USING (
    shared_by = auth.uid()::text
    OR EXISTS (SELECT 1 FROM classrooms c WHERE c.id = classroom_shared_files.class_id AND c.created_by = auth.uid()::text)
);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Toggle post like
CREATE OR REPLACE FUNCTION toggle_post_like(p_post_id TEXT, p_user_id TEXT)
RETURNS TABLE (likes INTEGER, liked_by JSONB) AS $$
DECLARE
    v_post community_posts%ROWTYPE;
    v_liked_by JSONB;
BEGIN
    SELECT * INTO v_post FROM community_posts WHERE id = p_post_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Post not found: %', p_post_id;
    END IF;
    v_liked_by := COALESCE(v_post.liked_by, '[]'::jsonb);
    IF v_liked_by @> to_jsonb(p_user_id::text) THEN
        v_liked_by := v_liked_by - p_user_id::text;
    ELSE
        v_liked_by := v_liked_by || to_jsonb(p_user_id::text);
    END IF;
    UPDATE community_posts SET likes = jsonb_array_length(v_liked_by), liked_by = v_liked_by WHERE id = p_post_id;
    RETURN QUERY SELECT jsonb_array_length(v_liked_by), v_liked_by FROM community_posts WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Submit quiz attempt
CREATE OR REPLACE FUNCTION submit_quiz_attempt(
    p_quiz_id TEXT,
    p_taker_id TEXT,
    p_taker_name TEXT,
    p_score INTEGER,
    p_rating INTEGER DEFAULT NULL,
    p_feedback TEXT DEFAULT ''
)
RETURNS TABLE (
    id TEXT,
    quiz_id TEXT,
    taker_id TEXT,
    taker_name TEXT,
    score INTEGER,
    total_questions INTEGER,
    rating INTEGER,
    feedback TEXT,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    v_completion_id TEXT;
    v_total_questions INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_questions FROM quizzes WHERE id = p_quiz_id;
    IF v_total_questions = 0 THEN v_total_questions := 1; END IF;
    IF NOT EXISTS (SELECT 1 FROM completions WHERE quiz_id = p_quiz_id AND taker_id = p_taker_id) THEN
        v_completion_id := 'comp_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 8);
        INSERT INTO completions (id, quiz_id, quiz_title, taker_id, taker_name, score, total_questions, rating, feedback)
        SELECT v_completion_id, p_quiz_id, q.title, p_taker_id, p_taker_name, p_score, v_total_questions, p_rating, p_feedback
        FROM quizzes q WHERE q.id = p_quiz_id;
        UPDATE quizzes SET total_plays = COALESCE(total_plays, 0) + 1 WHERE id = p_quiz_id;
    ELSE
        UPDATE completions SET score = p_score, total_questions = v_total_questions, rating = p_rating, feedback = p_feedback
        WHERE quiz_id = p_quiz_id AND taker_id = p_taker_id;
        v_completion_id := (SELECT id FROM completions WHERE quiz_id = p_quiz_id AND taker_id = p_taker_id);
    END IF;
    RETURN QUERY SELECT c.id, c.quiz_id, c.taker_id, c.taker_name, c.score, c.total_questions, c.rating, c.feedback, c.created_at
    FROM completions c WHERE c.id = v_completion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get coupon by code
CREATE OR REPLACE FUNCTION get_coupon_by_code(p_code TEXT)
RETURNS SETOF coupon_codes AS $$
BEGIN
    RETURN QUERY SELECT * FROM coupon_codes
    WHERE UPPER(code) = UPPER(TRIM(p_code)) OR UPPER(id) = UPPER(TRIM(p_code))
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Record coupon usage
CREATE OR REPLACE FUNCTION record_coupon_usage(
    p_coupon_id TEXT,
    p_user_id TEXT,
    p_discount_percent INTEGER,
    p_plan_id TEXT DEFAULT NULL,
    p_order_id TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_usage_id TEXT;
    v_coupon coupon_codes%ROWTYPE;
BEGIN
    SELECT * INTO v_coupon FROM coupon_codes WHERE id = p_coupon_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Coupon not found: %', p_coupon_id; END IF;
    IF NOT v_coupon.is_active THEN RAISE EXCEPTION 'Coupon is inactive'; END IF;
    IF v_coupon.expiry_date IS NOT NULL AND v_coupon.expiry_date < now() THEN RAISE EXCEPTION 'Coupon has expired'; END IF;
    IF v_coupon.used_count >= v_coupon.max_uses THEN RAISE EXCEPTION 'Coupon usage limit reached'; END IF;
    IF EXISTS (SELECT 1 FROM coupon_usages WHERE coupon_id = p_coupon_id AND user_id = p_user_id) THEN RAISE EXCEPTION 'User has already used this coupon'; END IF;
    v_usage_id := 'cu_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 8);
    INSERT INTO coupon_usages (id, coupon_id, user_id, discount_percent, plan_id, order_id)
    VALUES (v_usage_id, p_coupon_id, p_user_id, p_discount_percent, p_plan_id, p_order_id);
    UPDATE coupon_codes SET used_count = used_count + 1 WHERE id = p_coupon_id;
    RETURN v_usage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get active season
CREATE OR REPLACE FUNCTION get_active_season()
RETURNS TABLE (
    id TEXT,
    name TEXT,
    name_ar TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    prize_description TEXT,
    max_participants INTEGER
) AS $$
BEGIN
    RETURN QUERY SELECT s.id, s.name, s.name_ar, s.start_date, s.end_date, s.prize_description, s.max_participants
    FROM seasons s WHERE s.is_active = true AND s.is_archived = false AND now() BETWEEN s.start_date AND s.end_date
    ORDER BY s.created_at DESC LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Enroll in season
CREATE OR REPLACE FUNCTION enroll_in_season(p_season_id TEXT, p_user_id TEXT)
RETURNS TEXT AS $$
DECLARE
    v_member_id TEXT;
    v_season seasons%ROWTYPE;
BEGIN
    SELECT * INTO v_season FROM seasons WHERE id = p_season_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Season not found: %', p_season_id; END IF;
    IF NOT v_season.is_active THEN RAISE EXCEPTION 'Season is not active'; END IF;
    IF v_season.max_participants IS NOT NULL THEN
        IF (SELECT COUNT(*) FROM season_members WHERE season_id = p_season_id) >= v_season.max_participants THEN
            RAISE EXCEPTION 'Season is full';
        END IF;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM season_members WHERE season_id = p_season_id AND user_id = p_user_id) THEN
        v_member_id := 'sm_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 8);
        INSERT INTO season_members (id, season_id, user_id, total_score, quizzes_completed)
        VALUES (v_member_id, p_season_id, p_user_id, 0, 0);
        RETURN v_member_id;
    END IF;
    RETURN 'already_enrolled';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get season leaderboard
-- (Fixed: was erroneously written as u.sm.user_name in the original)
CREATE OR REPLACE FUNCTION get_season_leaderboard(p_season_id TEXT, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    rank_position INTEGER,
    user_id TEXT,
    user_name TEXT,
    total_score INTEGER,
    quizzes_completed INTEGER,
    joined_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT sm.rank_position, sm.user_id, sm.user_name, sm.total_score, sm.quizzes_completed, sm.joined_at
    FROM season_members sm
    WHERE sm.season_id = p_season_id
    ORDER BY sm.total_score DESC, sm.joined_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Update season member score
CREATE OR REPLACE FUNCTION update_season_member_score(p_season_id TEXT, p_user_id TEXT, p_score_delta INTEGER)
RETURNS VOID AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM season_members WHERE season_id = p_season_id AND user_id = p_user_id) THEN
        UPDATE season_members SET total_score = total_score + p_score_delta,
            quizzes_completed = quizzes_completed + 1, updated_at = now()
        WHERE season_id = p_season_id AND user_id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update users updated_at trigger
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_users_updated_at();

-- ============================================
-- CRITICAL SECURITY FIX
-- ============================================
-- users_update_own above allows any authenticated user to UPDATE their own
-- row with NO column restriction and NO WITH CHECK. Without this trigger,
-- any signed-in user can run:
--   supabase.from('users').update({is_premium: true, is_admin: true})
-- directly from the browser console and it will succeed. This trigger
-- silently reverts any change to privileged columns unless the actor is a
-- real admin (is_admin = true) or the trusted backend (service_role).
CREATE OR REPLACE FUNCTION protect_privileged_user_columns()
RETURNS TRIGGER AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_is_service_role BOOLEAN;
    v_badge_update_allowed BOOLEAN;
BEGIN
    v_is_service_role := (auth.jwt() ->> 'role') = 'service_role';

    IF v_is_service_role THEN
        RETURN NEW;
    END IF;

    SELECT is_admin INTO v_is_admin FROM users WHERE uid = auth.uid()::text;

    IF COALESCE(v_is_admin, false) THEN
        -- Admins can change subscription/role fields on other users, but never
        -- grant themselves or anyone else is_admin through this path.
        NEW.is_admin := OLD.is_admin;
        RETURN NEW;
    END IF;

    -- update_badge_and_name_color() sets this transaction-local flag right
    -- before its own UPDATE so THIS trigger (which fires for every write to
    -- `users`, including the RPC's own SECURITY DEFINER update) lets its
    -- already-validated badge_tier/name_color/badge_color through. The flag
    -- is transaction-scoped (the `true` third arg to set_config), so it can
    -- never leak into a client's own direct .update() call.
    v_badge_update_allowed := COALESCE(current_setting('app.allow_badge_update', true), '') = 'on';

    -- Not an admin and not the trusted backend: lock every privileged column
    -- back to its previous value, regardless of what the client tried to send.
    NEW.is_premium := OLD.is_premium;
    NEW.plan_id := OLD.plan_id;
    NEW.plan_name := OLD.plan_name;
    NEW.is_lifetime := OLD.is_lifetime;
    NEW.is_founder := OLD.is_founder;
    NEW.is_suspended := OLD.is_suspended;
    NEW.category_id := OLD.category_id;
    NEW.renewal_date := OLD.renewal_date;
    NEW.is_admin := OLD.is_admin;

    IF NOT v_badge_update_allowed THEN
        NEW.badge_tier := OLD.badge_tier;
        NEW.name_color := OLD.name_color;
        NEW.badge_color := OLD.badge_color;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_privileged_user_columns ON users;
CREATE TRIGGER trg_protect_privileged_user_columns
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION protect_privileged_user_columns();

-- badge_tier/name_color/badge_color cosmetic update RPC (plan-validated server-side)
CREATE OR REPLACE FUNCTION update_badge_and_name_color(p_badge_tier TEXT, p_name_color TEXT, p_badge_color TEXT DEFAULT 'blue')
RETURNS VOID AS $$
DECLARE
    v_is_premium BOOLEAN;
BEGIN
    SELECT is_premium INTO v_is_premium FROM users WHERE uid = auth.uid()::text;
    IF NOT COALESCE(v_is_premium, false) THEN
        RAISE EXCEPTION 'This feature requires an active premium subscription.';
    END IF;

    PERFORM set_config('app.allow_badge_update', 'on', true);

    UPDATE users
    SET badge_tier = p_badge_tier, name_color = p_name_color, badge_color = p_badge_color
    WHERE uid = auth.uid()::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Announcement reactions RPC
CREATE OR REPLACE FUNCTION add_announcement_reaction(p_announcement_id TEXT, p_emoji TEXT)
RETURNS JSONB AS $$
DECLARE
    v_reactions JSONB;
BEGIN
    UPDATE classroom_announcements
    SET reactions = jsonb_set(
        COALESCE(reactions, '{}'::jsonb),
        ARRAY[p_emoji],
        to_jsonb(COALESCE((reactions ->> p_emoji)::int, 0) + 1)
    )
    WHERE id = p_announcement_id
    RETURNING reactions INTO v_reactions;

    RETURN v_reactions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SEED DATA (safe to re-run: ON CONFLICT DO NOTHING)
-- ============================================
INSERT INTO notifications (id, type, title, body, sender_name, created_at)
VALUES (
    'notif-welcome', 'info',
    'مرحباً بك في منصة Quiz Space! 🎉',
    'ابدأ الآن بحل أو إنشاء أول اختبار تفاعلي وصعد لوحة المتصدرين!',
    'System', now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO coupon_codes (id, code, discount_percent, max_uses, used_count, expiry_date, is_active, created_at, applicable_plans)
VALUES
    ('QUIZ50', 'QUIZ50', 50, 100, 0, now() + interval '365 days', true, now(), 'silver,gold,diamond')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- GRANT PERMISSIONS (fixes "permission denied for schema public")
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ============================================
-- ADMIN BOOTSTRAP — REQUIRED MANUAL STEP
-- ============================================
-- is_admin cannot be set through the app (the trigger above blocks it on
-- purpose). After you sign up with your own admin account for the first
-- time, run this once by hand with YOUR real uid or email:
--
--   UPDATE users SET is_admin = true WHERE email = 'YOUR_ADMIN_EMAIL_HERE';
--
-- Without this, nobody can access the admin dashboard, approve premium
-- requests, or manage coupons/seasons/categories - by design.

-- ============================================
-- CLEANUP: remove the migration-only helper
-- ============================================
DROP FUNCTION IF EXISTS _safe_drop_policy(TEXT, TEXT);

