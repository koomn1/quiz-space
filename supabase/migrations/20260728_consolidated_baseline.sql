-- ============================================================================
-- QuizSpace CONSOLIDATED DATABASE BASELINE
-- ============================================================================
-- هذا الملف يدمج كل الهجرات السابقة (114 ملف) بترتيبها الزمني
-- الأصلي في ملف واحد. قاعدة البيانات الحية على Supabase هي مصدر الحقيقة؛
-- هذا الملف يُستخدم لتجهيز بيئة جديدة من الصفر أو كمرجع للمخطط الحالي.
--
-- أي تعديل جديد على المخطط يُضاف كملف هجرة منفصل باسم:
--   supabase/migrations/<YYYYMMDD>_<description>.sql
-- ويُطبق يدوياً من Supabase Dashboard > SQL Editor (لا يوجد migration runner).
--
-- التاريخ الكامل للهجرات الفردية محفوظ في تاريخ Git (commit قبل الدمج).
-- الطلب يتم داخل مشروع Supabase فقط (يعتمد على schemas: auth, storage).
-- ============================================================================

-- >>> ORIGIN: supabase/migrations/20260728_complete_schema.sql

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

-- >>> ORIGIN: supabase/migrations/20260731_new_features_only.sql

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

-- >>> ORIGIN: supabase/migrations/20260807_ai_monitoring.sql

-- ============================================
-- AI Performance Monitoring Schema (Idempotent Fix)
-- ============================================

CREATE TABLE IF NOT EXISTS ai_performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    operation TEXT NOT NULL, -- 'extraction', 'generation', 'explanation'
    provider TEXT NOT NULL,  -- 'openrouter', 'groq', 'openai', 'deepseek'
    model TEXT,
    chunk_count INTEGER DEFAULT 1,
    total_pages INTEGER DEFAULT 1,
    status TEXT NOT NULL,    -- 'success', 'error'
    latency_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for performance tracking
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_id ON ai_performance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_performance_logs(created_at);

-- Enable RLS
ALTER TABLE ai_performance_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ai_performance_logs' AND policyname = 'ai_logs_admin_read'
    ) THEN
        CREATE POLICY ai_logs_admin_read ON ai_performance_logs 
            FOR SELECT 
            USING (EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND is_admin = true));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ai_performance_logs' AND policyname = 'ai_logs_insert_own'
    ) THEN
        CREATE POLICY ai_logs_insert_own ON ai_performance_logs 
            FOR INSERT 
            WITH CHECK (auth.uid()::text = user_id);
    END IF;
END $$;

-- >>> ORIGIN: supabase/migrations/20260808_ai_monitoring_admin_rpc.sql

-- Ensure the log table exists before installing the admin reader.
CREATE TABLE IF NOT EXISTS public.ai_performance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT,
  chunk_count INTEGER DEFAULT 1,
  total_pages INTEGER DEFAULT 1,
  status TEXT NOT NULL,
  latency_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON public.ai_performance_logs(created_at);
ALTER TABLE public.ai_performance_logs ENABLE ROW LEVEL SECURITY;

-- Admin-only reader for AI performance logs.
-- The frontend cannot bypass RLS with the anon key, so use a narrowly scoped
-- SECURITY DEFINER function that checks the authenticated user's admin flag.
CREATE OR REPLACE FUNCTION public.get_ai_performance_logs()
RETURNS SETOF public.ai_performance_logs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
     WHERE uid = auth.uid()::text AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
    SELECT * FROM public.ai_performance_logs
    ORDER BY created_at DESC
    LIMIT 100;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_ai_performance_logs() TO authenticated;
NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260808_atomic_coupon_redemption.sql

-- Atomic 100% coupon redemption: usage count, usage row and entitlement
-- either all succeed or none of them is committed.
CREATE OR REPLACE FUNCTION public.redeem_coupon_for_user(
  p_coupon_id TEXT,
  p_user_id TEXT,
  p_discount_percent INTEGER,
  p_plan_id TEXT,
  p_plan_name TEXT,
  p_order_id TEXT,
  p_renewal_date TIMESTAMPTZ
) RETURNS TEXT AS $$
DECLARE
  v_usage_id TEXT;
  v_rows INTEGER;
BEGIN
  IF auth.uid()::text <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_usage_id := public.record_coupon_usage(
    p_coupon_id, p_user_id, p_discount_percent, p_plan_id, p_order_id
  );

  UPDATE public.users
     SET is_premium = true,
         plan_name = p_plan_name,
         plan_id = p_plan_id,
         is_lifetime = false,
         is_founder = false,
         renewal_date = p_renewal_date,
         updated_at = now()
   WHERE uid = p_user_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  RETURN v_usage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.redeem_coupon_for_user(TEXT,TEXT,INTEGER,TEXT,TEXT,TEXT,TIMESTAMPTZ) TO authenticated;
NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260808_council_hardening.sql

-- Council hardening: make the durable database state authoritative.
-- Apply after the existing daily/coupon/XP migrations.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0;

-- Rebuild XP from one completion per quiz. This is idempotent and does not
-- depend on the possibly corrupted users.xp value.
CREATE OR REPLACE FUNCTION public.rebuild_user_xp_from_completions(p_user_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_xp INTEGER;
BEGIN
  IF auth.uid()::text <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COALESCE(SUM(10 + GREATEST(0, COALESCE(c.score, 0)) * 10), 0)::INTEGER
    INTO v_xp
    FROM public.completions c
   WHERE c.taker_id = p_user_id
     AND c.id IN (
       SELECT DISTINCT ON (c2.quiz_id) c2.id
         FROM public.completions c2
        WHERE c2.taker_id = p_user_id
        ORDER BY c2.quiz_id, c2.created_at ASC, c2.id ASC
     );

  UPDATE public.users
     SET xp = v_xp, updated_at = now()
   WHERE uid = p_user_id;

  RETURN v_xp;
END;
$$;
GRANT EXECUTE ON FUNCTION public.rebuild_user_xp_from_completions(TEXT) TO authenticated;

-- Any solved private daily slot must never expose its old payload again.
UPDATE public.daily_quiz_user_slots s
   SET quiz_payload = NULL,
       quiz_id = NULL,
       refreshing = false
 WHERE s.answered_at IS NOT NULL;

-- Legacy rows created before private payloads were introduced are not valid
-- daily challenges anymore. Clear their public quiz reference so the next
-- claim generates a fresh private challenge.
UPDATE public.daily_quiz_user_slots
   SET quiz_id = NULL,
       refreshing = false
 WHERE quiz_payload IS NULL
   AND answered_at IS NULL
   AND quiz_id IS NOT NULL;

-- Reconcile slots whose payload was solved before the atomic RPC existed.
UPDATE public.daily_quiz_user_slots s
   SET quiz_payload = NULL,
       quiz_id = NULL,
       answered_at = COALESCE(s.answered_at, c.created_at),
       next_available_at = COALESCE(s.next_available_at,
         c.created_at + s.refresh_interval_seconds * interval '1 second'),
       refreshing = false
  FROM public.completions c
 WHERE s.user_id = c.taker_id
   AND s.quiz_payload->>'id' = c.quiz_id
   AND s.answered_at IS NULL;

-- Ensure the latest daily read repairs a stale solved payload before returning.
DROP FUNCTION IF EXISTS public.get_user_daily_quiz_slot(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.get_user_daily_quiz_slot(p_user_id TEXT, p_tier TEXT)
RETURNS TABLE (
  quiz_id TEXT,
  quiz_payload JSONB,
  generated_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  next_available_at TIMESTAMPTZ,
  refreshing BOOLEAN,
  refresh_interval_seconds INTEGER,
  seconds_until_refresh INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_interval INTEGER := CASE p_tier WHEN 'diamond' THEN 60 WHEN 'gold' THEN 3600 ELSE 86400 END;
BEGIN
  IF auth.uid()::text <> p_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;

  INSERT INTO public.daily_quiz_user_slots(user_id, tier, refresh_interval_seconds)
  VALUES (p_user_id, p_tier, v_interval)
  ON CONFLICT (user_id, tier) DO UPDATE
    SET refresh_interval_seconds = EXCLUDED.refresh_interval_seconds;

  UPDATE public.daily_quiz_user_slots s
     SET quiz_payload = NULL,
         quiz_id = NULL,
         answered_at = COALESCE(s.answered_at, c.created_at),
         next_available_at = COALESCE(s.next_available_at,
           c.created_at + s.refresh_interval_seconds * interval '1 second'),
         refreshing = false
    FROM public.completions c
   WHERE s.user_id = p_user_id
     AND s.tier = p_tier
     AND s.answered_at IS NULL
     AND s.quiz_payload->>'id' = c.quiz_id
     AND c.taker_id = p_user_id;

  RETURN QUERY
  SELECT s.quiz_payload->>'id', s.quiz_payload, s.generated_at, s.answered_at,
         s.next_available_at, s.refreshing, s.refresh_interval_seconds,
         CASE WHEN s.next_available_at IS NULL THEN 0
              ELSE GREATEST(0, CEIL(EXTRACT(EPOCH FROM (s.next_available_at - now())))::INTEGER)
         END
    FROM public.daily_quiz_user_slots s
   WHERE s.user_id = p_user_id AND s.tier = p_tier;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_user_daily_quiz_slot(TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.reset_legacy_daily_quiz_slot(p_user_id TEXT, p_tier TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid()::text <> p_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.daily_quiz_user_slots
     SET quiz_id = NULL, refreshing = false
   WHERE user_id = p_user_id
     AND tier = p_tier
     AND quiz_payload IS NULL
     AND answered_at IS NULL;
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.reset_legacy_daily_quiz_slot(TEXT, TEXT) TO authenticated;
NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260808_daily_quiz_system.sql

-- ============================================
-- Daily Quiz System Schema
-- ============================================

CREATE TABLE IF NOT EXISTS daily_quiz_slots (
    tier TEXT PRIMARY KEY CHECK (tier IN ('free', 'gold', 'diamond')),
    quiz_id TEXT REFERENCES quizzes(id) ON DELETE SET NULL,
    refreshing BOOLEAN DEFAULT false,
    refreshed_at TIMESTAMPTZ DEFAULT now(),
    refresh_interval_seconds INTEGER NOT NULL
);

-- Seed initial slots
INSERT INTO daily_quiz_slots (tier, refresh_interval_seconds)
VALUES 
    ('free', 86400),    -- 24 hours
    ('gold', 3600),     -- 1 hour
    ('diamond', 60)     -- 1 minute
ON CONFLICT (tier) DO NOTHING;

-- RPC: get_daily_quiz_slot
CREATE OR REPLACE FUNCTION get_daily_quiz_slot(p_tier TEXT)
RETURNS TABLE (
    quiz_id TEXT,
    refreshing BOOLEAN,
    refreshed_at TIMESTAMPTZ,
    refresh_interval_seconds INTEGER,
    seconds_until_refresh INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.quiz_id,
        s.refreshing,
        s.refreshed_at,
        s.refresh_interval_seconds,
        GREATEST(0, (s.refresh_interval_seconds - EXTRACT(EPOCH FROM (now() - s.refreshed_at)))::int) as seconds_until_refresh
    FROM daily_quiz_slots s
    WHERE s.tier = p_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: claim_daily_quiz_refresh
CREATE OR REPLACE FUNCTION claim_daily_quiz_refresh(p_tier TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_refreshed_at TIMESTAMPTZ;
    v_interval INTEGER;
    v_refreshing BOOLEAN;
BEGIN
    SELECT refreshed_at, refresh_interval_seconds, refreshing 
    INTO v_refreshed_at, v_interval, v_refreshing
    FROM daily_quiz_slots 
    WHERE tier = p_tier;

    -- Only allow claim if it's expired and not already refreshing
    IF NOT v_refreshing AND (now() - v_refreshed_at >= v_interval * interval '1 second') THEN
        UPDATE daily_quiz_slots 
        SET refreshing = true 
        WHERE tier = p_tier;
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: finalize_daily_quiz_refresh
CREATE OR REPLACE FUNCTION finalize_daily_quiz_refresh(p_tier TEXT, p_quiz_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE daily_quiz_slots 
    SET 
        quiz_id = p_quiz_id,
        refreshing = false,
        refreshed_at = now()
    WHERE tier = p_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: release_daily_quiz_refresh
CREATE OR REPLACE FUNCTION release_daily_quiz_refresh(p_tier TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE daily_quiz_slots 
    SET refreshing = false
    WHERE tier = p_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_daily_quiz_slot(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_daily_quiz_refresh(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION finalize_daily_quiz_refresh(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION release_daily_quiz_refresh(TEXT) TO authenticated;

-- >>> ORIGIN: supabase/migrations/20260808_improvement_attempts.sql

-- Quiz Space: allow students to retake non-daily quizzes and keep an improvement history.
-- Every submission is a separate attempt. XP is awarded only for the first attempt
-- and for points that improve the student's previous best score.

ALTER TABLE public.completions
  ADD COLUMN IF NOT EXISTS attempt_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_best BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS completions_user_quiz_attempt_idx
  ON public.completions (taker_id, quiz_id, attempt_number DESC);

-- Preserve the old single-row records as the first attempt and mark the best
-- historical score for each student/quiz pair.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY taker_id, quiz_id ORDER BY score DESC, created_at ASC, id ASC) AS best_rank,
         ROW_NUMBER() OVER (PARTITION BY taker_id, quiz_id ORDER BY created_at ASC, id ASC) AS attempt_rank
    FROM public.completions
)
UPDATE public.completions c
   SET attempt_number = ranked.attempt_rank,
       is_best = ranked.best_rank = 1
  FROM ranked
 WHERE c.id = ranked.id;

DROP FUNCTION IF EXISTS public.submit_quiz_attempt(TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
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
    created_at TIMESTAMPTZ,
    attempt_number INTEGER,
    is_best BOOLEAN,
    xp_awarded INTEGER
) AS $$
DECLARE
    v_completion_id TEXT;
    v_total_questions INTEGER;
    v_attempt_number INTEGER;
    v_previous_best INTEGER;
    v_score INTEGER := GREATEST(0, COALESCE(p_score, 0));
    v_xp_awarded INTEGER;
    v_is_best BOOLEAN;
BEGIN
    IF auth.uid()::text <> p_taker_id THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;

    SELECT COALESCE(jsonb_array_length(q.questions), 0)
      INTO v_total_questions
      FROM public.quizzes q
     WHERE q.id = p_quiz_id;
    IF v_total_questions <= 0 THEN v_total_questions := 1; END IF;

    SELECT COUNT(*)::INTEGER, COALESCE(MAX(c.score), 0)
      INTO v_attempt_number, v_previous_best
      FROM public.completions c
     WHERE c.quiz_id = p_quiz_id AND c.taker_id = p_taker_id;
    v_attempt_number := v_attempt_number + 1;
    v_is_best := v_attempt_number = 1 OR v_score > v_previous_best;
    -- Participation + correct-answer XP is awarded only on the first try;
    -- later tries receive XP only for genuine improvement over the prior best.
    v_xp_awarded := CASE
      WHEN v_attempt_number = 1 THEN 10 + (v_score * 10)
      ELSE GREATEST(0, v_score - v_previous_best) * 10
    END;

    v_completion_id := 'comp_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 10);

    IF v_is_best THEN
      UPDATE public.completions
         SET is_best = false
       WHERE quiz_id = p_quiz_id AND taker_id = p_taker_id;
    END IF;

    INSERT INTO public.completions (
      id, quiz_id, quiz_title, taker_id, taker_name, score, total_questions,
      rating, feedback, attempt_number, is_best
    )
    SELECT v_completion_id, p_quiz_id, q.title, p_taker_id, p_taker_name,
           v_score, v_total_questions, p_rating, COALESCE(p_feedback, ''),
           v_attempt_number, v_is_best
      FROM public.quizzes q
     WHERE q.id = p_quiz_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Quiz not found';
    END IF;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(TEXT,TEXT,TEXT,INTEGER,INTEGER,TEXT) TO authenticated;
NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260808_notification_controls.sql

-- Notification delivery tracking and per-user throttling controls.
CREATE TABLE IF NOT EXISTS public.push_notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('classroom', 'community', 'quiz', 'promotion', 'system')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_url TEXT NOT NULL DEFAULT '/',
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_events_user_category_opened
  ON public.push_notification_events(user_id, category, opened_at, delivered_at DESC);

CREATE TABLE IF NOT EXISTS public.push_notification_preferences (
  user_id TEXT PRIMARY KEY REFERENCES public.users(uid) ON DELETE CASCADE,
  classroom_missed_count INTEGER NOT NULL DEFAULT 0,
  classroom_paused BOOLEAN NOT NULL DEFAULT FALSE,
  last_promotion_at TIMESTAMPTZ,
  last_promotion_index INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.push_notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_events_select_own ON public.push_notification_events;
CREATE POLICY push_events_select_own ON public.push_notification_events FOR SELECT USING (auth.uid()::text = user_id);
DROP POLICY IF EXISTS push_events_update_own ON public.push_notification_events;
CREATE POLICY push_events_update_own ON public.push_notification_events FOR UPDATE USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
DROP POLICY IF EXISTS push_preferences_select_own ON public.push_notification_preferences;
CREATE POLICY push_preferences_select_own ON public.push_notification_preferences FOR SELECT USING (auth.uid()::text = user_id);
DROP POLICY IF EXISTS push_preferences_update_own ON public.push_notification_preferences;
CREATE POLICY push_preferences_update_own ON public.push_notification_preferences FOR UPDATE USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
GRANT SELECT, UPDATE ON public.push_notification_events TO authenticated;
GRANT SELECT, UPDATE ON public.push_notification_preferences TO authenticated;

CREATE OR REPLACE FUNCTION public.record_push_notification_open(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
BEGIN
  UPDATE public.push_notification_events
  SET opened_at = COALESCE(opened_at, now())
  WHERE id = p_event_id AND user_id = v_user_id;

  IF FOUND THEN
    UPDATE public.push_notification_preferences
    SET classroom_missed_count = 0,
        classroom_paused = FALSE,
        updated_at = now()
    WHERE user_id = v_user_id;
  END IF;
  RETURN jsonb_build_object('success', FOUND);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_push_notification_open(UUID) TO authenticated;

-- >>> ORIGIN: supabase/migrations/20260808_per_user_daily_quiz.sql

-- Per-user daily quizzes.
-- A user's current quiz remains pinned until completion. The cooldown starts
-- only after completion, and every user has an independent slot per tier.

CREATE TABLE IF NOT EXISTS daily_quiz_user_slots (
  user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'gold', 'diamond')),
  quiz_id TEXT REFERENCES quizzes(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  next_available_at TIMESTAMPTZ,
  refreshing BOOLEAN NOT NULL DEFAULT false,
  refresh_interval_seconds INTEGER NOT NULL,
  PRIMARY KEY (user_id, tier)
);

CREATE INDEX IF NOT EXISTS idx_daily_quiz_user_slots_quiz
  ON daily_quiz_user_slots(user_id, quiz_id);

ALTER TABLE daily_quiz_user_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS daily_quiz_user_slots_select_own ON daily_quiz_user_slots;
CREATE POLICY daily_quiz_user_slots_select_own ON daily_quiz_user_slots
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE OR REPLACE FUNCTION daily_quiz_interval(p_tier TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE p_tier WHEN 'diamond' THEN 60 WHEN 'gold' THEN 3600 ELSE 86400 END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_user_daily_quiz_slot(p_user_id TEXT, p_tier TEXT)
RETURNS TABLE (
  quiz_id TEXT,
  generated_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  next_available_at TIMESTAMPTZ,
  refreshing BOOLEAN,
  refresh_interval_seconds INTEGER,
  seconds_until_refresh INTEGER
) AS $$
BEGIN
  IF auth.uid()::text <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  INSERT INTO daily_quiz_user_slots (user_id, tier, refresh_interval_seconds)
  VALUES (p_user_id, p_tier, daily_quiz_interval(p_tier))
  ON CONFLICT (user_id, tier) DO UPDATE
    SET refresh_interval_seconds = EXCLUDED.refresh_interval_seconds;
  RETURN QUERY
  SELECT s.quiz_id, s.generated_at, s.answered_at, s.next_available_at,
         s.refreshing, s.refresh_interval_seconds,
         GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(s.next_available_at, now()) - now()))::INTEGER)
    FROM daily_quiz_user_slots s
   WHERE s.user_id = p_user_id AND s.tier = p_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION claim_user_daily_quiz_refresh(p_user_id TEXT, p_tier TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  s daily_quiz_user_slots%ROWTYPE;
BEGIN
  IF auth.uid()::text <> p_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  INSERT INTO daily_quiz_user_slots (user_id, tier, refresh_interval_seconds)
  VALUES (p_user_id, p_tier, daily_quiz_interval(p_tier))
  ON CONFLICT (user_id, tier) DO NOTHING;
  SELECT * INTO s FROM daily_quiz_user_slots
   WHERE user_id = p_user_id AND tier = p_tier FOR UPDATE;
  IF s.refreshing AND (s.generated_at IS NULL OR now() - s.generated_at > interval '10 minutes') THEN
    UPDATE daily_quiz_user_slots SET refreshing = false
     WHERE user_id = p_user_id AND tier = p_tier;
    s.refreshing := false;
  END IF;
  IF s.refreshing OR s.quiz_id IS NOT NULL AND s.answered_at IS NULL THEN RETURN false; END IF;
  IF s.next_available_at IS NOT NULL AND now() < s.next_available_at THEN RETURN false; END IF;
  UPDATE daily_quiz_user_slots SET refreshing = true,
    refresh_interval_seconds = daily_quiz_interval(p_tier)
   WHERE user_id = p_user_id AND tier = p_tier;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION finalize_user_daily_quiz_refresh(p_user_id TEXT, p_tier TEXT, p_quiz_id TEXT)
RETURNS VOID AS $$
BEGIN
  IF auth.uid()::text <> p_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE daily_quiz_user_slots
     SET quiz_id = p_quiz_id, generated_at = now(), answered_at = NULL,
         next_available_at = NULL, refreshing = false
   WHERE user_id = p_user_id AND tier = p_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION release_user_daily_quiz_refresh(p_user_id TEXT, p_tier TEXT)
RETURNS VOID AS $$
BEGIN
  IF auth.uid()::text <> p_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE daily_quiz_user_slots SET refreshing = false
   WHERE user_id = p_user_id AND tier = p_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION complete_user_daily_quiz(p_user_id TEXT, p_quiz_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier TEXT;
BEGIN
  IF auth.uid()::text <> p_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT tier INTO v_tier FROM daily_quiz_user_slots
   WHERE user_id = p_user_id AND quiz_id = p_quiz_id AND answered_at IS NULL
   LIMIT 1;
  IF v_tier IS NULL THEN RETURN false; END IF;
  UPDATE daily_quiz_user_slots
     SET answered_at = now(),
         next_available_at = now() + refresh_interval_seconds * interval '1 second'
   WHERE user_id = p_user_id AND quiz_id = p_quiz_id AND tier = v_tier
     AND answered_at IS NULL;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_daily_quiz_slot(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_user_daily_quiz_refresh(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION finalize_user_daily_quiz_refresh(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION release_user_daily_quiz_refresh(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_user_daily_quiz(TEXT, TEXT) TO authenticated;

-- >>> ORIGIN: supabase/migrations/20260808_private_daily_payload.sql

-- Keep daily challenges private to their user slot.
-- The quiz payload is stored only while it is unsolved; it is cleared on completion.
ALTER TABLE public.daily_quiz_user_slots
  ADD COLUMN IF NOT EXISTS quiz_payload JSONB;

DROP FUNCTION IF EXISTS public.get_user_daily_quiz_slot(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.get_user_daily_quiz_slot(p_user_id TEXT, p_tier TEXT)
RETURNS TABLE (
  quiz_id TEXT,
  quiz_payload JSONB,
  generated_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  next_available_at TIMESTAMPTZ,
  refreshing BOOLEAN,
  refresh_interval_seconds INTEGER,
  seconds_until_refresh INTEGER
) AS $$
BEGIN
  IF auth.uid()::text <> p_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  INSERT INTO public.daily_quiz_user_slots (user_id, tier, refresh_interval_seconds)
  VALUES (p_user_id, p_tier, daily_quiz_interval(p_tier))
  ON CONFLICT (user_id, tier) DO UPDATE
    SET refresh_interval_seconds = EXCLUDED.refresh_interval_seconds;
  RETURN QUERY
  SELECT s.quiz_payload->>'id', s.quiz_payload, s.generated_at, s.answered_at,
         s.next_available_at, s.refreshing, s.refresh_interval_seconds,
         GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(s.next_available_at, now()) - now()))::INTEGER)
    FROM public.daily_quiz_user_slots s
   WHERE s.user_id = p_user_id AND s.tier = p_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS public.finalize_user_daily_quiz_refresh(TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.finalize_user_daily_quiz_refresh(
  p_user_id TEXT, p_tier TEXT, p_quiz_payload JSONB
) RETURNS VOID AS $$
BEGIN
  IF auth.uid()::text <> p_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.daily_quiz_user_slots
     SET quiz_id = NULL,
         quiz_payload = p_quiz_payload,
         generated_at = now(),
         answered_at = NULL,
         next_available_at = NULL,
         refreshing = false
   WHERE user_id = p_user_id AND tier = p_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS public.complete_user_daily_quiz(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.complete_user_daily_quiz(p_user_id TEXT, p_quiz_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier TEXT;
BEGIN
  IF auth.uid()::text <> p_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT tier INTO v_tier
    FROM public.daily_quiz_user_slots
   WHERE user_id = p_user_id
     AND quiz_payload->>'id' = p_quiz_id
     AND answered_at IS NULL
   LIMIT 1;
  IF v_tier IS NULL THEN RETURN false; END IF;
  UPDATE public.daily_quiz_user_slots
     SET quiz_payload = NULL,
         quiz_id = NULL,
         answered_at = now(),
         next_available_at = now() + refresh_interval_seconds * interval '1 second'
   WHERE user_id = p_user_id AND tier = v_tier
     AND answered_at IS NULL;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_user_daily_quiz_slot(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_user_daily_quiz_refresh(TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_user_daily_quiz(TEXT, TEXT) TO authenticated;

-- Remove any old daily rows that were accidentally published as public quizzes.
DELETE FROM public.quizzes
 WHERE category IN ('يومي', 'Daily')
    OR title ILIKE '%التحدي اليومي%'
    OR title ILIKE '%Daily Challenge%';

NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260808_push_subscriptions.sql

-- Persistent browser push subscriptions for closed-site notifications.
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT,
  auth TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscriptions_select_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_select_own
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS push_subscriptions_insert_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_insert_own
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS push_subscriptions_update_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_update_own
  ON public.push_subscriptions FOR UPDATE
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS push_subscriptions_delete_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_delete_own
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid()::text = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
REVOKE ALL ON public.push_subscriptions FROM anon;

-- >>> ORIGIN: supabase/migrations/20260808_repair_daily_completion_and_restore_xp.sql

-- Repair private daily completion: daily quizzes are not rows in public.quizzes.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.submit_user_daily_quiz_attempt(
  p_quiz_id TEXT,
  p_taker_id TEXT,
  p_taker_name TEXT,
  p_score INTEGER,
  p_total_questions INTEGER,
  p_rating INTEGER DEFAULT NULL,
  p_feedback TEXT DEFAULT ''
) RETURNS TABLE (
  id TEXT, quiz_id TEXT, taker_id TEXT, taker_name TEXT, score INTEGER,
  total_questions INTEGER, rating INTEGER, feedback TEXT, created_at TIMESTAMPTZ,
  xp_awarded INTEGER
) AS $$
DECLARE
  v_completion_id TEXT;
  v_xp INTEGER := 0;
  v_exists BOOLEAN;
BEGIN
  IF auth.uid()::text <> p_taker_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT EXISTS(
    SELECT 1 FROM public.completions c
     WHERE c.quiz_id = p_quiz_id AND c.taker_id = p_taker_id
  ) INTO v_exists;

  SELECT c.id INTO v_completion_id FROM public.completions c
   WHERE c.quiz_id = p_quiz_id AND c.taker_id = p_taker_id
   LIMIT 1 FOR UPDATE;

  IF v_completion_id IS NULL THEN
    v_completion_id := 'comp_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 8);
    INSERT INTO public.completions (id, quiz_id, quiz_title, taker_id, taker_name, score, total_questions, rating, feedback)
    VALUES (v_completion_id, p_quiz_id, 'Daily Challenge', p_taker_id, p_taker_name,
            p_score, GREATEST(1, p_total_questions), p_rating, COALESCE(p_feedback, ''));
    v_xp := 10 + (GREATEST(0, p_score) * 10);
    UPDATE public.users SET xp = COALESCE(xp, 0) + v_xp, updated_at = now()
     WHERE uid = p_taker_id;
  ELSE
    UPDATE public.completions SET score = p_score, total_questions = GREATEST(1, p_total_questions),
      rating = p_rating, feedback = COALESCE(p_feedback, '') WHERE id = v_completion_id;
  END IF;

  -- Mark the private slot solved in the same transaction. The payload is cleared
  -- so the old daily quiz can never be opened again after a successful save.
  UPDATE public.daily_quiz_user_slots
     SET quiz_payload = NULL,
         quiz_id = NULL,
         answered_at = COALESCE(answered_at, now()),
         next_available_at = COALESCE(next_available_at, now() + refresh_interval_seconds * interval '1 second'),
         refreshing = false
   WHERE user_id = p_taker_id
     AND quiz_payload->>'id' = p_quiz_id;

  RETURN QUERY SELECT c.id, c.quiz_id, c.taker_id, c.taker_name, c.score, c.total_questions,
    c.rating, c.feedback, c.created_at, v_xp FROM public.completions c WHERE c.id = v_completion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.submit_user_daily_quiz_attempt(TEXT,TEXT,TEXT,INTEGER,INTEGER,INTEGER,TEXT) TO authenticated;

-- Restore a zeroed profile from durable completion history without reducing any existing XP.
UPDATE public.users u
   SET xp = totals.rebuilt_xp,
       updated_at = now()
  FROM (
    SELECT c.taker_id, SUM(10 + (GREATEST(0, c.score) * 10))::INTEGER AS rebuilt_xp
      FROM public.completions c
     GROUP BY c.taker_id
  ) totals
 WHERE u.uid = totals.taker_id
   AND COALESCE(u.xp, 0) = 0
   AND totals.rebuilt_xp > 0;

-- Reconcile daily slots for attempts already saved before this repair.
UPDATE public.daily_quiz_user_slots s
   SET quiz_payload = NULL,
       quiz_id = NULL,
       answered_at = COALESCE(s.answered_at, now()),
       next_available_at = COALESCE(s.next_available_at, now() + s.refresh_interval_seconds * interval '1 second'),
       refreshing = false
 WHERE s.quiz_payload->>'id' IN (
   SELECT c.quiz_id FROM public.completions c WHERE c.taker_id = s.user_id
 );

-- Release stale generation locks only; do not delete a valid unsolved payload.
UPDATE public.daily_quiz_user_slots
   SET refreshing = false
 WHERE refreshing = true
   AND generated_at IS NOT NULL
   AND generated_at < now() - interval '10 minutes'
   AND answered_at IS NULL;

NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260808_repair_xp_and_daily_timer.sql

-- Repair migration for production databases that missed earlier migrations.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0;

UPDATE public.users SET xp = 0 WHERE xp IS NULL;

DROP FUNCTION IF EXISTS public.submit_quiz_attempt(TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT);
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
  p_quiz_id TEXT,
  p_taker_id TEXT,
  p_taker_name TEXT,
  p_score INTEGER,
  p_rating INTEGER DEFAULT NULL,
  p_feedback TEXT DEFAULT ''
) RETURNS TABLE (
  id TEXT,
  quiz_id TEXT,
  taker_id TEXT,
  taker_name TEXT,
  score INTEGER,
  total_questions INTEGER,
  rating INTEGER,
  feedback TEXT,
  created_at TIMESTAMPTZ,
  xp_awarded INTEGER
) AS $$
DECLARE
  v_completion_id TEXT;
  v_total_questions INTEGER;
  v_xp INTEGER := 0;
BEGIN
  IF auth.uid()::text <> p_taker_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT GREATEST(1, COALESCE(jsonb_array_length(q.questions), 1))
    INTO v_total_questions FROM public.quizzes q WHERE q.id = p_quiz_id;
  IF v_total_questions IS NULL THEN RAISE EXCEPTION 'Quiz not found'; END IF;

  SELECT c.id INTO v_completion_id
    FROM public.completions c
   WHERE c.quiz_id = p_quiz_id AND c.taker_id = p_taker_id
   LIMIT 1 FOR UPDATE;

  IF v_completion_id IS NULL THEN
    v_completion_id := 'comp_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 8);
    INSERT INTO public.completions (id, quiz_id, quiz_title, taker_id, taker_name, score, total_questions, rating, feedback)
    SELECT v_completion_id, q.id, q.title, p_taker_id, p_taker_name, p_score, v_total_questions, p_rating, COALESCE(p_feedback, '')
      FROM public.quizzes q WHERE q.id = p_quiz_id;
    UPDATE public.quizzes SET total_plays = COALESCE(total_plays, 0) + 1 WHERE id = p_quiz_id;
    v_xp := 10 + (GREATEST(0, p_score) * 10);
    UPDATE public.users SET xp = COALESCE(xp, 0) + v_xp, updated_at = now()
     WHERE uid = p_taker_id;
  ELSE
    UPDATE public.completions SET score = p_score, total_questions = v_total_questions,
      rating = p_rating, feedback = COALESCE(p_feedback, '') WHERE id = v_completion_id;
  END IF;

  RETURN QUERY SELECT c.id, c.quiz_id, c.taker_id, c.taker_name, c.score, c.total_questions,
    c.rating, c.feedback, c.created_at, v_xp FROM public.completions c WHERE c.id = v_completion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(TEXT,TEXT,TEXT,INTEGER,INTEGER,TEXT) TO authenticated;

-- Make the timer reliable even if an older RPC definition is still present.
DROP FUNCTION IF EXISTS public.get_user_daily_quiz_slot(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.get_user_daily_quiz_slot(p_user_id TEXT, p_tier TEXT)
RETURNS TABLE (
  quiz_id TEXT, quiz_payload JSONB, generated_at TIMESTAMPTZ, answered_at TIMESTAMPTZ,
  next_available_at TIMESTAMPTZ, refreshing BOOLEAN, refresh_interval_seconds INTEGER,
  seconds_until_refresh INTEGER
) AS $$
BEGIN
  IF auth.uid()::text <> p_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  INSERT INTO public.daily_quiz_user_slots (user_id, tier, refresh_interval_seconds)
  VALUES (p_user_id, p_tier, CASE p_tier WHEN 'diamond' THEN 60 WHEN 'gold' THEN 3600 ELSE 86400 END)
  ON CONFLICT (user_id, tier) DO NOTHING;
  RETURN QUERY SELECT s.quiz_payload->>'id', s.quiz_payload, s.generated_at, s.answered_at,
    s.next_available_at, s.refreshing, s.refresh_interval_seconds,
    CASE WHEN s.next_available_at IS NULL THEN 0
      ELSE GREATEST(0, CEIL(EXTRACT(EPOCH FROM (s.next_available_at - now())))::INTEGER) END
    FROM public.daily_quiz_user_slots s
   WHERE s.user_id = p_user_id AND s.tier = p_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.get_user_daily_quiz_slot(TEXT,TEXT) TO authenticated;
NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260808_xp_and_daily_fixes.sql

-- Quiz Space: XP persistence and daily-quiz first-generation fixes.
-- Safe to run repeatedly.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0;

-- Fix the initial empty slot: a slot with no quiz must be claimable immediately,
-- even though its seeded refreshed_at is now(). Also lock the row so two tabs
-- cannot both win the generation race.
CREATE OR REPLACE FUNCTION claim_daily_quiz_refresh(p_tier TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_quiz_id TEXT;
    v_refreshed_at TIMESTAMPTZ;
    v_interval INTEGER;
    v_refreshing BOOLEAN;
BEGIN
    SELECT quiz_id, refreshed_at, refresh_interval_seconds, refreshing
      INTO v_quiz_id, v_refreshed_at, v_interval, v_refreshing
      FROM daily_quiz_slots
     WHERE tier = p_tier
     FOR UPDATE;

    IF NOT FOUND THEN
        RETURN false;
    END IF;
    -- Recover a slot left locked by a crashed browser/Worker attempt.
    IF v_refreshing AND (v_refreshed_at IS NULL OR now() - v_refreshed_at > interval '10 minutes') THEN
        UPDATE daily_quiz_slots
           SET refreshing = false
         WHERE tier = p_tier;
        v_refreshing := false;
    END IF;
    IF v_refreshing THEN
        RETURN false;
    END IF;
    IF v_quiz_id IS NULL
       OR v_refreshed_at IS NULL
       OR now() - v_refreshed_at >= v_interval * interval '1 second' THEN
        UPDATE daily_quiz_slots
           SET refreshing = true
         WHERE tier = p_tier;
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The old function counted rows in quizzes (0 or 1), not questions in the
-- JSONB payload, and never awarded XP. Replace it with an atomic first-attempt
-- award. Retakes update the completion but do not farm XP repeatedly.
-- The return shape now includes xp_awarded, so drop the old signature first;
-- PostgreSQL cannot change a function's OUT parameters with CREATE OR REPLACE.
DROP FUNCTION IF EXISTS submit_quiz_attempt(TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT);

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
    created_at TIMESTAMPTZ,
    xp_awarded INTEGER
) AS $$
DECLARE
    v_completion_id TEXT;
    v_total_questions INTEGER;
    v_xp_awarded INTEGER := 0;
    v_existing_id TEXT;
    v_score INTEGER := GREATEST(0, COALESCE(p_score, 0));
BEGIN
    SELECT COALESCE(jsonb_array_length(q.questions), 0)
      INTO v_total_questions
      FROM quizzes q
     WHERE q.id = p_quiz_id;
    IF v_total_questions <= 0 THEN v_total_questions := 1; END IF;

    SELECT c.id INTO v_existing_id
      FROM completions c
     WHERE c.quiz_id = p_quiz_id AND c.taker_id = p_taker_id
     LIMIT 1
     FOR UPDATE;

    IF v_existing_id IS NULL THEN
        v_completion_id := 'comp_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 8);
        INSERT INTO completions (id, quiz_id, quiz_title, taker_id, taker_name, score, total_questions, rating, feedback)
        SELECT v_completion_id, p_quiz_id, q.title, p_taker_id, p_taker_name, v_score, v_total_questions, p_rating, COALESCE(p_feedback, '')
          FROM quizzes q WHERE q.id = p_quiz_id;
        UPDATE quizzes SET total_plays = COALESCE(total_plays, 0) + 1 WHERE id = p_quiz_id;

        -- 100 XP for a perfect quiz, with a fair 10 XP per correct answer and
        -- a 10 XP participation bonus. Keep the first-attempt award stable.
        v_xp_awarded := 10 + (v_score * 10);
        UPDATE users
           SET xp = COALESCE(xp, 0) + v_xp_awarded,
               updated_at = now()
         WHERE uid = p_taker_id;
    ELSE
        v_completion_id := v_existing_id;
        UPDATE completions
           SET score = v_score,
               total_questions = v_total_questions,
               rating = p_rating,
               feedback = COALESCE(p_feedback, '')
         WHERE id = v_existing_id;
    END IF;

    RETURN QUERY
    SELECT c.id, c.quiz_id, c.taker_id, c.taker_name, c.score, c.total_questions,
           c.rating, c.feedback, c.created_at, v_xp_awarded
      FROM completions c
     WHERE c.id = v_completion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION submit_quiz_attempt(TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_daily_quiz_refresh(TEXT) TO authenticated;

-- >>> ORIGIN: supabase/migrations/20260809_add_admin_coupon_management_rpc.sql

CREATE OR REPLACE FUNCTION public.admin_save_coupon(p_coupon jsonb)
RETURNS public.coupon_codes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.coupon_codes;
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF p_coupon IS NULL
     OR COALESCE(trim(p_coupon->>'id'), '') = ''
     OR COALESCE(trim(p_coupon->>'code'), '') = '' THEN
    RAISE EXCEPTION 'Coupon id and code are required';
  END IF;

  INSERT INTO public.coupon_codes
    (id, code, discount_percent, max_uses, used_count, expiry_date,
     is_active, created_at, applicable_plans)
  VALUES
    (trim(p_coupon->>'id'),
     upper(trim(p_coupon->>'code')),
     COALESCE((p_coupon->>'discount_percent')::integer, 0),
     COALESCE((p_coupon->>'max_uses')::integer, 0),
     COALESCE((p_coupon->>'used_count')::integer, 0),
     NULLIF(p_coupon->>'expiry_date', '')::timestamptz,
     COALESCE((p_coupon->>'is_active')::boolean, true),
     COALESCE(NULLIF(p_coupon->>'created_at', '')::timestamptz, now()),
     COALESCE(NULLIF(trim(p_coupon->>'applicable_plans'), ''), 'silver,gold,diamond'))
  ON CONFLICT (id) DO UPDATE SET
    code = EXCLUDED.code,
    discount_percent = EXCLUDED.discount_percent,
    max_uses = EXCLUDED.max_uses,
    used_count = EXCLUDED.used_count,
    expiry_date = EXCLUDED.expiry_date,
    is_active = EXCLUDED.is_active,
    applicable_plans = EXCLUDED.applicable_plans
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_coupon(p_coupon_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  DELETE FROM public.coupon_codes WHERE id = p_coupon_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_coupon(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_coupon(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_save_coupon(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_coupon(text) TO authenticated;
NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260809_allow_atomic_coupon_entitlement_update.sql

-- Allow only the trusted coupon-redemption RPC to update entitlement columns.
-- Direct client profile updates remain protected by the trigger.
CREATE OR REPLACE FUNCTION public.protect_privileged_user_columns()
RETURNS TRIGGER AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_is_service_role BOOLEAN;
  v_badge_update_allowed BOOLEAN;
  v_subscription_update_allowed BOOLEAN;
BEGIN
  v_is_service_role := (auth.jwt() ->> 'role') = 'service_role';
  IF v_is_service_role THEN RETURN NEW; END IF;

  SELECT is_admin INTO v_is_admin FROM public.users WHERE uid = auth.uid()::text;
  IF COALESCE(v_is_admin, false) THEN
    NEW.is_admin := OLD.is_admin;
    RETURN NEW;
  END IF;

  v_badge_update_allowed := COALESCE(current_setting('app.allow_badge_update', true), '') = 'on';
  v_subscription_update_allowed := COALESCE(current_setting('app.allow_subscription_update', true), '') = 'on';

  IF NOT v_subscription_update_allowed THEN
    NEW.is_premium := OLD.is_premium;
    NEW.plan_id := OLD.plan_id;
    NEW.plan_name := OLD.plan_name;
    NEW.is_lifetime := OLD.is_lifetime;
    NEW.is_founder := OLD.is_founder;
    NEW.is_suspended := OLD.is_suspended;
    NEW.category_id := OLD.category_id;
    NEW.renewal_date := OLD.renewal_date;
  END IF;

  NEW.is_admin := OLD.is_admin;
  IF NOT v_badge_update_allowed THEN
    NEW.badge_tier := OLD.badge_tier;
    NEW.name_color := OLD.name_color;
    NEW.badge_color := OLD.badge_color;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.redeem_coupon_for_user(
  p_coupon_id TEXT,
  p_user_id TEXT,
  p_discount_percent INTEGER,
  p_plan_id TEXT,
  p_plan_name TEXT,
  p_order_id TEXT,
  p_renewal_date TIMESTAMPTZ
) RETURNS TEXT AS $$
DECLARE
  v_usage_id TEXT;
  v_rows INTEGER;
BEGIN
  IF auth.uid()::text <> p_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  PERFORM set_config('app.allow_subscription_update', 'on', true);
  v_usage_id := public.record_coupon_usage(
    p_coupon_id, p_user_id, p_discount_percent, p_plan_id, p_order_id
  );
  UPDATE public.users
     SET is_premium = true,
         plan_name = p_plan_name,
         plan_id = p_plan_id,
         is_lifetime = false,
         is_founder = false,
         renewal_date = p_renewal_date,
         updated_at = now()
   WHERE uid = p_user_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'User profile not found'; END IF;
  RETURN v_usage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.redeem_coupon_for_user(TEXT,TEXT,INTEGER,TEXT,TEXT,TEXT,TIMESTAMPTZ) TO authenticated;
NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260809_daily_quiz_rotation_fix.sql

-- Ensure a completed daily quiz can never remain visible as the active slot.
-- The next slot is generated only after the tier-specific cooldown.

DROP FUNCTION IF EXISTS public.complete_user_daily_quiz(TEXT, TEXT);
CREATE FUNCTION public.complete_user_daily_quiz(
  p_user_id TEXT,
  p_quiz_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier TEXT;
  v_interval INTEGER;
  v_updated INTEGER;
BEGIN
  IF auth.uid()::TEXT <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT tier
    INTO v_tier
    FROM public.daily_quiz_user_slots
   WHERE user_id = p_user_id
     AND answered_at IS NULL
     AND (
       quiz_payload->>'id' = p_quiz_id
       OR quiz_id = p_quiz_id
     )
   ORDER BY generated_at DESC NULLS LAST
   LIMIT 1
   FOR UPDATE;

  IF v_tier IS NULL THEN
    RETURN FALSE;
  END IF;

  v_interval := CASE v_tier
    WHEN 'diamond' THEN 60
    WHEN 'gold' THEN 3600
    ELSE 86400
  END;

  UPDATE public.daily_quiz_user_slots
     SET quiz_id = NULL,
         quiz_payload = NULL,
         answered_at = now(),
         next_available_at = now() + (v_interval * interval '1 second'),
         refresh_interval_seconds = v_interval,
         refreshing = false
   WHERE user_id = p_user_id
     AND tier = v_tier
     AND answered_at IS NULL
     AND (
       quiz_payload->>'id' = p_quiz_id
       OR quiz_id = p_quiz_id
     );

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_user_daily_quiz(TEXT, TEXT) TO authenticated;
NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260809_daily_quiz_rpc_repair.sql

-- QuizSpace: canonical per-user daily quiz RPC repair.
-- Safe to apply after the older daily-quiz migrations.

ALTER TABLE public.daily_quiz_user_slots
  ADD COLUMN IF NOT EXISTS quiz_payload JSONB;

DROP FUNCTION IF EXISTS public.get_user_daily_quiz_slot(TEXT, TEXT);
CREATE FUNCTION public.get_user_daily_quiz_slot(p_user_id TEXT, p_tier TEXT)
RETURNS TABLE (
  quiz_id TEXT,
  quiz_payload JSONB,
  generated_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  next_available_at TIMESTAMPTZ,
  refreshing BOOLEAN,
  refresh_interval_seconds INTEGER,
  seconds_until_refresh INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_interval INTEGER := CASE p_tier WHEN 'diamond' THEN 60 WHEN 'gold' THEN 3600 ELSE 86400 END;
BEGIN
  IF auth.uid()::TEXT <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.daily_quiz_user_slots (user_id, tier, refresh_interval_seconds)
  VALUES (p_user_id, p_tier, v_interval)
  ON CONFLICT (user_id, tier) DO UPDATE
    SET refresh_interval_seconds = EXCLUDED.refresh_interval_seconds;

  RETURN QUERY
  SELECT s.quiz_payload->>'id', s.quiz_payload, s.generated_at, s.answered_at,
         s.next_available_at, s.refreshing, s.refresh_interval_seconds,
         CASE WHEN s.next_available_at IS NULL THEN 0
              ELSE GREATEST(0, CEIL(EXTRACT(EPOCH FROM (s.next_available_at - now())))::INTEGER)
         END
    FROM public.daily_quiz_user_slots AS s
   WHERE s.user_id = p_user_id AND s.tier = p_tier;
END;
$$;

DROP FUNCTION IF EXISTS public.claim_user_daily_quiz_refresh(TEXT, TEXT);
CREATE FUNCTION public.claim_user_daily_quiz_refresh(p_user_id TEXT, p_tier TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.daily_quiz_user_slots%ROWTYPE;
BEGIN
  IF auth.uid()::TEXT <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.daily_quiz_user_slots (user_id, tier, refresh_interval_seconds)
  VALUES (p_user_id, p_tier, CASE p_tier WHEN 'diamond' THEN 60 WHEN 'gold' THEN 3600 ELSE 86400 END)
  ON CONFLICT (user_id, tier) DO NOTHING;

  SELECT * INTO s
    FROM public.daily_quiz_user_slots
   WHERE user_id = p_user_id AND tier = p_tier
   FOR UPDATE;

  IF s.refreshing AND (s.generated_at IS NULL OR now() - s.generated_at > interval '10 minutes') THEN
    UPDATE public.daily_quiz_user_slots SET refreshing = false
     WHERE user_id = p_user_id AND tier = p_tier;
    s.refreshing := false;
  END IF;

  IF s.refreshing OR (s.quiz_payload IS NOT NULL AND s.answered_at IS NULL) THEN
    RETURN false;
  END IF;
  IF s.next_available_at IS NOT NULL AND now() < s.next_available_at THEN
    RETURN false;
  END IF;

  UPDATE public.daily_quiz_user_slots
     SET refreshing = true,
         refresh_interval_seconds = CASE p_tier WHEN 'diamond' THEN 60 WHEN 'gold' THEN 3600 ELSE 86400 END
   WHERE user_id = p_user_id AND tier = p_tier;
  RETURN true;
END;
$$;

DROP FUNCTION IF EXISTS public.finalize_user_daily_quiz_refresh(TEXT, TEXT, JSONB);
CREATE FUNCTION public.finalize_user_daily_quiz_refresh(
  p_user_id TEXT,
  p_tier TEXT,
  p_quiz_payload JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid()::TEXT <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.daily_quiz_user_slots
     SET quiz_id = NULL,
         quiz_payload = p_quiz_payload,
         generated_at = now(),
         answered_at = NULL,
         next_available_at = NULL,
         refreshing = false
   WHERE user_id = p_user_id AND tier = p_tier;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_daily_quiz_slot(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_user_daily_quiz_refresh(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_user_daily_quiz_refresh(TEXT, TEXT, JSONB) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260809_fix_coupon_admin_rls_check.sql

-- Use a SECURITY DEFINER helper so the admin lookup is not blocked by users RLS.
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
      AND is_admin = true
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;

DROP POLICY IF EXISTS coupon_codes_admin_write ON public.coupon_codes;
CREATE POLICY coupon_codes_admin_write
  ON public.coupon_codes FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS coupon_codes_admin_update ON public.coupon_codes;
CREATE POLICY coupon_codes_admin_update
  ON public.coupon_codes FOR UPDATE TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS coupon_codes_admin_delete ON public.coupon_codes;
CREATE POLICY coupon_codes_admin_delete
  ON public.coupon_codes FOR DELETE TO authenticated
  USING (public.current_user_is_admin());

NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260809_fix_legacy_daily_payload_reset.sql

CREATE OR REPLACE FUNCTION public.reset_legacy_daily_quiz_slot(p_user_id text, p_tier text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid()::text <> p_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.daily_quiz_user_slots
     SET quiz_id = NULL,
         quiz_payload = NULL,
         generated_at = NULL,
         answered_at = NULL,
         next_available_at = NULL,
         refreshing = false,
         refresh_interval_seconds = CASE p_tier WHEN 'diamond' THEN 60 WHEN 'gold' THEN 3600 ELSE 86400 END
   WHERE user_id = p_user_id
     AND tier = p_tier
     AND answered_at IS NULL;
  RETURN FOUND;
END;
$function$;

-- Clear unanswered payloads from the old Date.now()-based ID format.
UPDATE public.daily_quiz_user_slots
SET quiz_id = NULL,
    quiz_payload = NULL,
    generated_at = NULL,
    next_available_at = NULL,
    refreshing = false
WHERE answered_at IS NULL
  AND (quiz_payload->>'id') ~ '^daily-.+-[0-9]{10,}-[0-9]+$';

NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260809_sync_quiz_total_plays_with_completions.sql

CREATE OR REPLACE FUNCTION public.sync_quiz_total_plays()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_quiz_id TEXT := COALESCE(NEW.quiz_id, OLD.quiz_id);
BEGIN
  UPDATE public.quizzes
     SET total_plays = (
       SELECT COUNT(*)::INTEGER
       FROM public.completions
       WHERE quiz_id = target_quiz_id
     )
   WHERE id = target_quiz_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS completions_sync_quiz_total_plays ON public.completions;

CREATE TRIGGER completions_sync_quiz_total_plays
AFTER INSERT OR DELETE ON public.completions
FOR EACH ROW
EXECUTE FUNCTION public.sync_quiz_total_plays();

UPDATE public.quizzes q
   SET total_plays = (
     SELECT COUNT(*)::INTEGER
     FROM public.completions c
     WHERE c.quiz_id = q.id
   );

-- >>> ORIGIN: supabase/migrations/20260810_rewards_points.sql

-- Quiz Space rewards and points foundation
-- Safe to run repeatedly. All point grants are server-side and idempotent.

CREATE TABLE IF NOT EXISTS public.reward_levels (
  level INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  min_points INTEGER NOT NULL CHECK (min_points >= 0)
);

CREATE TABLE IF NOT EXISTS public.reward_badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'award',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.user_reward_balances (
  user_id TEXT PRIMARY KEY REFERENCES public.users(uid) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  level INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reward_points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  event_key TEXT NOT NULL,
  reference_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_key)
);

CREATE TABLE IF NOT EXISTS public.user_reward_badges (
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES public.reward_badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

INSERT INTO public.reward_levels (level, name, name_ar, min_points) VALUES
  (1, 'New Explorer', 'مستكشف جديد', 0),
  (2, 'Curious Learner', 'متعلم فضولي', 100),
  (3, 'Active Scholar', 'باحث نشط', 250),
  (4, 'Knowledge Builder', 'باني المعرفة', 500),
  (5, 'Quiz Champion', 'بطل الاختبارات', 1000),
  (6, 'Master Learner', 'سيد التعلم', 2000)
ON CONFLICT (level) DO UPDATE SET name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, min_points = EXCLUDED.min_points;

INSERT INTO public.reward_badges (id, name, name_ar, description, description_ar, icon, sort_order) VALUES
  ('first_quiz', 'First Step', 'البداية', 'Complete your first quiz.', 'أكمل أول اختبار لك.', 'sparkles', 1),
  ('active_learner', 'Active Learner', 'المتعلم النشط', 'Complete 10 quizzes.', 'أكمل 10 اختبارات.', 'book-open', 2),
  ('high_scorer', 'High Scorer', 'المتفوق', 'Score 90% or higher in five quizzes.', 'احصل على 90% أو أكثر في خمسة اختبارات.', 'trophy', 3),
  ('creator', 'Knowledge Creator', 'صانع المعرفة', 'Create your first quiz.', 'أنشئ أول اختبار لك.', 'pencil', 4),
  ('seven_day_streak', 'Seven Day Streak', 'صاحب السلسلة', 'Learn on seven consecutive days.', 'حافظ على التعلم سبعة أيام متتالية.', 'flame', 5)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, description = EXCLUDED.description, description_ar = EXCLUDED.description_ar, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

CREATE INDEX IF NOT EXISTS reward_points_ledger_user_created_idx ON public.reward_points_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_reward_badges_user_idx ON public.user_reward_badges(user_id, earned_at DESC);

ALTER TABLE public.reward_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reward_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reward_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reward_levels_read ON public.reward_levels;
CREATE POLICY reward_levels_read ON public.reward_levels FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS reward_badges_read ON public.reward_badges;
CREATE POLICY reward_badges_read ON public.reward_badges FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS reward_balance_own_read ON public.user_reward_balances;
CREATE POLICY reward_balance_own_read ON public.user_reward_balances FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS reward_ledger_own_read ON public.reward_points_ledger;
CREATE POLICY reward_ledger_own_read ON public.reward_points_ledger FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS reward_badges_own_read ON public.user_reward_badges;
CREATE POLICY reward_badges_own_read ON public.user_reward_badges FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.reward_level_for_points(p_points INTEGER)
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(level), 1) FROM public.reward_levels WHERE min_points <= GREATEST(0, COALESCE(p_points, 0));
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.award_quiz_completion_rewards(p_completion_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_completion RECORD;
  v_points INTEGER;
  v_event_key TEXT;
  v_inserted BOOLEAN := false;
  v_rows INTEGER := 0;
  v_total_completed INTEGER;
  v_high_scores INTEGER;
  v_level INTEGER;
  v_total_points INTEGER;
BEGIN
  SELECT c.* INTO v_completion FROM public.completions c WHERE c.id = p_completion_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Completion not found'; END IF;
  IF auth.uid()::text <> v_completion.taker_id::text THEN RAISE EXCEPTION 'Not authorized'; END IF;

  v_event_key := 'quiz_completion:' || p_completion_id;
  v_points := 10 + (GREATEST(0, COALESCE(v_completion.score, 0)) * 2);
  IF COALESCE(v_completion.total_questions, 0) > 0
     AND (v_completion.score::numeric / v_completion.total_questions::numeric) >= 0.80 THEN
    v_points := v_points + 15;
  END IF;
  IF COALESCE(v_completion.total_questions, 0) > 0
     AND v_completion.score >= v_completion.total_questions THEN
    v_points := v_points + 30;
  END IF;

  INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id, metadata)
  VALUES (v_completion.taker_id::text, v_points, 'quiz_completion', v_event_key, p_completion_id,
          jsonb_build_object('quiz_id', v_completion.quiz_id, 'score', v_completion.score, 'total_questions', v_completion.total_questions))
  ON CONFLICT (user_id, event_key) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_inserted := v_rows > 0;

  INSERT INTO public.user_reward_balances (user_id, points, level)
  VALUES (v_completion.taker_id::text, CASE WHEN v_inserted THEN v_points ELSE 0 END,
          public.reward_level_for_points(CASE WHEN v_inserted THEN v_points ELSE 0 END))
  ON CONFLICT (user_id) DO UPDATE SET
    points = public.user_reward_balances.points + CASE WHEN v_inserted THEN v_points ELSE 0 END,
    level = public.reward_level_for_points(public.user_reward_balances.points + CASE WHEN v_inserted THEN v_points ELSE 0 END),
    updated_at = now();

  SELECT COUNT(*)::INTEGER INTO v_total_completed FROM public.completions WHERE taker_id = v_completion.taker_id;
  SELECT COUNT(*)::INTEGER INTO v_high_scores FROM public.completions
    WHERE taker_id = v_completion.taker_id AND total_questions > 0 AND score::numeric / total_questions::numeric >= 0.90;
  SELECT b.points, b.level INTO v_total_points, v_level FROM public.user_reward_balances b WHERE b.user_id = v_completion.taker_id::text;

  IF v_total_completed >= 1 THEN INSERT INTO public.user_reward_badges(user_id, badge_id) VALUES (v_completion.taker_id::text, 'first_quiz') ON CONFLICT DO NOTHING; END IF;
  IF v_total_completed >= 10 THEN INSERT INTO public.user_reward_badges(user_id, badge_id) VALUES (v_completion.taker_id::text, 'active_learner') ON CONFLICT DO NOTHING; END IF;
  IF v_high_scores >= 5 THEN INSERT INTO public.user_reward_badges(user_id, badge_id) VALUES (v_completion.taker_id::text, 'high_scorer') ON CONFLICT DO NOTHING; END IF;

  RETURN jsonb_build_object('points_awarded', CASE WHEN v_inserted THEN v_points ELSE 0 END, 'total_points', v_total_points, 'level', v_level);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

INSERT INTO public.user_reward_balances (user_id, points, level)
SELECT u.uid, COALESCE(u.xp, 0), public.reward_level_for_points(COALESCE(u.xp, 0))
FROM public.users u
WHERE u.uid IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.award_quiz_creator_reward()
RETURNS TRIGGER AS $$
DECLARE
  v_points INTEGER := 50;
  v_rows INTEGER := 0;
BEGIN
  IF NEW.creator_id IS NULL OR NEW.creator_id::text = '' THEN RETURN NEW; END IF;
  INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id, metadata)
  VALUES (NEW.creator_id::text, v_points, 'quiz_creation', 'quiz_creation:' || NEW.id, NEW.id,
          jsonb_build_object('quiz_title', NEW.title))
  ON CONFLICT (user_id, event_key) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  INSERT INTO public.user_reward_balances (user_id, points, level)
  VALUES (NEW.creator_id::text, CASE WHEN v_rows > 0 THEN v_points ELSE 0 END,
          public.reward_level_for_points(CASE WHEN v_rows > 0 THEN v_points ELSE 0 END))
  ON CONFLICT (user_id) DO UPDATE SET
    points = public.user_reward_balances.points + CASE WHEN v_rows > 0 THEN v_points ELSE 0 END,
    level = public.reward_level_for_points(public.user_reward_balances.points + CASE WHEN v_rows > 0 THEN v_points ELSE 0 END),
    updated_at = now();
  INSERT INTO public.user_reward_badges(user_id, badge_id)
  VALUES (NEW.creator_id::text, 'creator') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS quizzes_creator_reward ON public.quizzes;
CREATE TRIGGER quizzes_creator_reward
AFTER INSERT ON public.quizzes
FOR EACH ROW EXECUTE FUNCTION public.award_quiz_creator_reward();

GRANT EXECUTE ON FUNCTION public.reward_level_for_points(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_quiz_completion_rewards(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260811_competitive_rewards_vip.sql

-- Quiz Space competitive rewards, daily gifts, streaks, VIP tiers and challenges
-- Server-side, idempotent reward claims. User identifiers follow public.users.uid (TEXT).

ALTER TABLE public.user_reward_balances
  ADD COLUMN IF NOT EXISTS coins INTEGER NOT NULL DEFAULT 0 CHECK (coins >= 0),
  ADD COLUMN IF NOT EXISTS daily_streak INTEGER NOT NULL DEFAULT 0 CHECK (daily_streak >= 0),
  ADD COLUMN IF NOT EXISTS last_daily_claim DATE,
  ADD COLUMN IF NOT EXISTS vip_tier TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS vip_updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.vip_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  min_points INTEGER NOT NULL CHECK (min_points >= 0),
  points_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.00 CHECK (points_multiplier >= 1.00),
  daily_coin_bonus INTEGER NOT NULL DEFAULT 0 CHECK (daily_coin_bonus >= 0),
  challenge_slots INTEGER NOT NULL DEFAULT 3 CHECK (challenge_slots BETWEEN 1 AND 10),
  color TEXT NOT NULL DEFAULT '#94a3b8',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.reward_challenge_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  event_type TEXT NOT NULL,
  target INTEGER NOT NULL CHECK (target > 0),
  points_reward INTEGER NOT NULL CHECK (points_reward >= 0),
  coins_reward INTEGER NOT NULL CHECK (coins_reward >= 0),
  icon TEXT NOT NULL DEFAULT 'target',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.daily_gift_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  claim_date DATE NOT NULL,
  day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 7),
  points_reward INTEGER NOT NULL DEFAULT 0,
  coins_reward INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, claim_date)
);

INSERT INTO public.vip_tiers (id, name, name_ar, min_points, points_multiplier, daily_coin_bonus, challenge_slots, color, sort_order) VALUES
  ('none', 'Explorer', 'مستكشف', 0, 1.00, 0, 3, '#94a3b8', 0),
  ('bronze', 'VIP Bronze', 'VIP برونزي', 500, 1.05, 5, 3, '#cd7f32', 1),
  ('silver', 'VIP Silver', 'VIP فضي', 1500, 1.10, 10, 4, '#cbd5e1', 2),
  ('gold', 'VIP Gold', 'VIP ذهبي', 4000, 1.20, 20, 5, '#fbbf24', 3),
  ('platinum', 'VIP Platinum', 'VIP بلاتيني', 10000, 1.35, 35, 6, '#a78bfa', 4)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, min_points = EXCLUDED.min_points, points_multiplier = EXCLUDED.points_multiplier, daily_coin_bonus = EXCLUDED.daily_coin_bonus, challenge_slots = EXCLUDED.challenge_slots, color = EXCLUDED.color, sort_order = EXCLUDED.sort_order;

INSERT INTO public.reward_challenge_templates (id, name, name_ar, description, description_ar, event_type, target, points_reward, coins_reward, icon, sort_order) VALUES
  ('complete_quiz', 'Daily Starter', 'بداية اليوم', 'Complete one quiz today.', 'أكمل اختباراً واحداً اليوم.', 'complete_quiz', 1, 25, 15, 'book-open', 1),
  ('score_80', 'Accuracy Run', 'جولة الدقة', 'Score 80% or higher in one quiz today.', 'احصل على 80% أو أكثر في اختبار اليوم.', 'score_80', 1, 35, 20, 'target', 2),
  ('complete_two', 'Double Play', 'المحاولة المزدوجة', 'Complete two quizzes today.', 'أكمل اختبارين اليوم.', 'complete_quiz', 2, 50, 30, 'zap', 3),
  ('create_quiz', 'Knowledge Creator', 'صانع المعرفة', 'Create one quiz today.', 'أنشئ اختباراً واحداً اليوم.', 'create_quiz', 1, 40, 25, 'pencil', 4),
  ('perfect_score', 'Perfect Strike', 'الضربة الكاملة', 'Get a perfect score in one quiz today.', 'احصل على الدرجة الكاملة في اختبار اليوم.', 'perfect_score', 1, 60, 40, 'trophy', 5),
  ('three_quizzes', 'Quiz Marathon', 'ماراثون الاختبارات', 'Complete three quizzes today.', 'أكمل ثلاثة اختبارات اليوم.', 'complete_quiz', 3, 80, 55, 'flame', 6)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, description = EXCLUDED.description, description_ar = EXCLUDED.description_ar, event_type = EXCLUDED.event_type, target = EXCLUDED.target, points_reward = EXCLUDED.points_reward, coins_reward = EXCLUDED.coins_reward, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

ALTER TABLE public.vip_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_challenge_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_gift_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vip_tiers_read ON public.vip_tiers;
CREATE POLICY vip_tiers_read ON public.vip_tiers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS challenge_templates_read ON public.reward_challenge_templates;
CREATE POLICY challenge_templates_read ON public.reward_challenge_templates FOR SELECT TO authenticated USING (is_active = true);
DROP POLICY IF EXISTS daily_gifts_own_read ON public.daily_gift_claims;
CREATE POLICY daily_gifts_own_read ON public.daily_gift_claims FOR SELECT TO authenticated USING (user_id = auth.uid()::text);

CREATE OR REPLACE FUNCTION public.vip_tier_for_points(p_points INTEGER)
RETURNS TEXT AS $$
  SELECT COALESCE(MAX(id) FILTER (WHERE min_points = (SELECT MAX(min_points) FROM public.vip_tiers WHERE min_points <= GREATEST(0, COALESCE(p_points, 0)))), 'none')
  FROM public.vip_tiers;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.vip_multiplier_for_user(p_user_id TEXT)
RETURNS NUMERIC AS $$
  SELECT COALESCE(t.points_multiplier, 1.00)
  FROM public.user_reward_balances b
  LEFT JOIN public.vip_tiers t ON t.id = b.vip_tier
  WHERE b.user_id = p_user_id;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.claim_daily_gift()
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today DATE := (now() AT TIME ZONE 'UTC')::date;
  v_last DATE;
  v_streak INTEGER;
  v_day INTEGER;
  v_points INTEGER;
  v_coins INTEGER;
  v_bonus INTEGER := 0;
  v_inserted INTEGER := 0;
  v_tier TEXT;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN RAISE EXCEPTION 'Authentication required'; END IF;
  INSERT INTO public.user_reward_balances (user_id, points, level, vip_tier) VALUES (v_user_id, 0, 1, 'none') ON CONFLICT (user_id) DO NOTHING;
  SELECT last_daily_claim, daily_streak, vip_tier INTO v_last, v_streak, v_tier FROM public.user_reward_balances WHERE user_id = v_user_id FOR UPDATE;
  IF v_last = v_today THEN
    RETURN jsonb_build_object('claimed', false, 'claim_date', v_today, 'streak', v_streak, 'message', 'Already claimed today');
  END IF;
  IF v_last = v_today - 1 THEN v_streak := GREATEST(1, v_streak + 1); ELSE v_streak := 1; END IF;
  v_day := ((v_streak - 1) % 7) + 1;
  v_points := CASE v_day WHEN 1 THEN 10 WHEN 2 THEN 15 WHEN 3 THEN 20 WHEN 4 THEN 25 WHEN 5 THEN 35 WHEN 6 THEN 50 ELSE 100 END;
  v_coins := CASE v_day WHEN 1 THEN 20 WHEN 2 THEN 25 WHEN 3 THEN 35 WHEN 4 THEN 45 WHEN 5 THEN 60 WHEN 6 THEN 80 ELSE 150 END;
  SELECT daily_coin_bonus INTO v_bonus FROM public.vip_tiers WHERE id = v_tier;
  v_coins := v_coins + COALESCE(v_bonus, 0);
  INSERT INTO public.daily_gift_claims(user_id, claim_date, day_number, points_reward, coins_reward)
  VALUES (v_user_id, v_today, v_day, v_points, v_coins) ON CONFLICT (user_id, claim_date) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN RETURN jsonb_build_object('claimed', false, 'claim_date', v_today, 'streak', v_streak); END IF;
  INSERT INTO public.reward_points_ledger(user_id, points, event_type, event_key, reference_id, metadata)
  VALUES (v_user_id, v_points, 'daily_gift', 'daily_gift:' || v_today, v_today::text, jsonb_build_object('day_number', v_day, 'coins', v_coins));
  UPDATE public.user_reward_balances SET points = points + v_points, coins = coins + v_coins, daily_streak = v_streak, last_daily_claim = v_today, level = public.reward_level_for_points(points + v_points), vip_tier = public.vip_tier_for_points(points + v_points), vip_updated_at = now(), updated_at = now() WHERE user_id = v_user_id;
  RETURN jsonb_build_object('claimed', true, 'claim_date', v_today, 'day_number', v_day, 'streak', v_streak, 'points', v_points, 'coins', v_coins);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.claim_daily_challenge(p_challenge_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today DATE := (now() AT TIME ZONE 'UTC')::date;
  v_template RECORD;
  v_count INTEGER := 0;
  v_event_key TEXT;
  v_inserted INTEGER := 0;
  v_multiplier NUMERIC := 1.00;
  v_points INTEGER;
  v_coins INTEGER;
  v_total_points INTEGER;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_template FROM public.reward_challenge_templates WHERE id = p_challenge_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Challenge not found'; END IF;
  IF v_template.event_type = 'complete_quiz' THEN SELECT COUNT(*) INTO v_count FROM public.completions WHERE taker_id = v_user_id AND created_at::date = v_today;
  ELSIF v_template.event_type = 'score_80' THEN SELECT COUNT(*) INTO v_count FROM public.completions WHERE taker_id = v_user_id AND created_at::date = v_today AND total_questions > 0 AND score::numeric / total_questions::numeric >= 0.80;
  ELSIF v_template.event_type = 'perfect_score' THEN SELECT COUNT(*) INTO v_count FROM public.completions WHERE taker_id = v_user_id AND created_at::date = v_today AND total_questions > 0 AND score >= total_questions;
  ELSIF v_template.event_type = 'create_quiz' THEN SELECT COUNT(*) INTO v_count FROM public.quizzes WHERE creator_id = v_user_id AND created_at::date = v_today;
  END IF;
  IF v_count < v_template.target THEN RAISE EXCEPTION 'Challenge is not complete yet'; END IF;
  v_event_key := 'daily_challenge:' || v_today || ':' || p_challenge_id;
  SELECT points_multiplier INTO v_multiplier FROM public.vip_tiers t JOIN public.user_reward_balances b ON b.vip_tier = t.id WHERE b.user_id = v_user_id;
  v_points := ROUND(v_template.points_reward * COALESCE(v_multiplier, 1.00));
  v_coins := v_template.coins_reward;
  INSERT INTO public.reward_points_ledger(user_id, points, event_type, event_key, reference_id, metadata)
  VALUES (v_user_id, v_points, 'daily_challenge', v_event_key, p_challenge_id, jsonb_build_object('date', v_today, 'coins', v_coins)) ON CONFLICT (user_id, event_key) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN RETURN jsonb_build_object('claimed', false, 'challenge_id', p_challenge_id, 'message', 'Already claimed'); END IF;
  INSERT INTO public.user_reward_balances(user_id, points, level, vip_tier) VALUES (v_user_id, v_points, public.reward_level_for_points(v_points), public.vip_tier_for_points(v_points)) ON CONFLICT (user_id) DO UPDATE SET points = public.user_reward_balances.points + v_points, coins = public.user_reward_balances.coins + v_coins, level = public.reward_level_for_points(public.user_reward_balances.points + v_points), vip_tier = public.vip_tier_for_points(public.user_reward_balances.points + v_points), vip_updated_at = now(), updated_at = now();
  SELECT points INTO v_total_points FROM public.user_reward_balances WHERE user_id = v_user_id;
  RETURN jsonb_build_object('claimed', true, 'challenge_id', p_challenge_id, 'points', v_points, 'coins', v_coins, 'total_points', v_total_points);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.vip_tier_for_points(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vip_multiplier_for_user(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_gift() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_challenge(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260812_harden_auth_provisioning.sql

-- The auth trigger writes only to fully-qualified public.users, so it does not
-- need to inherit a caller-controlled search_path.
ALTER FUNCTION public.handle_new_user() SET search_path = '';

-- >>> ORIGIN: supabase/migrations/20260812_platform_settings_persistence.sql

-- Persistent, singleton platform settings with a fail-closed admin-only update path.
CREATE TABLE IF NOT EXISTS public.platform_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton = true),
  maintenance_mode boolean NOT NULL DEFAULT false,
  allow_registrations boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);

INSERT INTO public.platform_settings (singleton, maintenance_mode, allow_registrations)
VALUES (true, false, true)
ON CONFLICT (singleton) DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_settings_public_read ON public.platform_settings;
CREATE POLICY platform_settings_public_read
  ON public.platform_settings
  FOR SELECT
  USING (true);

-- No direct INSERT, UPDATE, or DELETE policy is deliberately provided.
-- All writes must pass through the checked SECURITY DEFINER RPC below.

CREATE OR REPLACE FUNCTION public.update_platform_settings(
  p_maintenance_mode boolean,
  p_allow_registrations boolean
)
RETURNS TABLE (
  maintenance_mode boolean,
  allow_registrations boolean,
  updated_at timestamptz,
  updated_by text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE uid = auth.uid()::text
      AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Administrator permission is required to update platform settings.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.platform_settings
  SET maintenance_mode = p_maintenance_mode,
      allow_registrations = p_allow_registrations,
      updated_at = now(),
      updated_by = auth.uid()::text
  WHERE singleton = true;

  RETURN QUERY
  SELECT ps.maintenance_mode, ps.allow_registrations, ps.updated_at, ps.updated_by
  FROM public.platform_settings AS ps
  WHERE ps.singleton = true;
END;
$$;

REVOKE ALL ON FUNCTION public.update_platform_settings(boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_platform_settings(boolean, boolean) TO authenticated;

-- Enforce the registration toggle in the database so it cannot be bypassed by
-- invoking Supabase Auth directly from a modified browser client.
CREATE OR REPLACE FUNCTION public.enforce_registration_policy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allow_registrations boolean := true;
BEGIN
  SELECT ps.allow_registrations
  INTO v_allow_registrations
  FROM public.platform_settings AS ps
  WHERE ps.singleton = true;

  IF COALESCE(v_allow_registrations, true) = false THEN
    RAISE EXCEPTION 'New registrations are currently unavailable.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_registration_policy() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_registration_policy() TO supabase_auth_admin;

DROP TRIGGER IF EXISTS enforce_registration_policy_before_insert ON auth.users;
CREATE TRIGGER enforce_registration_policy_before_insert
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_registration_policy();

-- >>> ORIGIN: supabase/migrations/20260812_secure_classroom_message_access.sql

-- Restrict classroom message metadata and encrypted payload access to authorized participants.
DROP POLICY IF EXISTS classroom_messages_read ON public.classroom_messages;
DROP POLICY IF EXISTS classroom_messages_read_authorized ON public.classroom_messages;

CREATE POLICY classroom_messages_read_authorized
  ON public.classroom_messages
  FOR SELECT
  TO authenticated
  USING (
    sender_id = (auth.uid())::text
    OR EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.uid = (auth.uid())::text
        AND u.is_admin = true
    )
    OR EXISTS (
      SELECT 1
      FROM public.classrooms c
      WHERE c.id = classroom_messages.classroom_id
        AND c.created_by = (auth.uid())::text
    )
    OR EXISTS (
      SELECT 1
      FROM public.classroom_students cs
      WHERE cs.class_id = classroom_messages.classroom_id
        AND cs.student_id = (auth.uid())::text
    )
  );

DROP POLICY IF EXISTS classroom_messages_insert_own ON public.classroom_messages;
DROP POLICY IF EXISTS classroom_messages_insert_authorized ON public.classroom_messages;

CREATE POLICY classroom_messages_insert_authorized
  ON public.classroom_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (auth.uid())::text
    AND (
      EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid = (auth.uid())::text
          AND u.is_admin = true
      )
      OR EXISTS (
        SELECT 1
        FROM public.classrooms c
        WHERE c.id = classroom_messages.classroom_id
          AND c.created_by = (auth.uid())::text
      )
      OR EXISTS (
        SELECT 1
        FROM public.classroom_students cs
        JOIN public.classrooms c ON c.id = cs.class_id
        WHERE cs.student_id = (auth.uid())::text
          AND cs.class_id = classroom_messages.classroom_id
          AND c.allow_student_messages = true
      )
    )
  );

-- >>> ORIGIN: supabase/migrations/20260812_weekly_vip_leaderboard.sql

-- Weekly VIP leaderboard for Quiz Space
-- Scores are calculated from the server-side reward ledger for the current UTC week.

CREATE OR REPLACE FUNCTION public.get_weekly_vip_leaderboard(p_week_start DATE DEFAULT date_trunc('week', (now() AT TIME ZONE 'UTC')::date)::date)
RETURNS TABLE (
  leaderboard_rank BIGINT,
  user_id TEXT,
  display_name TEXT,
  photo_url TEXT,
  vip_tier TEXT,
  weekly_points INTEGER,
  is_me BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH weekly_scores AS (
    SELECT
      l.user_id,
      SUM(l.points)::INTEGER AS weekly_points
    FROM public.reward_points_ledger l
    INNER JOIN public.user_reward_balances b ON b.user_id = l.user_id
    WHERE l.created_at >= p_week_start::timestamp
      AND l.created_at < (p_week_start + 7)::timestamp
      AND b.vip_tier <> 'none'
      AND l.points > 0
    GROUP BY l.user_id
  ), ranked AS (
    SELECT
      ROW_NUMBER() OVER (ORDER BY ws.weekly_points DESC, ws.user_id ASC) AS leaderboard_rank,
      ws.user_id,
      ws.weekly_points
    FROM weekly_scores ws
  )
  SELECT
      r.leaderboard_rank,
    r.user_id,
    COALESCE(NULLIF(TRIM(u.name), ''), 'Quiz Space Player') AS display_name,
    u.photo_url,
    b.vip_tier,
    r.weekly_points,
    (r.user_id = auth.uid()::text) AS is_me
  FROM ranked r
  INNER JOIN public.users u ON u.uid = r.user_id
  INNER JOIN public.user_reward_balances b ON b.user_id = r.user_id
  WHERE r.leaderboard_rank <= 50 OR r.user_id = auth.uid()::text
  ORDER BY r.leaderboard_rank
  LIMIT 51;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.get_weekly_vip_leaderboard(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_weekly_vip_leaderboard(DATE) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMENT ON FUNCTION public.get_weekly_vip_leaderboard(DATE) IS 'Returns the top 50 VIP users by server-recorded reward points for a UTC week, plus the authenticated user if outside the top 50.';

CREATE INDEX IF NOT EXISTS reward_points_leaderboard_week_idx
  ON public.reward_points_ledger (created_at, user_id)
  WHERE points > 0;
CREATE INDEX IF NOT EXISTS reward_balances_vip_user_idx
  ON public.user_reward_balances (vip_tier, user_id)
  WHERE vip_tier <> 'none';
CREATE INDEX IF NOT EXISTS users_uid_name_idx
  ON public.users (uid, name);

-- Weekly competition policy: leaderboard scores are based on earned points only.
-- No client-provided score is accepted by the RPC.

-- The SECURITY DEFINER RPC is the only public entry point. Base tables remain protected by their existing RLS policies.

-- >>> ORIGIN: supabase/migrations/20260813_comprehensive_security_performance_hardening.sql

-- Comprehensive security and performance hardening.
-- All privileged database behavior remains enforced server-side.

CREATE INDEX IF NOT EXISTS idx_bookmarks_quiz_id
  ON public.bookmarks (quiz_id);
CREATE INDEX IF NOT EXISTS idx_classroom_lesson_videos_class_id
  ON public.classroom_lesson_videos (class_id);
CREATE INDEX IF NOT EXISTS idx_classroom_messages_sender_id
  ON public.classroom_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_daily_quiz_slots_quiz_id
  ON public.daily_quiz_slots (quiz_id);
CREATE INDEX IF NOT EXISTS idx_daily_quiz_user_slots_quiz_id
  ON public.daily_quiz_user_slots (quiz_id);
CREATE INDEX IF NOT EXISTS idx_featured_quizzes_quiz_id
  ON public.featured_quizzes (quiz_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user_id
  ON public.post_reactions (user_id);
CREATE INDEX IF NOT EXISTS idx_reward_inventory_item_id
  ON public.reward_inventory (item_id);
CREATE INDEX IF NOT EXISTS idx_reward_store_orders_item_id
  ON public.reward_store_orders (item_id);
CREATE INDEX IF NOT EXISTS idx_reward_store_orders_approved_by
  ON public.reward_store_orders (approved_by);
CREATE INDEX IF NOT EXISTS idx_user_reward_badges_badge_id
  ON public.user_reward_badges (badge_id);
CREATE INDEX IF NOT EXISTS idx_quiz_analysis_jobs_draft_user_id
  ON public.quiz_analysis_jobs (draft_user_id);

CREATE OR REPLACE FUNCTION public.claim_daily_gift()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today DATE := (now() AT TIME ZONE 'UTC')::date;
  v_last DATE;
  v_streak INTEGER;
  v_day INTEGER;
  v_points INTEGER;
  v_coins INTEGER;
  v_bonus INTEGER := 0;
  v_inserted INTEGER := 0;
  v_tier TEXT;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.user_reward_balances (user_id, points, level, vip_tier)
  VALUES (v_user_id, 0, 1, 'none')
  ON CONFLICT (user_id) DO NOTHING;

  SELECT last_daily_claim, daily_streak, vip_tier
  INTO v_last, v_streak, v_tier
  FROM public.user_reward_balances
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_last = v_today THEN
    RETURN jsonb_build_object(
      'claimed', false,
      'claim_date', v_today,
      'streak', v_streak,
      'message', 'Already claimed today'
    );
  END IF;

  IF v_last = v_today - 1 THEN
    v_streak := GREATEST(1, v_streak + 1);
  ELSE
    v_streak := 1;
  END IF;

  v_day := ((v_streak - 1) % 7) + 1;
  v_points := CASE v_day
    WHEN 1 THEN 10 WHEN 2 THEN 15 WHEN 3 THEN 20 WHEN 4 THEN 25
    WHEN 5 THEN 35 WHEN 6 THEN 50 ELSE 100
  END;
  v_coins := CASE v_day
    WHEN 1 THEN 20 WHEN 2 THEN 25 WHEN 3 THEN 35 WHEN 4 THEN 45
    WHEN 5 THEN 60 WHEN 6 THEN 80 ELSE 150
  END;

  SELECT daily_coin_bonus
  INTO v_bonus
  FROM public.vip_tiers
  WHERE id = v_tier;
  v_coins := v_coins + COALESCE(v_bonus, 0);

  INSERT INTO public.daily_gift_claims (user_id, claim_date, day_number, points_reward, coins_reward)
  VALUES (v_user_id, v_today, v_day, v_points, v_coins)
  ON CONFLICT (user_id, claim_date) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted = 0 THEN
    RETURN jsonb_build_object('claimed', false, 'claim_date', v_today, 'streak', v_streak);
  END IF;

  INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id, metadata)
  VALUES (
    v_user_id,
    v_points,
    'daily_gift',
    'daily_gift:' || v_today,
    v_today::text,
    jsonb_build_object('day_number', v_day, 'coins', v_coins)
  );

  UPDATE public.user_reward_balances
  SET
    points = points + v_points,
    coins = coins + v_coins,
    daily_streak = v_streak,
    last_daily_claim = v_today,
    level = public.reward_level_for_points(points + v_points),
    vip_tier = public.vip_tier_for_points(points + v_points),
    vip_updated_at = now(),
    updated_at = now()
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'claimed', true,
    'claim_date', v_today,
    'day_number', v_day,
    'streak', v_streak,
    'points', v_points,
    'coins', v_coins
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.enroll_in_season(p_season_id TEXT, p_user_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id TEXT;
  v_season public.seasons%ROWTYPE;
BEGIN
  IF auth.uid()::text IS NULL OR auth.uid()::text <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_season_id IS NULL OR length(trim(p_season_id)) = 0 THEN
    RAISE EXCEPTION 'Invalid season';
  END IF;

  SELECT *
  INTO v_season
  FROM public.seasons
  WHERE id = trim(p_season_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Season not found';
  END IF;
  IF NOT v_season.is_active THEN
    RAISE EXCEPTION 'Season is not active';
  END IF;
  IF v_season.max_participants IS NOT NULL
    AND (SELECT count(*) FROM public.season_members WHERE season_id = v_season.id) >= v_season.max_participants THEN
    RAISE EXCEPTION 'Season is full';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.season_members
    WHERE season_id = v_season.id AND user_id = p_user_id
  ) THEN
    v_member_id := 'sm_' || extract(epoch FROM now())::bigint || '_' || substr(md5(random()::text), 1, 8);
    INSERT INTO public.season_members (id, season_id, user_id, total_score, quizzes_completed)
    VALUES (v_member_id, v_season.id, p_user_id, 0, 0);
    RETURN v_member_id;
  END IF;

  RETURN 'already_enrolled';
END;
$$;

CREATE OR REPLACE FUNCTION public.create_group_challenge(
  p_class_id TEXT,
  p_title TEXT,
  p_description TEXT,
  p_target INTEGER,
  p_end_date TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_end_date DATE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_class_id IS NULL OR length(trim(p_class_id)) = 0 OR length(trim(p_class_id)) > 100 THEN
    RAISE EXCEPTION 'Invalid classroom';
  END IF;
  IF p_title IS NULL OR length(trim(p_title)) = 0 OR length(trim(p_title)) > 160 THEN
    RAISE EXCEPTION 'Invalid challenge title';
  END IF;
  IF p_description IS NOT NULL AND length(p_description) > 2000 THEN
    RAISE EXCEPTION 'Challenge description is too long';
  END IF;
  IF p_target IS NULL OR p_target < 1 OR p_target > 100000 THEN
    RAISE EXCEPTION 'Invalid challenge target';
  END IF;

  v_end_date := p_end_date::date;
  IF v_end_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Challenge end date must not be in the past';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.classrooms c
    WHERE c.id = trim(p_class_id)
      AND c.created_by = v_user_id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.uid = v_user_id AND u.is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only the classroom owner or an administrator can create challenges';
  END IF;

  INSERT INTO public.group_challenges (
    id, class_id, title, description, target_quizzes, start_date, end_date, created_by
  ) VALUES (
    gen_random_uuid(), trim(p_class_id), trim(p_title), NULLIF(trim(COALESCE(p_description, '')), ''),
    p_target, CURRENT_DATE::text, v_end_date::text, v_user_id
  );

  RETURN jsonb_build_object('success', true, 'message', 'Group challenge created');
END;
$$;

CREATE OR REPLACE FUNCTION public.contribute_to_group_challenge(p_challenge_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_challenge public.group_challenges%ROWTYPE;
  v_already BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_challenge_id IS NULL OR length(trim(p_challenge_id)) = 0 THEN
    RAISE EXCEPTION 'Invalid challenge';
  END IF;

  SELECT *
  INTO v_challenge
  FROM public.group_challenges
  WHERE id = trim(p_challenge_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;
  IF v_challenge.completed OR v_challenge.end_date::date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Challenge is no longer active';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.classrooms c
    WHERE c.id = v_challenge.class_id AND c.created_by = v_user_id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.classroom_students cs
    WHERE cs.class_id = v_challenge.class_id AND cs.student_id = v_user_id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.uid = v_user_id AND u.is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only classroom members can contribute';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.group_challenge_progress
    WHERE challenge_id = v_challenge.id
      AND user_id = v_user_id
      AND contributed_at >= now() - interval '1 day'
  ) INTO v_already;

  IF v_already THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already contributed today');
  END IF;

  INSERT INTO public.group_challenge_progress (id, challenge_id, user_id)
  VALUES (gen_random_uuid(), v_challenge.id, v_user_id);

  UPDATE public.group_challenges
  SET
    current_quizzes = current_quizzes + 1,
    completed = current_quizzes + 1 >= target_quizzes,
    updated_at = now()
  WHERE id = v_challenge.id;

  RETURN jsonb_build_object(
    'success', true,
    'current', v_challenge.current_quizzes + 1,
    'target', v_challenge.target_quizzes
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.broadcast_cosmo_messages(p_text TEXT, p_receiver_ids TEXT[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_uid TEXT := auth.uid()::text;
  v_count INTEGER := 0;
  v_receiver TEXT;
  v_receiver_name TEXT;
BEGIN
  IF v_admin_uid IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users WHERE uid = v_admin_uid AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF p_text IS NULL OR length(trim(p_text)) = 0 OR length(p_text) > 2000 THEN
    RAISE EXCEPTION 'Invalid message';
  END IF;
  IF p_receiver_ids IS NULL OR cardinality(p_receiver_ids) = 0 OR cardinality(p_receiver_ids) > 100 THEN
    RAISE EXCEPTION 'Invalid recipients';
  END IF;

  FOREACH v_receiver IN ARRAY p_receiver_ids LOOP
    SELECT name INTO v_receiver_name FROM public.users WHERE uid = v_receiver;
    IF v_receiver_name IS NOT NULL THEN
      INSERT INTO public.direct_messages (
        id, sender_id, sender_name, receiver_id, receiver_name, text, is_read
      ) VALUES (
        'msg-' || replace(gen_random_uuid()::text, '-', ''),
        '00000000-0000-4000-8000-000000000001',
        'المساعد كوزمو',
        v_receiver,
        v_receiver_name,
        trim(p_text),
        false
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Policies are recreated from their live definitions while turning auth.uid()
-- into an initialization-plan expression. This preserves roles, operation modes,
-- permissiveness, and existing ownership logic.
DO $$
DECLARE
  rec RECORD;
  v_roles TEXT;
  v_command TEXT;
  v_mode TEXT;
  v_qual TEXT;
  v_with_check TEXT;
BEGIN
  FOR rec IN
    SELECT
      p.polname,
      p.polrelid,
      p.polcmd,
      p.polpermissive,
      p.polroles,
      c.relname AS table_name,
      pg_get_expr(p.polqual, p.polrelid) AS qual,
      pg_get_expr(p.polwithcheck, p.polrelid) AS with_check
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN (
        'ai_performance_logs', 'daily_gift_claims', 'mystery_box_claims',
        'brain_challenge_attempts', 'referrals', 'weekly_achievements',
        'user_sessions', 'group_challenges', 'cosmo_messages',
        'daily_quiz_user_slots', 'direct_messages', 'community_posts'
      )
      AND (
        COALESCE(pg_get_expr(p.polqual, p.polrelid), '') LIKE '%auth.uid()%' OR
        COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '') LIKE '%auth.uid()%'
      )
  LOOP
    SELECT string_agg(
      CASE WHEN role_oid = 0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(role_oid)) END,
      ', '
    )
    INTO v_roles
    FROM unnest(rec.polroles) AS roles(role_oid);

    v_command := CASE rec.polcmd
      WHEN 'r' THEN 'SELECT'
      WHEN 'a' THEN 'INSERT'
      WHEN 'w' THEN 'UPDATE'
      WHEN 'd' THEN 'DELETE'
      ELSE 'ALL'
    END;
    v_mode := CASE WHEN rec.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END;
    v_qual := replace(COALESCE(rec.qual, ''), 'auth.uid()', '(select auth.uid())');
    v_with_check := replace(COALESCE(rec.with_check, ''), 'auth.uid()', '(select auth.uid())');

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', rec.polname, rec.table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS %s FOR %s TO %s%s%s',
      rec.polname,
      rec.table_name,
      v_mode,
      v_command,
      COALESCE(v_roles, 'PUBLIC'),
      CASE WHEN v_qual = '' THEN '' ELSE ' USING (' || v_qual || ')' END,
      CASE WHEN v_with_check = '' THEN '' ELSE ' WITH CHECK (' || v_with_check || ')' END
    );
  END LOOP;
END;
$$;

-- All public SECURITY DEFINER RPCs require a signed-in user. Existing function-
-- level checks (for example, is_admin validation) continue to govern privileged actions.
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon',
      rec.schema_name,
      rec.function_name,
      rec.identity_args
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated',
      rec.schema_name,
      rec.function_name,
      rec.identity_args
    );
  END LOOP;
END;
$$;

-- Superseded legacy RPCs either trust client-controlled inputs or mutate shared
-- daily slots. They have no active client call-sites and remain unavailable.
REVOKE ALL ON FUNCTION public.add_referral(TEXT) FROM authenticated;
REVOKE ALL ON FUNCTION public.claim_brain_challenge(BOOLEAN) FROM authenticated;
REVOKE ALL ON FUNCTION public.claim_referral_reward(TEXT) FROM authenticated;
REVOKE ALL ON FUNCTION public.claim_weekly_achievement() FROM authenticated;
REVOKE ALL ON FUNCTION public.spin_lucky_wheel() FROM authenticated;
REVOKE ALL ON FUNCTION public.claim_daily_quiz_refresh(TEXT) FROM authenticated;
REVOKE ALL ON FUNCTION public.finalize_daily_quiz_refresh(TEXT, TEXT) FROM authenticated;

-- Remove mutable search paths from all functions reported by the advisor, while
-- keeping app-schema helpers able to reference both app and public objects.
DO $$
DECLARE
  rec RECORD;
  v_path TEXT;
BEGIN
  FOR rec IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('public', 'app')
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::TEXT[])) AS setting
        WHERE setting LIKE 'search_path=%'
      )
  LOOP
    v_path := CASE WHEN rec.schema_name = 'app' THEN 'app, public' ELSE 'public' END;
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = %s',
      rec.schema_name,
      rec.function_name,
      rec.identity_args,
      v_path
    );
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260813_fix_deletes_and_reactions.sql

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

-- >>> ORIGIN: supabase/migrations/20260813_update_store_prices.sql

-- Update store prices and item details for better economy
-- Normal frames: cost points
-- Diamond frames: free but gated by membership
-- Points bundles: cost EGP (money)

UPDATE public.reward_store_items SET price_points = 500, price_coins = 0, price_egp = 0 WHERE id = 'frame_neon_orbit';
UPDATE public.reward_store_items SET price_points = 1000, price_coins = 0, price_egp = 0 WHERE id = 'frame_aurora';
UPDATE public.reward_store_items SET price_points = 2000, price_coins = 0, price_egp = 0 WHERE id = 'frame_fire';
UPDATE public.reward_store_items SET price_points = 3500, price_coins = 0, price_egp = 0 WHERE id = 'frame_crystal_luxe';
UPDATE public.reward_store_items SET price_points = 5000, price_coins = 0, price_egp = 0 WHERE id = 'frame_star_crown';

-- Diamond exclusive frames (Keep price 0 but min_plan gates them)
UPDATE public.reward_store_items SET price_points = 0, price_coins = 0, price_egp = 0, min_plan = 'diamond' WHERE id IN ('frame_diamond_comet', 'frame_diamond_crown');

-- Points bundles (Cost EGP, give reward_points)
UPDATE public.reward_store_items SET price_points = 0, price_coins = 0, price_egp = 25, reward_points = 500 WHERE id = 'points_100';
UPDATE public.reward_store_items SET price_points = 0, price_coins = 0, price_egp = 60, reward_points = 1500 WHERE id = 'points_300';
UPDATE public.reward_store_items SET price_points = 0, price_coins = 0, price_egp = 150, reward_points = 4000 WHERE id = 'points_800';
UPDATE public.reward_store_items SET price_points = 0, price_coins = 0, price_egp = 350, reward_points = 10000 WHERE id = 'points_2000';

-- Ensure all bundles have correct names for new values
UPDATE public.reward_store_items SET name = '500 Points', name_ar = '500 نقطة' WHERE id = 'points_100';
UPDATE public.reward_store_items SET name = '1,500 Points', name_ar = '1500 نقطة' WHERE id = 'points_300';
UPDATE public.reward_store_items SET name = '4,000 Points', name_ar = '4000 نقطة' WHERE id = 'points_800';
UPDATE public.reward_store_items SET name = '10,000 Points', name_ar = '10000 نقطة' WHERE id = 'points_2000';

-- >>> ORIGIN: supabase/migrations/20260814_follower_quiz_notifications.sql

-- Follower notifications for newly published quizzes.
-- Adds optional resource columns so a notification can deep-link to the quiz,
-- and allows inserting targeted notification rows while keeping reads public.

ALTER TABLE IF EXISTS public.notifications ADD COLUMN IF NOT EXISTS resource_type TEXT;
ALTER TABLE IF EXISTS public.notifications ADD COLUMN IF NOT EXISTS resource_id TEXT;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created
  ON public.notifications(user_id, created_at DESC);

DROP POLICY IF EXISTS notifications_insert_authenticated ON public.notifications;
CREATE POLICY notifications_insert_authenticated
  ON public.notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Targeted notifications: rows with a user_id are visible only to that user.
-- Rows without user_id remain part of the global broadcast feed.
DROP POLICY IF EXISTS notifications_read_targeted ON public.notifications;
CREATE POLICY notifications_read_targeted
  ON public.notifications
  FOR SELECT
  USING ((user_id IS NULL) OR (user_id IS NOT NULL AND auth.uid()::text = user_id));

-- >>> ORIGIN: supabase/migrations/20260814_secure_active_frame.sql

CREATE OR REPLACE FUNCTION public.activate_reward_frame(p_item_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_item_id IS NULL OR length(trim(p_item_id)) = 0 OR length(trim(p_item_id)) > 100 THEN
    RAISE EXCEPTION 'Invalid frame selection' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.reward_inventory AS inventory
    JOIN public.reward_store_items AS item ON item.id = inventory.item_id
    WHERE inventory.user_id = v_user_id
      AND inventory.item_id = trim(p_item_id)
      AND inventory.is_active = true
      AND item.is_active = true
      AND item.item_type = 'frame'
  ) THEN
    RAISE EXCEPTION 'You do not own this frame' USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('app.quizspace_allow_frame_update', 'true', true);
  UPDATE public.users
  SET active_frame_id = trim(p_item_id), updated_at = now()
  WHERE uid = v_user_id;

  RETURN jsonb_build_object('success', true, 'active_frame_id', trim(p_item_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_unverified_active_frame_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.active_frame_id IS DISTINCT FROM OLD.active_frame_id
     AND current_setting('app.quizspace_allow_frame_update', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Active frames must be selected from owned inventory.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_verify_active_frame ON public.users;
CREATE TRIGGER users_verify_active_frame
  BEFORE UPDATE OF active_frame_id ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_unverified_active_frame_update();

REVOKE ALL ON FUNCTION public.activate_reward_frame(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_reward_frame(TEXT) TO authenticated;

-- >>> ORIGIN: supabase/migrations/20260814_unified_notification_center.sql

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

-- >>> ORIGIN: supabase/migrations/20260814_user_notification_preferences.sql

CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  user_id TEXT PRIMARY KEY REFERENCES public.users(uid) ON DELETE CASCADE,
  email_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  rank_updates BOOLEAN NOT NULL DEFAULT TRUE,
  weekly_reports BOOLEAN NOT NULL DEFAULT FALSE,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_notification_preferences_select_own ON public.user_notification_preferences;
CREATE POLICY user_notification_preferences_select_own
  ON public.user_notification_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid())::text);

DROP POLICY IF EXISTS user_notification_preferences_insert_own ON public.user_notification_preferences;
CREATE POLICY user_notification_preferences_insert_own
  ON public.user_notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid())::text);

DROP POLICY IF EXISTS user_notification_preferences_update_own ON public.user_notification_preferences;
CREATE POLICY user_notification_preferences_update_own
  ON public.user_notification_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid())::text)
  WITH CHECK (user_id = (select auth.uid())::text);

GRANT SELECT, INSERT, UPDATE ON public.user_notification_preferences TO authenticated;

-- >>> ORIGIN: supabase/migrations/20260814_web_vitals_telemetry.sql

CREATE TABLE IF NOT EXISTS public.web_vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  metric_name TEXT NOT NULL CHECK (metric_name IN ('lcp', 'fcp', 'cls', 'ttfb')),
  metric_value NUMERIC(12, 3) NOT NULL CHECK (metric_value >= 0 AND metric_value <= 600000),
  path TEXT NOT NULL CHECK (char_length(path) BETWEEN 1 AND 200),
  device_class TEXT NOT NULL CHECK (device_class IN ('mobile', 'tablet', 'desktop')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS web_vitals_created_metric_idx ON public.web_vitals(created_at DESC, metric_name);
CREATE INDEX IF NOT EXISTS web_vitals_user_created_idx ON public.web_vitals(user_id, created_at DESC);

ALTER TABLE public.web_vitals ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.record_web_vital(
  p_metric_name TEXT,
  p_metric_value NUMERIC,
  p_path TEXT,
  p_device_class TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  IF p_metric_name NOT IN ('lcp', 'fcp', 'cls', 'ttfb')
    OR p_metric_value IS NULL OR p_metric_value < 0 OR p_metric_value > 600000
    OR p_path IS NULL OR char_length(trim(p_path)) NOT BETWEEN 1 AND 200
    OR p_device_class NOT IN ('mobile', 'tablet', 'desktop') THEN
    RAISE EXCEPTION 'Invalid performance metric';
  END IF;

  INSERT INTO public.web_vitals (user_id, metric_name, metric_value, path, device_class)
  VALUES (v_user_id, p_metric_name, p_metric_value, trim(p_path), p_device_class);
END;
$$;

REVOKE ALL ON FUNCTION public.record_web_vital(TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_web_vital(TEXT, NUMERIC, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260814_weekly_tasks_and_reward_ledger.sql

-- Weekly learning tasks are evaluated lazily when a signed-in user opens or claims them.
-- This avoids a background scheduler while keeping every grant server-authorized and idempotent.

ALTER TABLE public.reward_points_ledger
  ADD COLUMN IF NOT EXISTS coins INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.weekly_task_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('quiz_completion', 'high_score', 'quiz_creation')),
  target INTEGER NOT NULL CHECK (target > 0),
  points_reward INTEGER NOT NULL CHECK (points_reward >= 0),
  coins_reward INTEGER NOT NULL CHECK (coins_reward >= 0),
  icon TEXT NOT NULL DEFAULT 'target',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.user_weekly_task_progress (
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  task_id TEXT NOT NULL REFERENCES public.weekly_task_templates(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0),
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, week_start, task_id)
);

CREATE INDEX IF NOT EXISTS user_weekly_task_progress_user_week_idx
  ON public.user_weekly_task_progress(user_id, week_start DESC);

ALTER TABLE public.weekly_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_weekly_task_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS weekly_task_templates_read ON public.weekly_task_templates;
CREATE POLICY weekly_task_templates_read ON public.weekly_task_templates
  FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS weekly_task_progress_own_read ON public.user_weekly_task_progress;
CREATE POLICY weekly_task_progress_own_read ON public.user_weekly_task_progress
  FOR SELECT TO authenticated USING (user_id = (select auth.uid())::text);

INSERT INTO public.weekly_task_templates
  (id, name, name_ar, description, description_ar, event_type, target, points_reward, coins_reward, icon, sort_order, is_active)
VALUES
  ('weekly_complete_three', 'Three quizzes', 'أكمل ثلاثة اختبارات', 'Complete three quizzes this week.', 'أكمل ثلاثة اختبارات خلال هذا الأسبوع.', 'quiz_completion', 3, 75, 10, 'book-open', 1, true),
  ('weekly_high_score', 'High score', 'نتيجة متفوقة', 'Achieve a score of 80% or higher once this week.', 'احصل على نتيجة 80% أو أكثر مرة واحدة هذا الأسبوع.', 'high_score', 1, 50, 5, 'trophy', 2, true),
  ('weekly_create_quiz', 'Knowledge creator', 'أنشئ اختباراً', 'Create one quiz for learners this week.', 'أنشئ اختباراً واحداً للمتعلمين هذا الأسبوع.', 'quiz_creation', 1, 40, 5, 'pencil', 3, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  event_type = EXCLUDED.event_type,
  target = EXCLUDED.target,
  points_reward = EXCLUDED.points_reward,
  coins_reward = EXCLUDED.coins_reward,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

CREATE OR REPLACE FUNCTION public.refresh_current_weekly_tasks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_week_start DATE := date_trunc('week', timezone('UTC', now()))::date;
  v_completed_quizzes INTEGER := 0;
  v_high_scores INTEGER := 0;
  v_created_quizzes INTEGER := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  INSERT INTO public.user_weekly_task_progress (user_id, week_start, task_id)
  SELECT v_user_id, v_week_start, template.id
  FROM public.weekly_task_templates AS template
  WHERE template.is_active = true
  ON CONFLICT (user_id, week_start, task_id) DO NOTHING;

  SELECT COUNT(*)::integer INTO v_completed_quizzes
  FROM public.completions
  WHERE taker_id::text = v_user_id AND created_at >= v_week_start;

  SELECT COUNT(*)::integer INTO v_high_scores
  FROM public.completions
  WHERE taker_id::text = v_user_id
    AND created_at >= v_week_start
    AND total_questions > 0
    AND score::numeric / total_questions::numeric >= 0.80;

  SELECT COUNT(*)::integer INTO v_created_quizzes
  FROM public.quizzes
  WHERE creator_id::text = v_user_id AND created_at >= v_week_start;

  UPDATE public.user_weekly_task_progress AS progress
  SET
    progress = LEAST(template.target, CASE template.event_type
      WHEN 'quiz_completion' THEN v_completed_quizzes
      WHEN 'high_score' THEN v_high_scores
      WHEN 'quiz_creation' THEN v_created_quizzes
      ELSE 0
    END),
    completed_at = CASE
      WHEN LEAST(template.target, CASE template.event_type
        WHEN 'quiz_completion' THEN v_completed_quizzes
        WHEN 'high_score' THEN v_high_scores
        WHEN 'quiz_creation' THEN v_created_quizzes
        ELSE 0
      END) >= template.target AND progress.completed_at IS NULL THEN now()
      ELSE progress.completed_at
    END,
    updated_at = now()
  FROM public.weekly_task_templates AS template
  WHERE progress.user_id = v_user_id
    AND progress.week_start = v_week_start
    AND progress.task_id = template.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_weekly_tasks()
RETURNS TABLE (
  id TEXT,
  name TEXT,
  name_ar TEXT,
  description TEXT,
  description_ar TEXT,
  event_type TEXT,
  target INTEGER,
  points_reward INTEGER,
  coins_reward INTEGER,
  icon TEXT,
  sort_order INTEGER,
  progress INTEGER,
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_week_start DATE := date_trunc('week', timezone('UTC', now()))::date;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  PERFORM public.refresh_current_weekly_tasks();

  RETURN QUERY
  SELECT template.id, template.name, template.name_ar, template.description, template.description_ar,
    template.event_type, template.target, template.points_reward, template.coins_reward,
    template.icon, template.sort_order, progress.progress, progress.completed_at, progress.claimed_at
  FROM public.weekly_task_templates AS template
  JOIN public.user_weekly_task_progress AS progress
    ON progress.task_id = template.id
    AND progress.user_id = v_user_id
    AND progress.week_start = v_week_start
  WHERE template.is_active = true
  ORDER BY template.sort_order, template.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_weekly_task(p_task_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_week_start DATE := date_trunc('week', timezone('UTC', now()))::date;
  v_task RECORD;
  v_rows INTEGER := 0;
  v_event_key TEXT;
  v_total_points INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  IF p_task_id IS NULL OR char_length(trim(p_task_id)) = 0 OR char_length(p_task_id) > 100 THEN
    RAISE EXCEPTION 'Invalid task';
  END IF;

  PERFORM public.refresh_current_weekly_tasks();

  SELECT template.*, progress.progress, progress.claimed_at
  INTO v_task
  FROM public.user_weekly_task_progress AS progress
  JOIN public.weekly_task_templates AS template ON template.id = progress.task_id
  WHERE progress.user_id = v_user_id
    AND progress.week_start = v_week_start
    AND progress.task_id = p_task_id
    AND template.is_active = true
  FOR UPDATE OF progress;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;
  IF v_task.claimed_at IS NOT NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'already_claimed');
  END IF;
  IF v_task.progress < v_task.target THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'not_complete', 'progress', v_task.progress, 'target', v_task.target);
  END IF;

  v_event_key := format('weekly_task:%s:%s', v_week_start, v_task.id);
  INSERT INTO public.reward_points_ledger (user_id, points, coins, event_type, event_key, reference_id, metadata)
  VALUES (v_user_id, v_task.points_reward, v_task.coins_reward, 'weekly_task', v_event_key, v_task.id,
    jsonb_build_object('task_id', v_task.id, 'task_name', v_task.name, 'task_name_ar', v_task.name_ar, 'week_start', v_week_start))
  ON CONFLICT (user_id, event_key) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    UPDATE public.user_weekly_task_progress
      SET claimed_at = coalesce(claimed_at, now()), updated_at = now()
      WHERE user_id = v_user_id AND week_start = v_week_start AND task_id = v_task.id;
    RETURN jsonb_build_object('claimed', false, 'reason', 'already_claimed');
  END IF;

  INSERT INTO public.user_reward_balances (user_id, points, coins, level)
  VALUES (v_user_id, v_task.points_reward, v_task.coins_reward, public.reward_level_for_points(v_task.points_reward))
  ON CONFLICT (user_id) DO UPDATE SET
    points = public.user_reward_balances.points + EXCLUDED.points,
    coins = public.user_reward_balances.coins + EXCLUDED.coins,
    level = public.reward_level_for_points(public.user_reward_balances.points + EXCLUDED.points),
    updated_at = now();

  UPDATE public.user_weekly_task_progress
    SET claimed_at = now(), updated_at = now()
    WHERE user_id = v_user_id AND week_start = v_week_start AND task_id = v_task.id;

  INSERT INTO public.notifications (id, user_id, type, title, body, sender_name, is_read, created_at)
  VALUES (
    'notif-weekly-' || gen_random_uuid()::text,
    v_user_id,
    'weekly_task',
    'مكافأة مهمة أسبوعية',
    format('حصلت على %s نقطة و%s عملة مقابل إكمال «%s».', v_task.points_reward, v_task.coins_reward, v_task.name_ar),
    'QuizSpace',
    false,
    now()
  );

  SELECT points INTO v_total_points
  FROM public.user_reward_balances
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'claimed', true,
    'points', v_task.points_reward,
    'coins', v_task.coins_reward,
    'total_points', coalesce(v_total_points, 0),
    'task_id', v_task.id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_current_weekly_tasks() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_current_weekly_tasks() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_weekly_task(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_weekly_tasks() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_weekly_task(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260815_fix_duplicates.sql

-- Fix duplicate solvers display + add site stats + featured quizzes support.
-- 20260815

-- 1. Unique takers RPC: returns one row per solver with best score + attempt count
CREATE OR REPLACE FUNCTION public.get_quiz_takers_unique(p_quiz_id TEXT)
RETURNS TABLE (
  taker_id TEXT,
  taker_name TEXT,
  best_score INTEGER,
  total_questions INTEGER,
  attempts_count INTEGER,
  last_attempt_at TIMESTAMPTZ,
  rating INTEGER
) AS $$
  SELECT c.taker_id, c.taker_name,
         MAX(c.score) AS best_score,
         MAX(c.total_questions) AS total_questions,
         COUNT(*)::INTEGER AS attempts_count,
         MAX(c.created_at) AS last_attempt_at,
         (ARRAY_AGG(c.rating ORDER BY c.created_at DESC) FILTER (WHERE c.rating IS NOT NULL))[1] AS rating
  FROM public.completions c
  WHERE c.quiz_id = p_quiz_id
  GROUP BY c.taker_id, c.taker_name;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_quiz_takers_unique(TEXT) TO authenticated;

-- 2. Site-wide live stats for the landing page
CREATE OR REPLACE FUNCTION public.get_site_stats()
RETURNS JSONB AS $$
  SELECT jsonb_build_object(
    'total_quizzes', (SELECT COUNT(*) FROM public.quizzes),
    'total_completions', (SELECT COUNT(*) FROM public.completions),
    'total_users', (SELECT COUNT(*) FROM public.users),
    'quizzes_today', (SELECT COUNT(*) FROM public.quizzes WHERE created_at::date = CURRENT_DATE),
    'completions_today', (SELECT COUNT(*) FROM public.completions WHERE created_at::date = CURRENT_DATE),
    'top_quiz_today', COALESCE(
      (SELECT jsonb_build_object('id', id, 'title', title, 'plays', total_plays)
       FROM public.quizzes ORDER BY total_plays DESC LIMIT 1),
      'null'::jsonb
    )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_site_stats() TO authenticated;

-- 3. Featured quizzes table (for daily featured quiz on landing page)
CREATE TABLE IF NOT EXISTS public.featured_quizzes (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES public.quizzes(id),
  featured_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (featured_date, quiz_id)
);

ALTER TABLE public.featured_quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS featured_quizzes_read ON public.featured_quizzes;
CREATE POLICY featured_quizzes_read ON public.featured_quizzes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS featured_quizzes_insert ON public.featured_quizzes;
CREATE POLICY featured_quizzes_insert ON public.featured_quizzes FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS featured_quizzes_delete ON public.featured_quizzes;
CREATE POLICY featured_quizzes_delete ON public.featured_quizzes FOR DELETE TO authenticated USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_featured_quizzes_date ON public.featured_quizzes(featured_date DESC);

NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260816_institutional_diamond_workspace.sql

-- Diamond institutional workspace: secure organization, seat, and manager model.
-- All membership changes are intentionally mediated by SECURITY DEFINER RPCs.

CREATE TABLE IF NOT EXISTS institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 120),
    owner_id TEXT NOT NULL REFERENCES users(uid) ON DELETE RESTRICT,
    plan_id TEXT NOT NULL DEFAULT 'diamond' CHECK (plan_id = 'diamond'),
    seat_limit INTEGER NOT NULL DEFAULT 15 CHECK (seat_limit BETWEEN 1 AND 100),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
    branding JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_institutions_owner_id ON institutions(owner_id);
CREATE INDEX IF NOT EXISTS idx_institutions_status ON institutions(status);

CREATE TABLE IF NOT EXISTS institution_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'teacher')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    added_by TEXT NOT NULL REFERENCES users(uid) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (institution_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_institution_members_user_id ON institution_members(user_id);
CREATE INDEX IF NOT EXISTS idx_institution_members_institution_status ON institution_members(institution_id, status);

CREATE TABLE IF NOT EXISTS institution_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    actor_id TEXT NOT NULL REFERENCES users(uid) ON DELETE RESTRICT,
    action TEXT NOT NULL CHECK (action IN ('institution_created', 'seat_assigned', 'seat_revoked', 'member_role_changed', 'branding_updated')),
    target_user_id TEXT REFERENCES users(uid) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_institution_audit_log_institution_created ON institution_audit_log(institution_id, created_at DESC);

CREATE OR REPLACE FUNCTION set_institution_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS institutions_updated_at ON institutions;
CREATE TRIGGER institutions_updated_at
BEFORE UPDATE ON institutions
FOR EACH ROW EXECUTE FUNCTION set_institution_updated_at();

DROP TRIGGER IF EXISTS institution_members_updated_at ON institution_members;
CREATE TRIGGER institution_members_updated_at
BEFORE UPDATE ON institution_members
FOR EACH ROW EXECUTE FUNCTION set_institution_updated_at();

CREATE OR REPLACE FUNCTION is_institution_manager(p_institution_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM institutions i
        WHERE i.id = p_institution_id
          AND i.status = 'active'
          AND (
              i.owner_id = auth.uid()::text
              OR EXISTS (
                  SELECT 1 FROM institution_members m
                  WHERE m.institution_id = i.id
                    AND m.user_id = auth.uid()::text
                    AND m.status = 'active'
                    AND m.role IN ('owner', 'manager')
              )
              OR EXISTS (
                  SELECT 1 FROM users u
                  WHERE u.uid = auth.uid()::text AND u.is_admin = true
              )
          )
    );
$$;

CREATE OR REPLACE FUNCTION is_institution_member(p_institution_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM institution_members m
        WHERE m.institution_id = p_institution_id
          AND m.user_id = auth.uid()::text
          AND m.status = 'active'
    );
$$;

ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE institution_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE institution_audit_log ENABLE ROW LEVEL SECURITY;

SELECT _safe_drop_policy('institutions_read_members', 'institutions');
SELECT _safe_drop_policy('institution_members_read_scoped', 'institution_members');
SELECT _safe_drop_policy('institution_audit_log_read_managers', 'institution_audit_log');

CREATE POLICY institutions_read_members ON institutions
FOR SELECT USING (
    owner_id = auth.uid()::text
    OR is_institution_member(id)
    OR EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND is_admin = true)
);

CREATE POLICY institution_members_read_scoped ON institution_members
FOR SELECT USING (
    user_id = auth.uid()::text
    OR is_institution_manager(institution_id)
);

CREATE POLICY institution_audit_log_read_managers ON institution_audit_log
FOR SELECT USING (is_institution_manager(institution_id));

CREATE OR REPLACE FUNCTION activate_diamond_institution(
    p_owner_user_id TEXT,
    p_institution_name TEXT,
    p_seat_limit INTEGER DEFAULT 15
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_institution_id UUID;
    v_actor_id TEXT := auth.uid()::text;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE uid = v_actor_id AND is_admin = true) THEN
        RAISE EXCEPTION 'غير مصرح بتفعيل باقة المؤسسات';
    END IF;

    IF p_owner_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM users WHERE uid = p_owner_user_id) THEN
        RAISE EXCEPTION 'حساب مالك المؤسسة غير موجود';
    END IF;

    IF char_length(trim(COALESCE(p_institution_name, ''))) NOT BETWEEN 2 AND 120 THEN
        RAISE EXCEPTION 'اسم المؤسسة يجب أن يكون بين حرفين و120 حرفاً';
    END IF;

    IF p_seat_limit NOT BETWEEN 1 AND 100 THEN
        RAISE EXCEPTION 'عدد المقاعد يجب أن يكون بين 1 و100';
    END IF;

    INSERT INTO institutions (name, owner_id, seat_limit, status)
    VALUES (trim(p_institution_name), p_owner_user_id, p_seat_limit, 'active')
    RETURNING id INTO v_institution_id;

    INSERT INTO institution_members (institution_id, user_id, role, status, added_by)
    VALUES (v_institution_id, p_owner_user_id, 'owner', 'active', v_actor_id);

    UPDATE users
    SET is_premium = true,
        plan_id = 'diamond',
        plan_name = 'الباقة الماسية للمؤسسات (Diamond)',
        badge_tier = 'enterprise',
        renewal_date = now() + INTERVAL '30 days'
    WHERE uid = p_owner_user_id;

    INSERT INTO institution_audit_log (institution_id, actor_id, action, target_user_id, metadata)
    VALUES (v_institution_id, v_actor_id, 'institution_created', p_owner_user_id, jsonb_build_object('seat_limit', p_seat_limit));

    RETURN v_institution_id;
END;
$$;

CREATE OR REPLACE FUNCTION assign_institution_member(
    p_institution_id UUID,
    p_member_email TEXT,
    p_role TEXT DEFAULT 'teacher'
)
RETURNS TABLE(user_id TEXT, member_role TEXT, seat_limit INTEGER, active_seats INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_user_id TEXT;
    v_seat_limit INTEGER;
    v_active_seats INTEGER;
BEGIN
    IF NOT is_institution_manager(p_institution_id) THEN
        RAISE EXCEPTION 'غير مصرح بإدارة مقاعد المؤسسة';
    END IF;

    IF p_role NOT IN ('manager', 'teacher') THEN
        RAISE EXCEPTION 'الدور المطلوب غير صالح';
    END IF;

    SELECT u.uid INTO v_target_user_id
    FROM users u
    WHERE lower(u.email) = lower(trim(COALESCE(p_member_email, '')))
    LIMIT 1;

    IF v_target_user_id IS NULL THEN
        RAISE EXCEPTION 'هذا البريد غير مسجل في QuizSpace بعد';
    END IF;

    SELECT i.seat_limit INTO v_seat_limit
    FROM institutions i
    WHERE i.id = p_institution_id AND i.status = 'active';

    IF v_seat_limit IS NULL THEN
        RAISE EXCEPTION 'المؤسسة غير نشطة';
    END IF;

    IF EXISTS (
        SELECT 1 FROM institution_members m
        WHERE m.institution_id = p_institution_id
          AND m.user_id = v_target_user_id
          AND m.status = 'active'
    ) THEN
        SELECT count(*)::INTEGER INTO v_active_seats
        FROM institution_members m
        WHERE m.institution_id = p_institution_id AND m.status = 'active';
        RETURN QUERY SELECT v_target_user_id, p_role, v_seat_limit, v_active_seats;
        RETURN;
    END IF;

    SELECT count(*)::INTEGER INTO v_active_seats
    FROM institution_members m
    WHERE m.institution_id = p_institution_id AND m.status = 'active';

    IF v_active_seats >= v_seat_limit THEN
        RAISE EXCEPTION 'اكتمل عدد المقاعد المتاحة في المؤسسة';
    END IF;

    INSERT INTO institution_members (institution_id, user_id, role, status, added_by)
    VALUES (p_institution_id, v_target_user_id, p_role, 'active', auth.uid()::text)
    ON CONFLICT (institution_id, user_id)
    DO UPDATE SET role = EXCLUDED.role, status = 'active', added_by = EXCLUDED.added_by;

    v_active_seats := v_active_seats + 1;

    INSERT INTO institution_audit_log (institution_id, actor_id, action, target_user_id, metadata)
    VALUES (p_institution_id, auth.uid()::text, 'seat_assigned', v_target_user_id, jsonb_build_object('role', p_role));

    RETURN QUERY SELECT v_target_user_id, p_role, v_seat_limit, v_active_seats;
END;
$$;

CREATE OR REPLACE FUNCTION revoke_institution_member(
    p_institution_id UUID,
    p_member_user_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
BEGIN
    IF NOT is_institution_manager(p_institution_id) THEN
        RAISE EXCEPTION 'غير مصرح بإدارة مقاعد المؤسسة';
    END IF;

    SELECT role INTO v_role
    FROM institution_members
    WHERE institution_id = p_institution_id AND user_id = p_member_user_id AND status = 'active';

    IF v_role IS NULL THEN
        RAISE EXCEPTION 'هذا العضو لا يشغل مقعداً نشطاً';
    END IF;

    IF v_role = 'owner' THEN
        RAISE EXCEPTION 'لا يمكن إزالة مالك المؤسسة';
    END IF;

    UPDATE institution_members
    SET status = 'revoked'
    WHERE institution_id = p_institution_id AND user_id = p_member_user_id;

    INSERT INTO institution_audit_log (institution_id, actor_id, action, target_user_id)
    VALUES (p_institution_id, auth.uid()::text, 'seat_revoked', p_member_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION update_institution_branding(
    p_institution_id UUID,
    p_name TEXT,
    p_branding JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT is_institution_manager(p_institution_id) THEN
        RAISE EXCEPTION 'غير مصرح بتعديل بيانات المؤسسة';
    END IF;

    IF char_length(trim(COALESCE(p_name, ''))) NOT BETWEEN 2 AND 120 THEN
        RAISE EXCEPTION 'اسم المؤسسة يجب أن يكون بين حرفين و120 حرفاً';
    END IF;

    UPDATE institutions
    SET name = trim(p_name), branding = COALESCE(p_branding, '{}'::jsonb)
    WHERE id = p_institution_id;

    INSERT INTO institution_audit_log (institution_id, actor_id, action, metadata)
    VALUES (p_institution_id, auth.uid()::text, 'branding_updated', jsonb_build_object('name', trim(p_name)));
END;
$$;

REVOKE ALL ON FUNCTION activate_diamond_institution(TEXT, TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION assign_institution_member(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION revoke_institution_member(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION update_institution_branding(UUID, TEXT, JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION activate_diamond_institution(TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_institution_member(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_institution_member(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_institution_branding(UUID, TEXT, JSONB) TO authenticated;

-- >>> ORIGIN: supabase/migrations/20260816_lesson_videos.sql

-- Add classroom lesson videos table (YouTube/Live links only - no video storage in DB)
-- Teachers add video URLs, students watch them within the classroom

CREATE TABLE IF NOT EXISTS classroom_lesson_videos (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL,
  creator_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  video_type TEXT DEFAULT 'youtube', -- 'youtube' or 'live'
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  view_count INTEGER DEFAULT 0,
  is_live BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE classroom_lesson_videos ENABLE ROW LEVEL SECURITY;

-- Students and teacher can read videos in their classroom
CREATE POLICY classroom_lesson_videos_read ON classroom_lesson_videos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classrooms c
      WHERE c.id = classroom_lesson_videos.class_id
      AND c.created_by = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM classroom_students cs
      WHERE cs.class_id = classroom_lesson_videos.class_id
      AND cs.student_id = auth.uid()::text
    )
  );

-- Teacher (creator) can insert videos
CREATE POLICY classroom_lesson_videos_insert ON classroom_lesson_videos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM classrooms c
      WHERE c.id = classroom_lesson_videos.class_id
      AND c.created_by = auth.uid()::text
    )
  );

-- Teacher can update own videos
CREATE POLICY classroom_lesson_videos_update ON classroom_lesson_videos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM classrooms c
      WHERE c.id = classroom_lesson_videos.class_id
      AND c.created_by = auth.uid()::text
    )
  );

-- Teacher can delete own videos
CREATE POLICY classroom_lesson_videos_delete ON classroom_lesson_videos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM classrooms c
      WHERE c.id = classroom_lesson_videos.class_id
      AND c.created_by = auth.uid()::text
    )
  );

-- Increment view count RPC
CREATE OR REPLACE FUNCTION increment_lesson_video_views(p_video_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE classroom_lesson_videos
  SET view_count = view_count + 1,
      updated_at = NOW()
  WHERE id = p_video_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- >>> ORIGIN: supabase/migrations/20260817_ai_monitoring_telemetry_insert_grant.sql

-- RLS policy already scopes inserts to the current authenticated user.
-- Granting INSERT is still required before that policy can be evaluated.
GRANT INSERT ON TABLE public.ai_performance_logs TO authenticated;
NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260817_diamond_workspace_entitlement_recovery.sql

-- Provision a missing workspace for the currently authenticated, active Diamond owner.
-- The plan check remains server-side so no client state can grant institutional access.
CREATE OR REPLACE FUNCTION public.provision_my_diamond_institution()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_institution_id UUID;
  v_display_name TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'سجّل الدخول أولاً للوصول إلى مساحة المؤسسة';
  END IF;

  SELECT COALESCE(NULLIF(trim(name), ''), 'QuizSpace')
  INTO v_display_name
  FROM public.users
  WHERE uid = v_user_id
    AND is_premium = true
    AND lower(COALESCE(plan_id, '')) = 'diamond'
    AND (renewal_date IS NULL OR renewal_date >= now());

  IF v_display_name IS NULL THEN
    RAISE EXCEPTION 'مساحة المؤسسات متاحة للباقة الماسية النشطة فقط';
  END IF;

  SELECT id
  INTO v_institution_id
  FROM public.institutions
  WHERE owner_id = v_user_id
    AND status = 'active'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_institution_id IS NULL THEN
    INSERT INTO public.institutions (name, owner_id, seat_limit, status)
    VALUES ('مؤسسة ' || v_display_name, v_user_id, 15, 'active')
    RETURNING id INTO v_institution_id;

    INSERT INTO public.institution_audit_log (institution_id, actor_id, action, target_user_id, metadata)
    VALUES (v_institution_id, v_user_id, 'institution_auto_provisioned', v_user_id, jsonb_build_object('seat_limit', 15));
  END IF;

  INSERT INTO public.institution_members (institution_id, user_id, role, status, added_by)
  VALUES (v_institution_id, v_user_id, 'owner', 'active', v_user_id)
  ON CONFLICT (institution_id, user_id)
  DO UPDATE SET role = 'owner', status = 'active', added_by = EXCLUDED.added_by;

  RETURN v_institution_id;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_my_diamond_institution() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provision_my_diamond_institution() TO authenticated;
NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260817_institution_activation_idempotency.sql

CREATE OR REPLACE FUNCTION activate_diamond_institution(
    p_owner_user_id TEXT,
    p_institution_name TEXT,
    p_seat_limit INTEGER DEFAULT 15
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_institution_id UUID;
    v_actor_id TEXT := auth.uid()::text;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE uid = v_actor_id AND is_admin = true) THEN
        RAISE EXCEPTION 'غير مصرح بتفعيل باقة المؤسسات';
    END IF;

    IF p_owner_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM users WHERE uid = p_owner_user_id) THEN
        RAISE EXCEPTION 'حساب مالك المؤسسة غير موجود';
    END IF;

    IF char_length(trim(COALESCE(p_institution_name, ''))) NOT BETWEEN 2 AND 120 THEN
        RAISE EXCEPTION 'اسم المؤسسة يجب أن يكون بين حرفين و120 حرفاً';
    END IF;

    IF p_seat_limit NOT BETWEEN 1 AND 100 THEN
        RAISE EXCEPTION 'عدد المقاعد يجب أن يكون بين 1 و100';
    END IF;

    SELECT id INTO v_institution_id
    FROM institutions
    WHERE owner_id = p_owner_user_id AND status = 'active'
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_institution_id IS NULL THEN
        INSERT INTO institutions (name, owner_id, seat_limit, status)
        VALUES (trim(p_institution_name), p_owner_user_id, p_seat_limit, 'active')
        RETURNING id INTO v_institution_id;

        INSERT INTO institution_members (institution_id, user_id, role, status, added_by)
        VALUES (v_institution_id, p_owner_user_id, 'owner', 'active', v_actor_id);

        INSERT INTO institution_audit_log (institution_id, actor_id, action, target_user_id, metadata)
        VALUES (v_institution_id, v_actor_id, 'institution_created', p_owner_user_id, jsonb_build_object('seat_limit', p_seat_limit));
    ELSE
        UPDATE institutions
        SET name = trim(p_institution_name), seat_limit = p_seat_limit, status = 'active'
        WHERE id = v_institution_id;
    END IF;

    UPDATE users
    SET is_premium = true,
        plan_id = 'diamond',
        plan_name = 'الباقة الماسية للمؤسسات (Diamond)',
        badge_tier = 'enterprise',
        renewal_date = now() + INTERVAL '30 days'
    WHERE uid = p_owner_user_id;

    RETURN v_institution_id;
END;
$$;

CREATE OR REPLACE FUNCTION assign_institution_member(
    p_institution_id UUID,
    p_member_email TEXT,
    p_role TEXT DEFAULT 'teacher'
)
RETURNS TABLE(user_id TEXT, member_role TEXT, seat_limit INTEGER, active_seats INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_user_id TEXT;
    v_seat_limit INTEGER;
    v_active_seats INTEGER;
    v_existing_role TEXT;
BEGIN
    IF NOT is_institution_manager(p_institution_id) THEN
        RAISE EXCEPTION 'غير مصرح بإدارة مقاعد المؤسسة';
    END IF;

    IF p_role NOT IN ('manager', 'teacher') THEN
        RAISE EXCEPTION 'الدور المطلوب غير صالح';
    END IF;

    SELECT u.uid INTO v_target_user_id
    FROM users u
    WHERE lower(u.email) = lower(trim(COALESCE(p_member_email, '')))
    LIMIT 1;

    IF v_target_user_id IS NULL THEN
        RAISE EXCEPTION 'هذا البريد غير مسجل في QuizSpace بعد';
    END IF;

    SELECT i.seat_limit INTO v_seat_limit
    FROM institutions i
    WHERE i.id = p_institution_id AND i.status = 'active';

    IF v_seat_limit IS NULL THEN
        RAISE EXCEPTION 'المؤسسة غير نشطة';
    END IF;

    SELECT role INTO v_existing_role
    FROM institution_members
    WHERE institution_id = p_institution_id
      AND user_id = v_target_user_id
      AND status = 'active';

    SELECT count(*)::INTEGER INTO v_active_seats
    FROM institution_members m
    WHERE m.institution_id = p_institution_id AND m.status = 'active';

    IF v_existing_role IS NOT NULL THEN
        IF v_existing_role = 'owner' THEN
            RETURN QUERY SELECT v_target_user_id, v_existing_role, v_seat_limit, v_active_seats;
            RETURN;
        END IF;

        UPDATE institution_members
        SET role = p_role, added_by = auth.uid()::text
        WHERE institution_id = p_institution_id AND user_id = v_target_user_id;

        INSERT INTO institution_audit_log (institution_id, actor_id, action, target_user_id, metadata)
        VALUES (p_institution_id, auth.uid()::text, 'member_role_changed', v_target_user_id, jsonb_build_object('role', p_role));

        RETURN QUERY SELECT v_target_user_id, p_role, v_seat_limit, v_active_seats;
        RETURN;
    END IF;

    IF v_active_seats >= v_seat_limit THEN
        RAISE EXCEPTION 'اكتمل عدد المقاعد المتاحة في المؤسسة';
    END IF;

    INSERT INTO institution_members (institution_id, user_id, role, status, added_by)
    VALUES (p_institution_id, v_target_user_id, p_role, 'active', auth.uid()::text)
    ON CONFLICT (institution_id, user_id)
    DO UPDATE SET role = EXCLUDED.role, status = 'active', added_by = EXCLUDED.added_by;

    INSERT INTO institution_audit_log (institution_id, actor_id, action, target_user_id, metadata)
    VALUES (p_institution_id, auth.uid()::text, 'seat_assigned', v_target_user_id, jsonb_build_object('role', p_role));

    RETURN QUERY SELECT v_target_user_id, p_role, v_seat_limit, v_active_seats + 1;
END;
$$;

-- >>> ORIGIN: supabase/migrations/20260817_motivation_features.sql

-- =====================================================
-- Motivation Features — Free Limited Engagement System
-- Created: Aug 15, 2026
-- Features: Lucky Spin, Streak, Leaderboard, Mystery Box,
--           Brain Challenge, Referral, AI Quiz, Weekly Achievement,
--           Happy Hour, Group Challenge
-- =====================================================

-- 1. User Streaks Table
CREATE TABLE IF NOT EXISTS user_streaks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_login_date TEXT NOT NULL,
  streak_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Lucky Spin Claims
CREATE TABLE IF NOT EXISTS lucky_spin_claims (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  claimed_date TEXT NOT NULL,
  points_won INTEGER NOT NULL,
  reward_type TEXT DEFAULT 'points',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Mystery Box Claims
CREATE TABLE IF NOT EXISTS mystery_box_claims (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  claimed_date TEXT NOT NULL,
  reward_type TEXT NOT NULL DEFAULT 'points',
  reward_value INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Brain Challenge Attempts
CREATE TABLE IF NOT EXISTS brain_challenge_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  challenge_date TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer_submitted TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  points_earned INTEGER DEFAULT 0,
  attempt_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Referrals
CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  referrer_id TEXT NOT NULL,
  referred_user_id TEXT NOT NULL UNIQUE,
  referral_date TEXT NOT NULL,
  points_awarded INTEGER DEFAULT 50,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Weekly Achievements
CREATE TABLE IF NOT EXISTS weekly_achievements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  week_start TEXT NOT NULL,
  achievement_type TEXT NOT NULL,
  target_count INTEGER DEFAULT 5,
  current_count INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  badge_earned TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Happy Hour Config
CREATE TABLE IF NOT EXISTS happy_hour_config (
  id TEXT PRIMARY KEY,
  start_hour INTEGER DEFAULT 18,
  end_hour INTEGER DEFAULT 20,
  multiplier FLOAT DEFAULT 2.0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Group Challenges
CREATE TABLE IF NOT EXISTS group_challenges (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_quizzes INTEGER DEFAULT 50,
  current_quizzes INTEGER DEFAULT 0,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  reward_points INTEGER DEFAULT 100,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Group Challenge Progress
CREATE TABLE IF NOT EXISTS group_challenge_progress (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  quiz_completed_id TEXT,
  contributed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all new tables
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lucky_spin_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE mystery_box_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_challenge_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE happy_hour_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_challenge_progress ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies
-- =====================================================

-- User Streaks
CREATE POLICY "Users can read own streak" ON user_streaks FOR SELECT
  USING (user_id = auth.uid()::TEXT);
CREATE POLICY "Users can update own streak" ON user_streaks FOR UPDATE
  USING (user_id = auth.uid()::TEXT);
CREATE POLICY "Users can insert own streak" ON user_streaks FOR INSERT
  WITH CHECK (user_id = auth.uid()::TEXT);

-- Lucky Spin
CREATE POLICY "Users can read own spins" ON lucky_spin_claims FOR SELECT
  USING (user_id = auth.uid()::TEXT);
CREATE POLICY "Users can insert own spin" ON lucky_spin_claims FOR INSERT
  WITH CHECK (user_id = auth.uid()::TEXT);

-- Mystery Box
CREATE POLICY "Users can read own boxes" ON mystery_box_claims FOR SELECT
  USING (user_id = auth.uid()::TEXT);
CREATE POLICY "Users can insert own box" ON mystery_box_claims FOR INSERT
  WITH CHECK (user_id = auth.uid()::TEXT);

-- Brain Challenge
CREATE POLICY "Users can read own attempts" ON brain_challenge_attempts FOR SELECT
  USING (user_id = auth.uid()::TEXT);
CREATE POLICY "Users can insert own attempts" ON brain_challenge_attempts FOR INSERT
  WITH CHECK (user_id = auth.uid()::TEXT);

-- Referrals
CREATE POLICY "Users can read own referrals" ON referrals FOR SELECT
  USING (referrer_id = auth.uid()::TEXT);
CREATE POLICY "Users can insert own referral" ON referrals FOR INSERT
  WITH CHECK (referrer_id = auth.uid()::TEXT);

-- Weekly Achievements
CREATE POLICY "Users can read own achievements" ON weekly_achievements FOR SELECT
  USING (user_id = auth.uid()::TEXT);
CREATE POLICY "Users can update own achievements" ON weekly_achievements FOR UPDATE
  USING (user_id = auth.uid()::TEXT);
CREATE POLICY "Users can insert own achievements" ON weekly_achievements FOR INSERT
  WITH CHECK (user_id = auth.uid()::TEXT);

-- Happy Hour Config (read-only for all)
CREATE POLICY "Anyone can read happy hour config" ON happy_hour_config FOR SELECT
  USING (TRUE);

-- Group Challenges
CREATE POLICY "Class members can read challenges" ON group_challenges FOR SELECT
  USING (TRUE);
CREATE POLICY "Teachers can insert challenges" ON group_challenges FOR INSERT
  WITH CHECK (created_by = auth.uid()::TEXT);
CREATE POLICY "Teachers can update own challenges" ON group_challenges FOR UPDATE
  USING (created_by = auth.uid()::TEXT);

-- Group Challenge Progress
CREATE POLICY "Users can read progress" ON group_challenge_progress FOR SELECT
  USING (TRUE);
CREATE POLICY "Users can insert own progress" ON group_challenge_progress FOR INSERT
  WITH CHECK (user_id = auth.uid()::TEXT);

-- =====================================================
-- RPC Functions
-- =====================================================

-- Update daily streak
CREATE OR REPLACE FUNCTION update_daily_streak()
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_today TEXT := TO_CHAR(NOW(), 'YYYY-MM-DD');
  v_yesterday TEXT := TO_CHAR(NOW() - INTERVAL '1 day', 'YYYY-MM-DD');
  v_streak user_streaks%ROWTYPE;
  v_points INTEGER := 0;
BEGIN
  SELECT * INTO v_streak FROM user_streaks WHERE user_id = v_user_id;

  IF v_streak IS NULL THEN
    INSERT INTO user_streaks (id, user_id, current_streak, longest_streak, last_login_date, streak_points)
    VALUES (gen_random_uuid(), v_user_id, 1, 1, v_today, 5);
    RETURN jsonb_build_object('success', TRUE, 'streak', 1, 'points', 5, 'message', 'First day! +5 points');
  END IF;

  IF v_streak.last_login_date = v_today THEN
    RETURN jsonb_build_object('success', TRUE, 'streak', v_streak.current_streak, 'points', 0, 'message', 'Already checked in today');
  END IF;

  IF v_streak.last_login_date = v_yesterday THEN
    v_streak.current_streak := v_streak.current_streak + 1;
    v_points := CASE
      WHEN v_streak.current_streak >= 30 THEN 200
      WHEN v_streak.current_streak >= 14 THEN 100
      WHEN v_streak.current_streak >= 7 THEN 50
      WHEN v_streak.current_streak >= 3 THEN 20
      ELSE 5
    END;
  ELSE
    v_streak.current_streak := 1;
    v_points := 5;
  END IF;

  v_streak.longest_streak := GREATEST(v_streak.longest_streak, v_streak.current_streak);
  v_streak.last_login_date := v_today;
  v_streak.streak_points := v_streak.streak_points + v_points;

  UPDATE user_streaks SET
    current_streak = v_streak.current_streak,
    longest_streak = v_streak.longest_streak,
    last_login_date = v_today,
    streak_points = v_streak.streak_points,
    updated_at = NOW()
  WHERE user_id = v_user_id;

  -- Add points to balance
  INSERT INTO user_balances (id, user_id, points, coins)
  VALUES (gen_random_uuid(), v_user_id, v_points, 0)
  ON CONFLICT (user_id) DO UPDATE SET points = user_balances.points + v_points;

  RETURN jsonb_build_object('success', TRUE, 'streak', v_streak.current_streak, 'points', v_points, 'message', 'Streak day ' || v_streak.current_streak || '! +' || v_points || ' points');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Lucky Spin
CREATE OR REPLACE FUNCTION claim_lucky_spin()
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_today TEXT := TO_CHAR(NOW(), 'YYYY-MM-DD');
  v_already BOOLEAN;
  v_points INTEGER;
  v_rewards INTEGER[] := ARRAY[1, 2, 3, 5, 10, 15, 20, 25, 30, 50];
  v_idx INTEGER;
BEGIN
  SELECT COUNT(*) > 0 INTO v_already FROM lucky_spin_claims WHERE user_id = v_user_id AND claimed_date = v_today;
  IF v_already THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Already spun today! Come back tomorrow');
  END IF;

  v_idx := floor(random() * 10)::INTEGER + 1;
  v_points := v_rewards[v_idx];

  INSERT INTO lucky_spin_claims (id, user_id, claimed_date, points_won, reward_type)
  VALUES (gen_random_uuid(), v_user_id, v_today, v_points, 'points');

  INSERT INTO user_balances (id, user_id, points, coins)
  VALUES (gen_random_uuid(), v_user_id, v_points, 0)
  ON CONFLICT (user_id) DO UPDATE SET points = user_balances.points + v_points;

  RETURN jsonb_build_object('success', TRUE, 'points', v_points, 'message', '🎉 You won ' || v_points || ' points!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mystery Box (every 3 days)
CREATE OR REPLACE FUNCTION claim_mystery_box()
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_today TEXT := TO_CHAR(NOW(), 'YYYY-MM-DD');
  v_last_claim TEXT;
  v_days_since INTEGER;
  v_reward_type TEXT;
  v_reward_value INTEGER;
  v_rand FLOAT;
BEGIN
  SELECT claimed_date INTO v_last_claim FROM mystery_box_claims
  WHERE user_id = v_user_id ORDER BY claimed_date DESC LIMIT 1;

  IF v_last_claim IS NOT NULL THEN
    v_days_since := (v_today::DATE - v_last_claim::DATE);
    IF v_days_since < 3 THEN
      RETURN jsonb_build_object('success', FALSE, 'days_remaining', 3 - v_days_since, 'message', 'Come back in ' || (3 - v_days_since) || ' days!');
    END IF;
  END IF;

  v_rand := random();
  IF v_rand < 0.4 THEN
    v_reward_type := 'points';
    v_reward_value := floor(random() * 40 + 10)::INTEGER;
  ELSIF v_rand < 0.7 THEN
    v_reward_type := 'coins';
    v_reward_value := floor(random() * 20 + 5)::INTEGER;
  ELSIF v_rand < 0.9 THEN
    v_reward_type := 'vip_day';
    v_reward_value := 1;
  ELSE
    v_reward_type := 'points';
    v_reward_value := 100;
  END IF;

  INSERT INTO mystery_box_claims (id, user_id, claimed_date, reward_type, reward_value)
  VALUES (gen_random_uuid(), v_user_id, v_today, v_reward_type, v_reward_value);

  IF v_reward_type = 'points' THEN
    INSERT INTO user_balances (id, user_id, points, coins)
    VALUES (gen_random_uuid(), v_user_id, v_reward_value, 0)
    ON CONFLICT (user_id) DO UPDATE SET points = user_balances.points + v_reward_value;
  ELSIF v_reward_type = 'coins' THEN
    INSERT INTO user_balances (id, user_id, points, coins)
    VALUES (gen_random_uuid(), v_user_id, 0, v_reward_value)
    ON CONFLICT (user_id) DO UPDATE SET coins = user_balances.coins + v_reward_value;
  END IF;

  RETURN jsonb_build_object('success', TRUE, 'reward_type', v_reward_type, 'reward_value', v_reward_value, 'message', '🎁 Mystery Box: ' || v_reward_value || ' ' || v_reward_type);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Brain Challenge
CREATE OR REPLACE FUNCTION submit_brain_challenge(p_answer TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_today TEXT := TO_CHAR(NOW(), 'YYYY-MM-DD');
  v_correct_answer TEXT;
  v_is_correct BOOLEAN;
  v_attempts INTEGER;
  v_points INTEGER := 0;
  v_questions TEXT[] := ARRAY[
    'ما هو الجذر التربيعي لـ 144؟',
    'كم عدد أضلاع المثلث؟',
    'ما هو ناتج 7 × 8؟',
    'ما هو اللون الناتج من مزج الأحمر والأزرق؟',
    'كم ساعة في اليوم؟',
    'ما هو عكس كلمة ''سريع''؟',
    'كم صفر في المليون؟',
    'ما هو الحيوان الوطني لمصر؟'
  ];
  v_answers TEXT[] := ARRAY['12', '3', '56', 'أرجواني', '24', 'بطيء', '6', 'النسر'];
  v_q_idx INTEGER;
  v_day_num INTEGER;
BEGIN
  -- Pick question based on day of year
  v_day_num := EXTRACT(DOY FROM NOW())::INTEGER;
  v_q_idx := MOD(v_day_num - 1, 8) + 1;
  v_correct_answer := v_answers[v_q_idx];

  SELECT COUNT(*) INTO v_attempts FROM brain_challenge_attempts WHERE user_id = v_user_id AND challenge_date = v_today;

  IF v_attempts >= 3 THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Maximum 3 attempts per day');
  END IF;

  v_is_correct := LOWER(TRIM(p_answer)) = LOWER(TRIM(v_correct_answer));
  v_points := CASE WHEN v_is_correct THEN 20 ELSE 0 END;

  INSERT INTO brain_challenge_attempts (id, user_id, challenge_date, question_text, answer_submitted, is_correct, points_earned, attempt_order)
  VALUES (gen_random_uuid(), v_user_id, v_today, v_questions[v_q_idx], p_answer, v_is_correct, v_points, v_attempts + 1);

  IF v_is_correct AND v_points > 0 THEN
    INSERT INTO user_balances (id, user_id, points, coins)
    VALUES (gen_random_uuid(), v_user_id, v_points, 0)
    ON CONFLICT (user_id) DO UPDATE SET points = user_balances.points + v_points;
  END IF;

  RETURN jsonb_build_object('success', TRUE, 'is_correct', v_is_correct, 'points', v_points, 'message', CASE WHEN v_is_correct THEN '🧠 Correct! +20 points!' ELSE 'Try again!' END);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Referral
CREATE OR REPLACE FUNCTION add_referral(p_referred_user_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_today TEXT := TO_CHAR(NOW(), 'YYYY-MM-DD');
  v_month_count INTEGER;
BEGIN
  -- Max 5 referrals per month
  SELECT COUNT(*) INTO v_month_count FROM referrals
  WHERE referrer_id = v_user_id AND referral_date LIKE SUBSTRING(v_today FROM 1 FOR 7) || '%';

  IF v_month_count >= 5 THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Maximum 5 referrals per month reached');
  END IF;

  INSERT INTO referrals (id, referrer_id, referred_user_id, referral_date, points_awarded, status)
  VALUES (gen_random_uuid(), v_user_id, p_referred_user_id, v_today, 50, 'completed');

  INSERT INTO user_balances (id, user_id, points, coins)
  VALUES (gen_random_uuid(), v_user_id, 50, 0)
  ON CONFLICT (user_id) DO UPDATE SET points = user_balances.points + 50;

  RETURN jsonb_build_object('success', TRUE, 'points', 50, 'message', '🎉 Referral bonus: +50 points!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Weekly Achievement
CREATE OR REPLACE FUNCTION update_weekly_achievement(p_achievement_type TEXT, p_count_increment INTEGER DEFAULT 1)
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_week_start TEXT := TO_CHAR(NOW() - (EXTRACT(DOW FROM NOW())::INTEGER - 1) * INTERVAL '1 day', 'YYYY-MM-DD');
  v_achievement weekly_achievements%ROWTYPE;
  v_new_count INTEGER;
  v_completed BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_achievement FROM weekly_achievements
  WHERE user_id = v_user_id AND week_start = v_week_start AND achievement_type = p_achievement_type;

  IF v_achievement IS NULL THEN
    INSERT INTO weekly_achievements (id, user_id, week_start, achievement_type, target_count, current_count, completed)
    VALUES (gen_random_uuid(), v_user_id, v_week_start, p_achievement_type, 5, p_count_increment, p_count_increment >= 5);
    v_completed := p_count_increment >= 5;
  ELSE
    v_new_count := v_achievement.current_count + p_count_increment;
    v_completed := v_new_count >= v_achievement.target_count;
    UPDATE weekly_achievements SET
      current_count = v_new_count,
      completed = v_completed,
      badge_earned = CASE WHEN v_completed THEN p_achievement_type || '_badge' ELSE NULL END,
      updated_at = NOW()
    WHERE id = v_achievement.id;
  END IF;

  IF v_completed AND v_achievement.completed = FALSE THEN
    INSERT INTO user_balances (id, user_id, points, coins)
    VALUES (gen_random_uuid(), v_user_id, 30, 0)
    ON CONFLICT (user_id) DO UPDATE SET points = user_balances.points + 30;
    RETURN jsonb_build_object('success', TRUE, 'completed', TRUE, 'points', 30, 'message', '🌟 Weekly achievement completed! +30 points');
  END IF;

  RETURN jsonb_build_object('success', TRUE, 'completed', v_completed, 'current', COALESCE(v_new_count, p_count_increment), 'message', 'Progress: ' || COALESCE(v_new_count, p_count_increment) || '/5');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check Happy Hour
CREATE OR REPLACE FUNCTION is_happy_hour()
RETURNS JSONB AS $$
DECLARE
  v_config happy_hour_config%ROWTYPE;
  v_hour INTEGER;
BEGIN
  SELECT * INTO v_config FROM happy_hour_config WHERE id = 'default' LIMIT 1;

  IF v_config IS NULL OR v_config.is_active = FALSE THEN
    RETURN jsonb_build_object('is_happy_hour', FALSE, 'multiplier', 1.0);
  END IF;

  v_hour := EXTRACT(HOUR FROM NOW())::INTEGER;

  RETURN jsonb_build_object('is_happy_hour', v_hour >= v_config.start_hour AND v_hour < v_config.end_hour, 'multiplier', v_config.multiplier, 'start_hour', v_config.start_hour, 'end_hour', v_config.end_hour);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Group Challenge Functions
CREATE OR REPLACE FUNCTION create_group_challenge(p_class_id TEXT, p_title TEXT, p_description TEXT, p_target INTEGER, p_end_date TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
BEGIN
  INSERT INTO group_challenges (id, class_id, title, description, target_quizzes, start_date, end_date, created_by)
  VALUES (gen_random_uuid(), p_class_id, p_title, p_description, p_target, TO_CHAR(NOW(), 'YYYY-MM-DD'), p_end_date, v_user_id);

  RETURN jsonb_build_object('success', TRUE, 'message', 'Group challenge created!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION contribute_to_group_challenge(p_challenge_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_challenge group_challenges%ROWTYPE;
  v_already BOOLEAN;
BEGIN
  SELECT * INTO v_challenge FROM group_challenges WHERE id = p_challenge_id;

  IF v_challenge IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Challenge not found');
  END IF;

  SELECT COUNT(*) > 0 INTO v_already FROM group_challenge_progress
  WHERE challenge_id = p_challenge_id AND user_id = v_user_id
  AND contributed_at >= NOW() - INTERVAL '1 day';

  IF v_already THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Already contributed today');
  END IF;

  INSERT INTO group_challenge_progress (id, challenge_id, user_id)
  VALUES (gen_random_uuid(), p_challenge_id, v_user_id);

  UPDATE group_challenges SET
    current_quizzes = current_quizzes + 1,
    completed = (current_quizzes + 1 >= target_quizzes),
    updated_at = NOW()
  WHERE id = p_challenge_id;

  RETURN jsonb_build_object('success', TRUE, 'current', v_challenge.current_quizzes + 1, 'target', v_challenge.target_quizzes);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user motivation status (all features)
CREATE OR REPLACE FUNCTION get_motivation_status()
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::TEXT;
  v_today TEXT := TO_CHAR(NOW(), 'YYYY-MM-DD');
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'streak', (SELECT jsonb_build_object('current', current_streak, 'longest', longest_streak, 'points', streak_points) FROM user_streaks WHERE user_id = v_user_id),
    'lucky_spin', (SELECT COUNT(*) > 0 FROM lucky_spin_claims WHERE user_id = v_user_id AND claimed_date = v_today),
    'mystery_box', (SELECT CASE WHEN COUNT(*) = 0 THEN TRUE ELSE (v_today::DATE - MAX(claimed_date)::DATE) >= 3 END FROM mystery_box_claims WHERE user_id = v_user_id),
    'brain_challenge', jsonb_build_object('attempts_today', (SELECT COUNT(*) FROM brain_challenge_attempts WHERE user_id = v_user_id AND challenge_date = v_today), 'correct', (SELECT COALESCE(SUM(CASE WHEN is_correct THEN 1 ELSE 0 END), 0) FROM brain_challenge_attempts WHERE user_id = v_user_id AND challenge_date = v_today)),
    'referrals_used', (SELECT COUNT(*) FROM referrals WHERE referrer_id = v_user_id AND referral_date LIKE SUBSTRING(v_today FROM 1 FOR 7) || '%'),
    'happy_hour', (SELECT is_happy_hour())
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default happy hour config
INSERT INTO happy_hour_config (id, start_hour, end_hour, multiplier, is_active)
VALUES ('default', 18, 20, 2.0, TRUE)
ON CONFLICT (id) DO NOTHING;

-- >>> ORIGIN: supabase/migrations/20260817_secure_premium_request_approval.sql

-- Approve a pending subscription request atomically without allowing client-side
-- writes to protected membership columns.
CREATE OR REPLACE FUNCTION public.approve_premium_request(
  p_request_id text,
  p_user_id text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_user_id text;
  v_request_plan_name text;
  v_payment_screenshot text;
  v_request_status text;
  v_trial_duration smallint;
  v_user_is_premium boolean;
  v_user_plan_name text;
  v_user_plan_id text;
  v_plan_id text;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE uid = auth.uid()::text
      AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Administrator permission is required to approve subscriptions.'
      USING ERRCODE = '42501';
  END IF;

  SELECT user_id, plan_name, payment_screenshot, status
    INTO v_request_user_id, v_request_plan_name, v_payment_screenshot, v_request_status
  FROM public.premium_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_request_user_id IS NULL THEN
    RAISE EXCEPTION 'Subscription request was not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_request_user_id <> p_user_id THEN
    RAISE EXCEPTION 'Subscription request does not belong to the selected user.'
      USING ERRCODE = '42501';
  END IF;

  IF v_request_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Only pending subscription requests can be approved.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_payment_screenshot ~ '^TRIAL_OFFER_(7|14|30)_DAYS$' THEN
    v_trial_duration := (regexp_match(v_payment_screenshot, '^TRIAL_OFFER_(7|14|30)_DAYS$'))[1]::smallint;
  END IF;

  SELECT is_premium, plan_name, plan_id
    INTO v_user_is_premium, v_user_plan_name, v_user_plan_id
  FROM public.users
  WHERE uid = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile was not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_trial_duration IS NOT NULL
     AND v_user_is_premium = true
     AND coalesce(v_user_plan_name, '') NOT ILIKE '%تجريب%'
     AND coalesce(v_user_plan_name, '') NOT ILIKE '%trial%'
     AND coalesce(v_user_plan_id, '') NOT ILIKE '%trial%' THEN
    RAISE EXCEPTION 'A trial cannot replace an active paid subscription.'
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM set_config('app.allow_subscription_update', 'on', true);

  UPDATE public.premium_requests
  SET status = 'approved',
      reject_reason = NULL,
      updated_at = now()
  WHERE id = p_request_id;

  IF v_trial_duration IS NOT NULL THEN
    UPDATE public.users
    SET is_premium = true,
        plan_name = v_request_plan_name,
        plan_id = format('trial_%sd', v_trial_duration),
        is_lifetime = false,
        is_founder = false,
        renewal_date = now() + make_interval(days => v_trial_duration),
        updated_at = now()
    WHERE uid = p_user_id;
  ELSE
    v_plan_id := CASE
      WHEN v_request_plan_name ILIKE '%diamond%' OR v_request_plan_name ILIKE '%ماسي%' THEN 'diamond'
      WHEN v_request_plan_name ILIKE '%gold%' OR v_request_plan_name ILIKE '%ذهبي%' THEN 'gold'
      WHEN v_request_plan_name ILIKE '%silver%' OR v_request_plan_name ILIKE '%فضي%' THEN 'silver'
      ELSE coalesce(v_user_plan_id, 'gold')
    END;

    UPDATE public.users
    SET is_premium = true,
        plan_name = v_request_plan_name,
        plan_id = v_plan_id,
        is_lifetime = false,
        is_founder = v_plan_id = 'diamond',
        renewal_date = now() + interval '30 days',
        updated_at = now()
    WHERE uid = p_user_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_premium_request(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_premium_request(text, text) TO authenticated;
NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260817_trial_offers_persistence.sql

-- Centralized 7/14/30-day trial offer configuration.
-- Reads are available only to authenticated members; writes are restricted to
-- administrators through the SECURITY DEFINER RPC below.
CREATE TABLE IF NOT EXISTS public.trial_offers (
  duration_days smallint PRIMARY KEY CHECK (duration_days IN (7, 14, 30)),
  is_active boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);

INSERT INTO public.trial_offers (duration_days, is_active)
VALUES (7, false), (14, false), (30, false)
ON CONFLICT (duration_days) DO NOTHING;

ALTER TABLE public.trial_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trial_offers_authenticated_read ON public.trial_offers;
CREATE POLICY trial_offers_authenticated_read
  ON public.trial_offers
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

REVOKE ALL ON TABLE public.trial_offers FROM anon, authenticated;
GRANT SELECT ON TABLE public.trial_offers TO authenticated;

CREATE OR REPLACE FUNCTION public.set_trial_offer_state(
  p_duration_days smallint,
  p_is_active boolean
)
RETURNS TABLE (
  duration_days smallint,
  is_active boolean,
  updated_at timestamptz,
  updated_by text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE uid = auth.uid()::text
      AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Administrator permission is required to update trial offers.'
      USING ERRCODE = '42501';
  END IF;

  IF p_duration_days NOT IN (7, 14, 30) THEN
    RAISE EXCEPTION 'Unsupported trial duration.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.trial_offers
  SET is_active = p_is_active,
      updated_at = now(),
      updated_by = auth.uid()::text
  WHERE trial_offers.duration_days = p_duration_days;

  RETURN QUERY
  SELECT offer.duration_days, offer.is_active, offer.updated_at, offer.updated_by
  FROM public.trial_offers AS offer
  WHERE offer.duration_days = p_duration_days;
END;
$$;

REVOKE ALL ON FUNCTION public.set_trial_offer_state(smallint, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_trial_offer_state(smallint, boolean) TO authenticated;

-- >>> ORIGIN: supabase/migrations/20260818_anti_manipulation.sql

-- ============================================
-- ANTI-MANIPULATION PROTECTION
-- ============================================
DROP FUNCTION IF EXISTS claim_daily_gift();
DROP FUNCTION IF EXISTS is_happy_hour();
DROP FUNCTION IF EXISTS update_daily_streak();

-- This migration adds server-side validation to prevent:
-- 1. Double-claiming daily gifts
-- 2. Claiming challenges multiple times
-- 3. Spinning the wheel multiple times per day
-- 4. Opening mystery boxes too frequently
-- 5. Referring oneself (fake referrals)
-- 6. Awarding points to others
-- 7. Double-submitting quiz attempts

-- Helper function: check if an action was already done today
CREATE OR REPLACE FUNCTION check_daily_cooldown(
  p_table_name TEXT,
  p_user_col TEXT,
  p_userid TEXT,
  p_max_per_day INT
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INT;
  v_start TEXT;
BEGIN
  v_start := to_char(now(), 'YYYY-MM-DD') || ' 00:00:00+00';
  EXECUTE format(
    'SELECT COUNT(*) FROM %I WHERE %I::text = %L AND created_at >= %L::timestamptz',
    p_table_name, p_user_col, p_userid, v_start
  ) INTO v_count;
  RETURN v_count < p_max_per_day;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 1. PROTECT: claim_daily_gift (prevent double claim)
-- ============================================
-- The existing function already checks, but let's make it bulletproof:
-- Replace with a more secure version that uses INSERT ... ON CONFLICT
CREATE OR REPLACE FUNCTION claim_daily_gift()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid TEXT;
  v_today TEXT;
  v_existing BOOLEAN;
  v_points INT;
  v_coins INT;
  v_result jsonb;
BEGIN
  v_uid := auth.uid()::text;
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مسجل الدخول');
  END IF;

  v_today := to_char(now(), 'YYYY-MM-DD');

  -- Check if already claimed today (server-side, not client-side)
  SELECT EXISTS(
    SELECT 1 FROM daily_gift_claims
    WHERE user_id = v_uid
      AND to_char(created_at, 'YYYY-MM-DD') = v_today
  ) INTO v_existing;

  IF v_existing THEN
    RETURN jsonb_build_object('success', false, 'error', 'لقد حصلت على هديتك اليوم بالفعل!');
  END IF;

  -- Award random points (5-15) and coins (3-8)
  v_points := floor(random() * 11 + 5)::int;
  v_coins := floor(random() * 6 + 3)::int;

  -- Record the claim
  INSERT INTO daily_gift_claims (user_id, points_earned, coins_earned)
  VALUES (v_uid, v_points, v_coins);

  -- Update user balance
  INSERT INTO user_balances (user_id, points, coins)
  VALUES (v_uid, v_points, v_coins)
  ON CONFLICT (user_id) DO UPDATE
  SET points = user_balances.points + v_points,
      coins = user_balances.coins + v_coins,
      updated_at = now();

  -- Record in ledger
  INSERT INTO rewards_ledger (user_id, type, amount, description)
  VALUES (v_uid, 'points', v_points, 'هدية يومية 🎁');

  v_result := jsonb_build_object(
    'success', true,
    'points', v_points,
    'coins', v_coins
  );
  RETURN v_result;
END;
$$;

-- ============================================
-- 2. PROTECT: spin_lucky_wheel (prevent multi-spin)
-- ============================================
CREATE OR REPLACE FUNCTION spin_lucky_wheel()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid TEXT;
  v_today TEXT;
  v_existing BOOLEAN;
  v_prize INT;
  v_prize_name TEXT;
  v_result jsonb;
BEGIN
  v_uid := auth.uid()::text;
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مسجل الدخول');
  END IF;

  v_today := to_char(now(), 'YYYY-MM-DD');

  -- Check daily limit
  SELECT EXISTS(
    SELECT 1 FROM lucky_wheel_spins
    WHERE user_id = v_uid
      AND to_char(created_at, 'YYYY-MM-DD') = v_today
  ) INTO v_existing;

  IF v_existing THEN
    RETURN jsonb_build_object('success', false, 'error', 'لقد استكمت فرصتك اليوم!');
  END IF;

  -- Weighted random prize
  -- 40% chance: 10 points, 25%: 20 points, 15%: 30 points, 10%: 50 points, 7%: 5 coins, 3%: 100 points
  v_prize := (
    CASE
      WHEN random() < 0.40 THEN 10
      WHEN random() < 0.25 THEN 20
      WHEN random() < 0.15 THEN 30
      WHEN random() < 0.10 THEN 50
      WHEN random() < 0.07 THEN 5
      ELSE 100
    END
  )::int;

  v_prize_name := CASE
    WHEN v_prize <= 5 THEN v_prize::text || ' عملات'
    ELSE v_prize::text || ' نقطة'
  END;

  -- Record spin
  INSERT INTO lucky_wheel_spins (user_id, points_earned)
  VALUES (v_uid, CASE WHEN v_prize > 5 THEN v_prize ELSE 0 END);

  -- Update balance
  IF v_prize > 5 THEN
    INSERT INTO user_balances (user_id, points, coins)
    VALUES (v_uid, v_prize, 0)
    ON CONFLICT (user_id) DO UPDATE
    SET points = user_balances.points + v_prize,
        updated_at = now();

    INSERT INTO rewards_ledger (user_id, type, amount, description)
    VALUES (v_uid, 'points', v_prize, 'عجلة الحظ 🎡');
  ELSE
    INSERT INTO user_balances (user_id, points, coins)
    VALUES (v_uid, 0, v_prize)
    ON CONFLICT (user_id) DO UPDATE
    SET coins = user_balances.coins + v_prize,
        updated_at = now();

    INSERT INTO rewards_ledger (user_id, type, amount, description)
    VALUES (v_uid, 'coins', v_prize, 'عجلة الحظ 🎡');
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'prize', v_prize,
    'prize_name', v_prize_name
  );
  RETURN v_result;
END;
$$;

-- ============================================
-- 3. PROTECT: open_mystery_box (prevent spam)
-- ============================================
CREATE OR REPLACE FUNCTION open_mystery_box()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid TEXT;
  v_three_days_ago TEXT;
  v_last_opened TIMESTAMPTZ;
  v_can_open BOOLEAN;
  v_prize_type TEXT;
  v_prize_value INT;
  v_prize_name TEXT;
  v_vip_days INT;
  v_result jsonb;
BEGIN
  v_uid := auth.uid()::text;
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مسجل الدخول');
  END IF;

  -- Check if 3 days have passed since last box
  SELECT COALESCE(MAX(created_at), '1970-01-01'::timestamptz)
  FROM mystery_box_openings WHERE user_id = v_uid
  INTO v_last_opened;

  v_can_open := (now() - v_last_opened) >= interval '3 days';

  IF NOT v_can_open THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'الصندوق متاح مرة كل 3 أيام!');
  END IF;

  -- Random prize: 60% points, 25% coins, 10% badge, 5% VIP day
  IF random() < 0.60 THEN
    v_prize_type := 'points';
    v_prize_value := floor(random() * 40 + 20)::int; -- 20-60 points
    v_prize_name := v_prize_value::text || ' نقطة';
  ELSIF random() < 0.25 THEN
    v_prize_type := 'coins';
    v_prize_value := floor(random() * 8 + 5)::int; -- 5-13 coins
    v_prize_name := v_prize_value::text || ' عملة';
  ELSIF random() < 0.10 THEN
    v_prize_type := 'points';
    v_prize_value := 10;
    v_prize_name := 'شارة مميزة';
  ELSE
    v_prize_type := 'vip';
    v_vip_days := 1;
    v_prize_name := 'يوم VIP مجاني';
  END IF;

  -- Record
  INSERT INTO mystery_box_openings (user_id, prize_type, prize_value)
  VALUES (v_uid, v_prize_type, v_prize_value);

  -- Award
  IF v_prize_type = 'points' THEN
    INSERT INTO user_balances (user_id, points, coins)
    VALUES (v_uid, v_prize_value, 0)
    ON CONFLICT (user_id) DO UPDATE
    SET points = user_balances.points + v_prize_value,
        updated_at = now();
    INSERT INTO rewards_ledger (user_id, type, amount, description)
    VALUES (v_uid, 'points', v_prize_value, 'صندوق الغموض 🎁');
  ELSIF v_prize_type = 'coins' THEN
    INSERT INTO user_balances (user_id, points, coins)
    VALUES (v_uid, 0, v_prize_value)
    ON CONFLICT (user_id) DO UPDATE
    SET coins = user_balances.coins + v_prize_value,
        updated_at = now();
    INSERT INTO rewards_ledger (user_id, type, amount, description)
    VALUES (v_uid, 'coins', v_prize_value, 'صندوق الغموض 🎁');
  ELSIF v_prize_type = 'vip' THEN
    UPDATE user_balances
    SET vip_expiry = GREATEST(COALESCE(vip_expiry, now()), now()) + (v_vip_days || ' days')::interval,
        updated_at = now()
    WHERE user_id = v_uid;
    INSERT INTO rewards_ledger (user_id, type, amount, description)
    VALUES (v_uid, 'vip', v_vip_days, 'صندوق الغموض - يوم VIP 🎁');
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'prize_type', v_prize_type,
    'prize_value', v_prize_value,
    'prize_name', v_prize_name
  );
  RETURN v_result;
END;
$$;

-- ============================================
-- 4. PROTECT: brain_challenge (prevent spam, 3/day)
-- ============================================
CREATE OR REPLACE FUNCTION claim_brain_challenge(
  p_is_correct BOOLEAN
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid TEXT;
  v_today TEXT;
  v_count INT;
  v_points INT;
  v_result jsonb;
BEGIN
  v_uid := auth.uid()::text;
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مسجل الدخول');
  END IF;

  -- Check daily limit (max 3 per day)
  v_today := to_char(now(), 'YYYY-MM-DD');
  SELECT COUNT(*) FROM brain_challenge_attempts
  WHERE user_id = v_uid
    AND to_char(created_at, 'YYYY-MM-DD') = v_today
  INTO v_count;

  IF v_count >= 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'استكملت التحديات الـ 3 اليوم!');
  END IF;

  IF NOT p_is_correct THEN
    -- Still record attempt but no points
    INSERT INTO brain_challenge_attempts (user_id, is_correct)
    VALUES (v_uid, false);
    RETURN jsonb_build_object('success', true, 'correct', false, 'points', 0);
  END IF;

  v_points := 20;

  INSERT INTO brain_challenge_attempts (user_id, is_correct)
  VALUES (v_uid, true);

  INSERT INTO user_balances (user_id, points, coins)
  VALUES (v_uid, v_points, 0)
  ON CONFLICT (user_id) DO UPDATE
  SET points = user_balances.points + v_points,
      updated_at = now();

  INSERT INTO rewards_ledger (user_id, type, amount, description)
  VALUES (v_uid, 'points', v_points, 'تحدي العقل 🧠');

  v_result := jsonb_build_object('success', true, 'correct', true, 'points', v_points);
  RETURN v_result;
END;
$$;

-- ============================================
-- 5. PROTECT: referral (prevent self-referral)
-- ============================================
CREATE OR REPLACE FUNCTION claim_referral_reward(
  p_referrer_id TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid TEXT;
  v_exists BOOLEAN;
  v_is_self BOOLEAN;
  v_result jsonb;
BEGIN
  v_uid := auth.uid()::text;
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مسجل الدخول');
  END IF;

  -- Prevent self-referral
  IF v_uid = p_referrer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا يمكن إحالة نفسك!');
  END IF;

  -- Check if referral already recorded
  SELECT EXISTS(
    SELECT 1 FROM referrals
    WHERE referrer_id = p_referrer_id AND referred_id = v_uid
  ) INTO v_exists;

  IF v_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'تم تسجيل الإحالة بالفعل');
  END IF;

  -- Verify referrer exists
  SELECT EXISTS(
    SELECT 1 FROM public.users WHERE id = p_referrer_id
  ) INTO v_exists;

  IF NOT v_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'المرسل غير موجود');
  END IF;

  -- Record referral
  INSERT INTO referrals (referrer_id, referred_id)
  VALUES (p_referrer_id, v_uid);

  -- Award both parties 50 points
  INSERT INTO user_balances (user_id, points, coins)
  VALUES (p_referrer_id, 50, 0)
  ON CONFLICT (user_id) DO UPDATE
  SET points = user_balances.points + 50,
      updated_at = now();

  INSERT INTO user_balances (user_id, points, coins)
  VALUES (v_uid, 50, 0)
  ON CONFLICT (user_id) DO UPDATE
  SET points = user_balances.points + 50,
      updated_at = now();

  INSERT INTO rewards_ledger (user_id, type, amount, description)
  VALUES (p_referrer_id, 'points', 50, 'إحالة صديق 👥');

  INSERT INTO rewards_ledger (user_id, type, amount, description)
  VALUES (v_uid, 'points', 50, 'مكافأة الإحالة 👥');

  v_result := jsonb_build_object('success', true, 'points', 50);
  RETURN v_result;
END;
$$;

-- ============================================
-- 6. PROTECT: weekly_achievement (prevent double-claim)
-- ============================================
CREATE OR REPLACE FUNCTION claim_weekly_achievement()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid TEXT;
  v_this_week TEXT;
  v_exists BOOLEAN;
  v_points INT;
  v_result jsonb;
BEGIN
  v_uid := auth.uid()::text;
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مسجل الدخول');
  END IF;

  v_this_week := to_char(now(), 'IYYY-"W"IW');

  SELECT EXISTS(
    SELECT 1 FROM weekly_achievements
    WHERE user_id = v_uid
      AND week_label = v_this_week
  ) INTO v_exists;

  IF v_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'حصلت على إنجاز هذا الأسبوع بالفعل!');
  END IF;

  v_points := 30;

  INSERT INTO weekly_achievements (user_id, week_label)
  VALUES (v_uid, v_this_week);

  INSERT INTO user_balances (user_id, points, coins)
  VALUES (v_uid, v_points, 0)
  ON CONFLICT (user_id) DO UPDATE
  SET points = user_balances.points + v_points,
      updated_at = now();

  INSERT INTO rewards_ledger (user_id, type, amount, description)
  VALUES (v_uid, 'points', v_points, 'إنجاز أسبوعي 🌟');

  v_result := jsonb_build_object('success', true, 'points', v_points);
  RETURN v_result;
END;
$$;

-- ============================================
-- 7. PROTECT: happy_hour (server-side check, 2x points)
-- ============================================
CREATE OR REPLACE FUNCTION is_happy_hour()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hour INT;
BEGIN
  v_hour := extract(hour from now() at time zone 'Asia/Cairo');
  -- Happy hour: 6 PM - 8 PM (18:00 - 20:00 Cairo time)
  RETURN v_hour >= 18 AND v_hour < 20;
END;
$$;

-- ============================================
-- 8. PROTECT: quiz_attempt (prevent double-submit)
-- ============================================
-- The existing submit_quiz_attempt already uses ON CONFLICT
-- but let's verify it's using the right constraint.
-- We'll add a more explicit check.
CREATE OR REPLACE FUNCTION submit_quiz_attempt_secure(
  p_quiz_id TEXT,
  p_score INT,
  p_total_questions INT,
  p_time_taken INT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid TEXT;
  v_existing_id TEXT;
  v_result jsonb;
BEGIN
  v_uid := auth.uid()::text;
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مسجل الدخول');
  END IF;

  -- Check if already submitted this quiz (prevent duplicate)
  SELECT id FROM quiz_completions
  WHERE user_id = v_uid AND quiz_id = p_quiz_id
  LIMIT 1 INTO v_existing_id;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing record instead of creating new
    UPDATE quiz_completions
    SET score = GREATEST(score, p_score),  -- Keep highest score
        time_taken = p_time_taken,
        completed_at = now()
    WHERE id = v_existing_id;

    v_result := jsonb_build_object(
      'success', true,
      'action', 'updated',
      'completion_id', v_existing_id
    );
    RETURN v_result;
  END IF;

  -- Insert new attempt
  INSERT INTO quiz_completions (id, user_id, quiz_id, score, total_questions, time_taken)
  VALUES (gen_random_uuid()::text, v_uid, p_quiz_id, p_score, p_total_questions, p_time_taken)
  RETURNING id INTO v_existing_id;

  v_result := jsonb_build_object(
    'success', true,
    'action', 'inserted',
    'completion_id', v_existing_id
  );
  RETURN v_result;
END;
$$;

-- ============================================
-- 9. PROTECT: streak (server-side validation)
-- ============================================
CREATE OR REPLACE FUNCTION update_daily_streak()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid TEXT;
  v_today TEXT;
  v_yesterday TEXT;
  v_last_login TEXT;
  v_current_streak INT;
  v_points INT;
  v_result jsonb;
BEGIN
  v_uid := auth.uid()::text;
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مسجل الدخول');
  END IF;

  v_today := to_char(now(), 'YYYY-MM-DD');

  -- Check if already logged in today (don't double count)
  SELECT COALESCE(MAX(to_char(created_at, 'YYYY-MM-DD')), '')
  FROM daily_logins
  WHERE user_id = v_uid
  INTO v_last_login;

  IF v_last_login = v_today THEN
    -- Already logged in today, just return current streak
    SELECT COALESCE(MAX(streak), 0) FROM streak_records
    WHERE user_id = v_uid AND to_char(created_at, 'YYYY-MM-DD') = v_today
    INTO v_current_streak;

    v_result := jsonb_build_object(
      'success', true,
      'streak', v_current_streak,
      'points', 0,
      'message', 'تم تسجيل دخولك اليوم بالفعل'
    );
    RETURN v_result;
  END IF;

  -- Calculate new streak
  v_yesterday := to_char(now() - interval '1 day', 'YYYY-MM-DD');

  IF v_last_login = v_yesterday THEN
    -- Consecutive day
    SELECT COALESCE(MAX(streak), 0) + 1
    FROM streak_records
    WHERE user_id = v_uid
    INTO v_current_streak;
  ELSE
    -- New streak
    v_current_streak := 1;
  END IF;

  -- Record login
  INSERT INTO daily_logins (user_id)
  VALUES (v_uid);

  -- Record streak
  INSERT INTO streak_records (user_id, streak)
  VALUES (v_uid, v_current_streak);

  -- Award points based on streak
  v_points := CASE
    WHEN v_current_streak >= 30 THEN 200
    WHEN v_current_streak >= 21 THEN 100
    WHEN v_current_streak >= 14 THEN 75
    WHEN v_current_streak >= 7 THEN 50
    WHEN v_current_streak >= 3 THEN 25
    ELSE 5
  END;

  -- Update balance
  INSERT INTO user_balances (user_id, points, coins)
  VALUES (v_uid, v_points, 0)
  ON CONFLICT (user_id) DO UPDATE
  SET points = user_balances.points + v_points,
      updated_at = now();

  INSERT INTO rewards_ledger (user_id, type, amount, description)
  VALUES (v_uid, 'points', v_points, 'سلسلة أيام 🔥 يوم ' || v_current_streak);

  v_result := jsonb_build_object(
    'success', true,
    'streak', v_current_streak,
    'points', v_points,
    'message', 'سلسلة ' || v_current_streak || ' يوم! +' || v_points || ' نقطة'
  );
  RETURN v_result;
END;
$$;

-- >>> ORIGIN: supabase/migrations/20260818_fix_diamond_workspace_auto_provision_audit.sql

CREATE OR REPLACE FUNCTION public.provision_my_diamond_institution()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_institution_id UUID;
  v_display_name TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'سجّل الدخول أولاً للوصول إلى مساحة المؤسسة';
  END IF;

  SELECT COALESCE(NULLIF(trim(name), ''), 'QuizSpace')
  INTO v_display_name
  FROM public.users
  WHERE uid = v_user_id
    AND is_premium = true
    AND lower(COALESCE(plan_id, '')) = 'diamond'
    AND (renewal_date IS NULL OR renewal_date >= now());

  IF v_display_name IS NULL THEN
    RAISE EXCEPTION 'مساحة المؤسسات متاحة للباقة الماسية النشطة فقط';
  END IF;

  SELECT id
  INTO v_institution_id
  FROM public.institutions
  WHERE owner_id = v_user_id
    AND status = 'active'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_institution_id IS NULL THEN
    INSERT INTO public.institutions (name, owner_id, seat_limit, status)
    VALUES ('مؤسسة ' || v_display_name, v_user_id, 15, 'active')
    RETURNING id INTO v_institution_id;

    INSERT INTO public.institution_audit_log (institution_id, actor_id, action, target_user_id, metadata)
    VALUES (v_institution_id, v_user_id, 'institution_created', v_user_id, jsonb_build_object('seat_limit', 15, 'source', 'auto_provision'));
  END IF;

  INSERT INTO public.institution_members (institution_id, user_id, role, status, added_by)
  VALUES (v_institution_id, v_user_id, 'owner', 'active', v_user_id)
  ON CONFLICT (institution_id, user_id)
  DO UPDATE SET role = 'owner', status = 'active', added_by = EXCLUDED.added_by;

  RETURN v_institution_id;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_my_diamond_institution() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provision_my_diamond_institution() TO authenticated;
NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260818_grant_institution_read_access.sql

GRANT SELECT ON TABLE public.institutions TO authenticated;
GRANT SELECT ON TABLE public.institution_members TO authenticated;
NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260818_harden_institution_function_surface.sql

CREATE OR REPLACE FUNCTION set_institution_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION is_institution_manager(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION is_institution_member(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_institution_manager(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_institution_member(UUID) TO authenticated;

-- >>> ORIGIN: supabase/migrations/20260819_add_users_cover_url.sql

-- Persist a recoverable copy of the profile cover independently of the
-- serialized location settings used by legacy clients.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS cover_url TEXT;

COMMENT ON COLUMN public.users.cover_url IS
  'Optional URL of the user-selected custom profile cover.';

-- Ensure the REST API sees the column immediately after the migration.
NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260819_institution_learning_gap_analytics.sql

-- Link new and existing classrooms to an eligible Diamond institution.
ALTER TABLE public.classrooms
  ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_classrooms_institution_id
  ON public.classrooms(institution_id)
  WHERE institution_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quizzes_classroom_category
  ON public.quizzes(classroom_id, category);

CREATE INDEX IF NOT EXISTS idx_completions_quiz_taker_created
  ON public.completions(quiz_id, taker_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.attach_creator_institution_to_classroom()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id TEXT := auth.uid()::text;
  v_institution_id UUID;
BEGIN
  IF v_actor_id IS NOT NULL AND NEW.created_by <> v_actor_id THEN
    RAISE EXCEPTION 'غير مصرح بإنشاء فصل لمستخدم آخر';
  END IF;

  IF NEW.institution_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.institution_members member
      JOIN public.institutions institution ON institution.id = member.institution_id
      WHERE member.institution_id = NEW.institution_id
        AND member.user_id = NEW.created_by
        AND member.status = 'active'
        AND institution.status = 'active'
    ) THEN
      RAISE EXCEPTION 'لا يمكن ربط الفصل بمؤسسة غير مفعّلة لهذا المعلم';
    END IF;
    RETURN NEW;
  END IF;

  SELECT member.institution_id
  INTO v_institution_id
  FROM public.institution_members member
  JOIN public.institutions institution ON institution.id = member.institution_id
  WHERE member.user_id = NEW.created_by
    AND member.status = 'active'
    AND institution.status = 'active'
  ORDER BY member.created_at ASC
  LIMIT 1;

  NEW.institution_id := v_institution_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS attach_creator_institution_to_classroom_trigger ON public.classrooms;
CREATE TRIGGER attach_creator_institution_to_classroom_trigger
  BEFORE INSERT OR UPDATE OF institution_id, created_by ON public.classrooms
  FOR EACH ROW EXECUTE FUNCTION public.attach_creator_institution_to_classroom();

UPDATE public.classrooms classroom
SET institution_id = (
  SELECT member.institution_id
  FROM public.institution_members member
  JOIN public.institutions institution ON institution.id = member.institution_id
  WHERE member.user_id = classroom.created_by
    AND member.status = 'active'
    AND institution.status = 'active'
  ORDER BY member.created_at ASC
  LIMIT 1
)
WHERE classroom.institution_id IS NULL;

CREATE OR REPLACE FUNCTION public.can_view_institution_learning_gaps(p_institution_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.institution_members member
    JOIN public.institutions institution ON institution.id = member.institution_id
    WHERE member.institution_id = p_institution_id
      AND member.user_id = auth.uid()::text
      AND member.status = 'active'
      AND institution.status = 'active'
      AND (
        member.role IN ('owner', 'manager')
        OR EXISTS (
          SELECT 1
          FROM public.classrooms classroom
          WHERE classroom.institution_id = p_institution_id
            AND classroom.created_by = auth.uid()::text
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_institution_learning_gap_students(p_institution_id UUID)
RETURNS TABLE (
  student_id TEXT,
  student_name TEXT,
  student_photo_url TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_view_institution_learning_gaps(p_institution_id) THEN
    RAISE EXCEPTION 'غير مصرح بعرض تحليلات طلاب هذه المؤسسة';
  END IF;

  RETURN QUERY
  SELECT DISTINCT student.student_id, user_profile.name, user_profile.photo_url
  FROM public.classroom_students student
  JOIN public.classrooms classroom ON classroom.id = student.class_id
  JOIN public.users user_profile ON user_profile.uid = student.student_id
  WHERE classroom.institution_id = p_institution_id
    AND (
      public.is_institution_manager(p_institution_id)
      OR classroom.created_by = auth.uid()::text
    )
  ORDER BY user_profile.name NULLS LAST, student.student_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_institution_learning_gaps(
  p_institution_id UUID,
  p_student_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  student_id TEXT,
  student_name TEXT,
  student_photo_url TEXT,
  category TEXT,
  quizzes_taken INTEGER,
  average_score NUMERIC,
  mastery_percent INTEGER,
  gap_level TEXT,
  latest_completion_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_view_institution_learning_gaps(p_institution_id) THEN
    RAISE EXCEPTION 'غير مصرح بعرض تحليلات طلاب هذه المؤسسة';
  END IF;

  IF p_student_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.classroom_students student
    JOIN public.classrooms classroom ON classroom.id = student.class_id
    WHERE classroom.institution_id = p_institution_id
      AND student.student_id = p_student_id
      AND (
        public.is_institution_manager(p_institution_id)
        OR classroom.created_by = auth.uid()::text
      )
  ) THEN
    RAISE EXCEPTION 'الطالب المطلوب ليس ضمن نطاق المؤسسة المصرح به';
  END IF;

  RETURN QUERY
  SELECT
    completion.taker_id,
    user_profile.name,
    user_profile.photo_url,
    COALESCE(NULLIF(BTRIM(quiz.category), ''), 'غير مصنف') AS category,
    COUNT(*)::INTEGER AS quizzes_taken,
    ROUND(AVG((completion.score::NUMERIC / NULLIF(completion.total_questions, 0)) * 100), 1) AS average_score,
    ROUND(AVG((completion.score::NUMERIC / NULLIF(completion.total_questions, 0)) * 100))::INTEGER AS mastery_percent,
    CASE
      WHEN AVG((completion.score::NUMERIC / NULLIF(completion.total_questions, 0)) * 100) < 50 THEN 'priority'
      WHEN AVG((completion.score::NUMERIC / NULLIF(completion.total_questions, 0)) * 100) < 75 THEN 'watch'
      ELSE 'strong'
    END AS gap_level,
    MAX(completion.created_at) AS latest_completion_at
  FROM public.completions completion
  JOIN public.quizzes quiz ON quiz.id = completion.quiz_id
  JOIN public.classrooms classroom ON classroom.id = quiz.classroom_id
  JOIN public.classroom_students student
    ON student.class_id = classroom.id
    AND student.student_id = completion.taker_id
  JOIN public.users user_profile ON user_profile.uid = completion.taker_id
  WHERE classroom.institution_id = p_institution_id
    AND (p_student_id IS NULL OR completion.taker_id = p_student_id)
    AND (
      public.is_institution_manager(p_institution_id)
      OR classroom.created_by = auth.uid()::text
    )
    AND completion.total_questions > 0
  GROUP BY completion.taker_id, user_profile.name, user_profile.photo_url, COALESCE(NULLIF(BTRIM(quiz.category), ''), 'غير مصنف')
  ORDER BY mastery_percent ASC, latest_completion_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_creator_institution_to_classroom() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_institution_learning_gaps(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_institution_learning_gap_students(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_institution_learning_gaps(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_institution_learning_gap_students(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_institution_learning_gaps(UUID, TEXT) TO authenticated;

-- >>> ORIGIN: supabase/migrations/20260819_institution_white_label_export.sql

CREATE OR REPLACE FUNCTION public.get_institution_export_brand_for_quiz(p_quiz_id TEXT)
RETURNS TABLE (
  institution_id UUID,
  institution_name TEXT,
  branding JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT institution.id, institution.name, institution.branding
  FROM public.quizzes quiz
  JOIN public.classrooms classroom ON classroom.id = quiz.classroom_id
  JOIN public.institutions institution ON institution.id = classroom.institution_id
  WHERE quiz.id = p_quiz_id
    AND public.is_institution_manager(institution.id)
    AND institution.status = 'active'
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_institution_export_brand_for_quiz(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_institution_export_brand_for_quiz(TEXT) TO authenticated;

-- >>> ORIGIN: supabase/migrations/20260819_revoke_handle_new_user_execute.sql

-- handle_new_user is invoked only by the auth trigger. It must not be exposed
-- as a client-callable RPC because it depends on trigger-only NEW values.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- >>> ORIGIN: supabase/migrations/20260820_points_store.sql

-- QuizSpace points store, cosmetic inventory, payment orders, and admin grants.
-- All balance changes happen inside SECURITY DEFINER functions; clients never write balances directly.

CREATE TABLE IF NOT EXISTS public.reward_store_items (
  id TEXT PRIMARY KEY,
  item_type TEXT NOT NULL CHECK (item_type IN ('frame', 'points_bundle', 'cosmetic')),
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  description_ar TEXT NOT NULL DEFAULT '',
  price_points INTEGER NOT NULL DEFAULT 0 CHECK (price_points >= 0),
  price_egp NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price_egp >= 0),
  reward_points INTEGER NOT NULL DEFAULT 0 CHECK (reward_points >= 0),
  image_url TEXT,
  css_class TEXT,
  min_plan TEXT NOT NULL DEFAULT 'free' CHECK (min_plan IN ('free', 'silver', 'gold', 'diamond')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reward_inventory (
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES public.reward_store_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  source TEXT NOT NULL DEFAULT 'purchase',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS public.reward_store_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES public.reward_store_items(id),
  order_type TEXT NOT NULL DEFAULT 'points_purchase' CHECK (order_type IN ('points_purchase', 'cosmetic_purchase')),
  amount_points INTEGER NOT NULL DEFAULT 0 CHECK (amount_points >= 0),
  amount_egp NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (amount_egp >= 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('vodafone_cash', 'instapay', 'points')),
  payment_reference TEXT,
  receipt_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  notes TEXT,
  approved_by TEXT REFERENCES public.users(uid),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reward_payment_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  vodafone_number TEXT NOT NULL DEFAULT '',
  instapay_handle TEXT NOT NULL DEFAULT '',
  instapay_link TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.reward_payment_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.reward_store_items (id, item_type, name, name_ar, description, description_ar, price_points, price_egp, reward_points, css_class, min_plan, sort_order) VALUES
  ('frame_neon_orbit', 'frame', 'Neon Orbit', 'مدار نيون', 'A bright cosmic ring for your profile photo.', 'إطار كوني مضيء لصورة ملفك الشخصي.', 400, 0, 0, 'frame-neon-orbit', 'free', 10),
  ('frame_aurora', 'frame', 'Aurora Glass', 'زجاج الشفق', 'A soft aurora glow with a glass finish.', 'وهج شفق ناعم بلمسة زجاجية.', 800, 0, 0, 'frame-aurora', 'free', 20),
  ('frame_fire', 'frame', 'Fire Trail', 'أثر النار', 'A bold animated-looking flame border.', 'إطار ناري جريء بطابع متحرك.', 1200, 0, 0, 'frame-fire', 'free', 30),
  ('frame_crystal_luxe', 'frame', 'Crystal Luxe', 'كريستال فاخر', 'A premium crystal-style profile frame.', 'إطار كريستالي فاخر لصورتك.', 1800, 0, 0, 'frame-crystal-luxe', 'free', 40),
  ('frame_star_crown', 'frame', 'Star Crown', 'تاج النجوم', 'A celebratory crown for quiz champions.', 'تاج احتفالي لأبطال الاختبارات.', 2400, 0, 0, 'frame-star-crown', 'free', 50),
  ('frame_diamond_comet', 'frame', 'Diamond Comet', 'مذنب ماسي', 'Exclusive frame included with Diamond membership.', 'إطار حصري مجاني لمشتركي الباقة الماسية.', 0, 0, 0, 'frame-diamond-comet', 'diamond', 60),
  ('frame_diamond_crown', 'frame', 'Diamond Crown', 'التاج الماسي', 'Exclusive premium frame included with Diamond membership.', 'إطار فاخر حصري مجاني لمشتركي الباقة الماسية.', 0, 0, 0, 'frame-diamond-crown', 'diamond', 70),
  ('points_100', 'points_bundle', '100 Points', '100 نقطة', 'A starter points pack.', 'باقة نقاط بداية.', 0, 20, 100, NULL, 'free', 100),
  ('points_300', 'points_bundle', '300 Points', '300 نقطة', 'A practical points pack for frames and rewards.', 'باقة عملية لشراء الإطارات والمكافآت.', 0, 50, 300, NULL, 'free', 110),
  ('points_800', 'points_bundle', '800 Points', '800 نقطة', 'A better-value points pack.', 'باقة نقاط بقيمة أفضل.', 0, 120, 800, NULL, 'free', 120),
  ('points_2000', 'points_bundle', '2,000 Points', '2000 نقطة', 'The champion points pack.', 'باقة أبطال الاختبارات.', 0, 250, 2000, NULL, 'free', 130)
ON CONFLICT (id) DO UPDATE SET
  item_type = EXCLUDED.item_type, name = EXCLUDED.name, name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description, description_ar = EXCLUDED.description_ar,
  price_points = EXCLUDED.price_points, price_egp = EXCLUDED.price_egp,
  reward_points = EXCLUDED.reward_points, css_class = EXCLUDED.css_class,
  min_plan = EXCLUDED.min_plan, sort_order = EXCLUDED.sort_order, updated_at = now();

CREATE INDEX IF NOT EXISTS reward_store_items_active_idx ON public.reward_store_items(is_active, sort_order);
CREATE INDEX IF NOT EXISTS reward_inventory_user_idx ON public.reward_inventory(user_id, is_active);
CREATE INDEX IF NOT EXISTS reward_store_orders_user_idx ON public.reward_store_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reward_store_orders_status_idx ON public.reward_store_orders(status, created_at DESC);

ALTER TABLE public.reward_store_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_payment_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reward_store_items_read ON public.reward_store_items;
CREATE POLICY reward_store_items_read ON public.reward_store_items FOR SELECT TO authenticated USING (is_active = true OR EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid()::text AND u.is_admin = true));

DROP POLICY IF EXISTS reward_inventory_own_read ON public.reward_inventory;
CREATE POLICY reward_inventory_own_read ON public.reward_inventory FOR SELECT TO authenticated USING (user_id = auth.uid()::text OR EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid()::text AND u.is_admin = true));

DROP POLICY IF EXISTS reward_store_orders_own_read ON public.reward_store_orders;
CREATE POLICY reward_store_orders_own_read ON public.reward_store_orders FOR SELECT TO authenticated USING (user_id = auth.uid()::text OR EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid()::text AND u.is_admin = true));
DROP POLICY IF EXISTS reward_store_orders_own_insert ON public.reward_store_orders;
CREATE POLICY reward_store_orders_own_insert ON public.reward_store_orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS reward_payment_settings_read ON public.reward_payment_settings;
CREATE POLICY reward_payment_settings_read ON public.reward_payment_settings FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.reward_plan_rank(p_plan TEXT)
RETURNS INTEGER AS $$
  SELECT CASE
    WHEN lower(coalesce(p_plan, '')) LIKE '%diamond%' OR lower(coalesce(p_plan, '')) LIKE '%الماس%' THEN 4
    WHEN lower(coalesce(p_plan, '')) LIKE '%gold%' OR lower(coalesce(p_plan, '')) LIKE '%ذهبي%' THEN 3
    WHEN lower(coalesce(p_plan, '')) LIKE '%silver%' OR lower(coalesce(p_plan, '')) LIKE '%فضي%' THEN 2
    ELSE 1
  END;
$$ LANGUAGE SQL IMMUTABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.purchase_reward_item(p_item_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_item public.reward_store_items%ROWTYPE;
  v_user public.users%ROWTYPE;
  v_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_item FROM public.reward_store_items WHERE id = p_item_id AND is_active = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Store item not found'; END IF;
  IF v_item.item_type <> 'frame' AND v_item.item_type <> 'cosmetic' THEN RAISE EXCEPTION 'This item requires a payment order'; END IF;
  SELECT * INTO v_user FROM public.users WHERE uid = v_user_id;
  IF public.reward_plan_rank(v_user.plan_name) < public.reward_plan_rank(v_item.min_plan) THEN RAISE EXCEPTION 'This item requires a higher membership plan'; END IF;
  IF EXISTS (SELECT 1 FROM public.reward_inventory WHERE user_id = v_user_id AND item_id = v_item.id AND is_active = true) THEN
    RETURN jsonb_build_object('success', false, 'already_owned', true, 'item_id', v_item.id);
  END IF;

  SELECT points INTO v_balance FROM public.user_reward_balances WHERE user_id = v_user_id FOR UPDATE;
  v_balance := COALESCE(v_balance, 0);
  IF v_item.price_points > v_balance THEN RAISE EXCEPTION 'Not enough points'; END IF;
  v_new_balance := v_balance - v_item.price_points;

  INSERT INTO public.user_reward_balances (user_id, points, level)
  VALUES (v_user_id, v_new_balance, public.reward_level_for_points(v_new_balance))
  ON CONFLICT (user_id) DO UPDATE SET points = EXCLUDED.points, level = EXCLUDED.level, updated_at = now();

  IF v_item.price_points > 0 THEN
    INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id, metadata)
    VALUES (v_user_id, -v_item.price_points, 'store_purchase', 'store_purchase:' || gen_random_uuid()::text, v_item.id, jsonb_build_object('item_id', v_item.id, 'item_name', v_item.name));
  END IF;

  INSERT INTO public.reward_inventory (user_id, item_id, quantity, source)
  VALUES (v_user_id, v_item.id, 1, CASE WHEN v_item.price_points = 0 THEN 'diamond_membership' ELSE 'points_purchase' END);

  RETURN jsonb_build_object('success', true, 'item_id', v_item.id, 'points_spent', v_item.price_points, 'total_points', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.create_reward_points_order(p_item_id TEXT, p_payment_method TEXT, p_payment_reference TEXT DEFAULT NULL, p_receipt_url TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_item public.reward_store_items%ROWTYPE;
  v_order public.reward_store_orders%ROWTYPE;
BEGIN
  IF p_payment_method NOT IN ('vodafone_cash', 'instapay') THEN RAISE EXCEPTION 'Unsupported payment method'; END IF;
  SELECT * INTO v_item FROM public.reward_store_items WHERE id = p_item_id AND is_active = true AND item_type = 'points_bundle';
  IF NOT FOUND THEN RAISE EXCEPTION 'Points bundle not found'; END IF;
  INSERT INTO public.reward_store_orders (user_id, item_id, order_type, amount_points, amount_egp, payment_method, payment_reference, receipt_url)
  VALUES (v_user_id, v_item.id, 'points_purchase', v_item.reward_points, v_item.price_egp, p_payment_method, NULLIF(trim(p_payment_reference), ''), p_receipt_url)
  RETURNING * INTO v_order;
  RETURN jsonb_build_object('success', true, 'order_id', v_order.id, 'status', v_order.status, 'amount_egp', v_order.amount_egp, 'reward_points', v_item.reward_points);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.admin_grant_reward_points(p_user_id TEXT, p_points INTEGER, p_note TEXT DEFAULT '')
RETURNS JSONB AS $$
DECLARE
  v_admin public.users%ROWTYPE;
  v_new_balance INTEGER;
BEGIN
  SELECT * INTO v_admin FROM public.users WHERE uid = auth.uid()::text AND is_admin = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_points <= 0 OR p_points > 1000000 THEN RAISE EXCEPTION 'Invalid points amount'; END IF;
  INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id, metadata)
  VALUES (p_user_id, p_points, 'admin_grant', 'admin_grant:' || gen_random_uuid()::text, p_user_id, jsonb_build_object('note', p_note, 'admin_id', v_admin.uid));
  INSERT INTO public.user_reward_balances (user_id, points, level)
  VALUES (p_user_id, p_points, public.reward_level_for_points(p_points))
  ON CONFLICT (user_id) DO UPDATE SET points = public.user_reward_balances.points + p_points, level = public.reward_level_for_points(public.user_reward_balances.points + p_points), updated_at = now()
  RETURNING points INTO v_new_balance;
  RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'points_added', p_points, 'total_points', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.admin_review_reward_order(p_order_id UUID, p_status TEXT, p_note TEXT DEFAULT '')
RETURNS JSONB AS $$
DECLARE
  v_admin public.users%ROWTYPE;
  v_order public.reward_store_orders%ROWTYPE;
  v_item public.reward_store_items%ROWTYPE;
  v_new_balance INTEGER;
BEGIN
  SELECT * INTO v_admin FROM public.users WHERE uid = auth.uid()::text AND is_admin = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_status NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'Invalid review status'; END IF;
  SELECT * INTO v_order FROM public.reward_store_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.status <> 'pending' THEN RETURN jsonb_build_object('success', false, 'status', v_order.status); END IF;
  UPDATE public.reward_store_orders SET status = p_status, notes = NULLIF(p_note, ''), approved_by = v_admin.uid, updated_at = now() WHERE id = p_order_id;
  IF p_status = 'rejected' THEN RETURN jsonb_build_object('success', true, 'status', 'rejected'); END IF;

  SELECT * INTO v_item FROM public.reward_store_items WHERE id = v_order.item_id;
  INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id, metadata)
  VALUES (v_order.user_id, v_item.reward_points, 'points_purchase', 'reward_order:' || v_order.id::text, v_order.id::text, jsonb_build_object('item_id', v_item.id, 'payment_method', v_order.payment_method, 'amount_egp', v_order.amount_egp))
  ON CONFLICT (user_id, event_key) DO NOTHING;
  INSERT INTO public.user_reward_balances (user_id, points, level)
  VALUES (v_order.user_id, v_item.reward_points, public.reward_level_for_points(v_item.reward_points))
  ON CONFLICT (user_id) DO UPDATE SET points = public.user_reward_balances.points + v_item.reward_points, level = public.reward_level_for_points(public.user_reward_balances.points + v_item.reward_points), updated_at = now()
  RETURNING points INTO v_new_balance;
  RETURN jsonb_build_object('success', true, 'status', 'approved', 'points_added', v_item.reward_points, 'total_points', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.reward_plan_rank(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_reward_item(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_reward_points_order(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_reward_points(TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_reward_order(UUID, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260821_classroom_attendance_register.sql

create table if not exists public.classroom_attendance_records (
  id text primary key default ('attendance-' || gen_random_uuid()::text),
  class_id text not null references public.classrooms(id) on delete cascade,
  student_id text not null references public.users(uid) on delete cascade,
  attendance_date date not null,
  status text not null default 'present' check (status in ('present', 'late', 'absent', 'excused')),
  marked_by text not null references public.users(uid) on delete restrict,
  marked_at timestamptz not null default now(),
  note text check (note is null or char_length(note) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classroom_attendance_records_class_student_date_key unique (class_id, student_id, attendance_date)
);

create index if not exists classroom_attendance_records_class_date_idx
  on public.classroom_attendance_records (class_id, attendance_date);

create index if not exists classroom_attendance_records_student_date_idx
  on public.classroom_attendance_records (student_id, attendance_date desc);

alter table public.classroom_attendance_records enable row level security;

revoke all on public.classroom_attendance_records from anon;
revoke insert, update, delete on public.classroom_attendance_records from authenticated;
grant select on public.classroom_attendance_records to authenticated;

drop policy if exists classroom_attendance_records_read on public.classroom_attendance_records;
create policy classroom_attendance_records_read
on public.classroom_attendance_records
for select
to authenticated
using (
  (select auth.uid()) is not null
  and exists (
    select 1
    from public.classrooms classroom
    where classroom.id = classroom_attendance_records.class_id
      and (
        classroom.created_by = (select auth.uid())::text
        or (
          classroom_attendance_records.student_id = (select auth.uid())::text
          and exists (
            select 1
            from public.classroom_students membership
            where membership.class_id = classroom_attendance_records.class_id
              and membership.student_id = (select auth.uid())::text
          )
        )
      )
  )
);

create or replace function public.mark_classroom_attendance(
  p_class_id text,
  p_student_id text,
  p_attendance_date date,
  p_status text,
  p_note text default null
)
returns table (
  id text,
  class_id text,
  student_id text,
  attendance_date date,
  status text,
  marked_by text,
  marked_at timestamptz,
  note text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_actor_id text := (select auth.uid())::text;
  v_normalized_status text := lower(trim(coalesce(p_status, '')));
  v_normalized_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  if v_actor_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if p_class_id is null or length(trim(p_class_id)) = 0
    or p_student_id is null or length(trim(p_student_id)) = 0
    or p_attendance_date is null then
    raise exception 'Classroom, student, and attendance date are required.' using errcode = '22023';
  end if;

  if v_normalized_status not in ('present', 'late', 'absent', 'excused') then
    raise exception 'Attendance status is invalid.' using errcode = '22023';
  end if;

  if v_normalized_note is not null and char_length(v_normalized_note) > 280 then
    raise exception 'Attendance note is too long.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.classrooms classroom
    where classroom.id = trim(p_class_id)
      and classroom.created_by = v_actor_id
  ) then
    raise exception 'Only the classroom owner can update attendance.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.classroom_students membership
    where membership.class_id = trim(p_class_id)
      and membership.student_id = trim(p_student_id)
  ) then
    raise exception 'The selected learner is not enrolled in this classroom.' using errcode = '22023';
  end if;

  return query
  insert into public.classroom_attendance_records (
    class_id,
    student_id,
    attendance_date,
    status,
    marked_by,
    marked_at,
    note,
    updated_at
  ) values (
    trim(p_class_id),
    trim(p_student_id),
    p_attendance_date,
    v_normalized_status,
    v_actor_id,
    now(),
    v_normalized_note,
    now()
  )
  on conflict (class_id, student_id, attendance_date)
  do update set
    status = excluded.status,
    marked_by = excluded.marked_by,
    marked_at = excluded.marked_at,
    note = excluded.note,
    updated_at = now()
  returning
    classroom_attendance_records.id,
    classroom_attendance_records.class_id,
    classroom_attendance_records.student_id,
    classroom_attendance_records.attendance_date,
    classroom_attendance_records.status,
    classroom_attendance_records.marked_by,
    classroom_attendance_records.marked_at,
    classroom_attendance_records.note,
    classroom_attendance_records.created_at,
    classroom_attendance_records.updated_at;
end;
$$;

revoke all on function public.mark_classroom_attendance(text, text, date, text, text) from public;
grant execute on function public.mark_classroom_attendance(text, text, date, text, text) to authenticated;

-- >>> ORIGIN: supabase/migrations/20260821_rewards_bridge.sql

-- Bridge Motivation Hub games to the canonical reward balance and ledger.

CREATE OR REPLACE FUNCTION public.grant_reward_points(
  p_user_id TEXT,
  p_points INTEGER,
  p_event_type TEXT,
  p_event_key TEXT,
  p_reference_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_rows INTEGER := 0;
  v_total INTEGER := 0;
BEGIN
  IF p_points <= 0 THEN
    RETURN jsonb_build_object('points_awarded', 0, 'total_points', COALESCE((SELECT points FROM public.user_reward_balances WHERE user_id = p_user_id), 0));
  END IF;
  INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id, metadata)
  VALUES (p_user_id, p_points, p_event_type, p_event_key, p_reference_id, COALESCE(p_metadata, '{}'::jsonb))
  ON CONFLICT (user_id, event_key) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  INSERT INTO public.user_reward_balances (user_id, points, level)
  VALUES (p_user_id, CASE WHEN v_rows > 0 THEN p_points ELSE 0 END, public.reward_level_for_points(CASE WHEN v_rows > 0 THEN p_points ELSE 0 END))
  ON CONFLICT (user_id) DO UPDATE SET
    points = public.user_reward_balances.points + CASE WHEN v_rows > 0 THEN p_points ELSE 0 END,
    level = public.reward_level_for_points(public.user_reward_balances.points + CASE WHEN v_rows > 0 THEN p_points ELSE 0 END),
    updated_at = now();

  SELECT points INTO v_total FROM public.user_reward_balances WHERE user_id = p_user_id;
  RETURN jsonb_build_object('points_awarded', CASE WHEN v_rows > 0 THEN p_points ELSE 0 END, 'total_points', COALESCE(v_total, 0));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_daily_brain_challenge()
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today TEXT := to_char(now(), 'YYYY-MM-DD');
  v_questions TEXT[] := ARRAY[
    'ما هو الجذر التربيعي لـ 144؟',
    'كم عدد أضلاع المثلث؟',
    'ما هو ناتج 7 × 8؟',
    'ما هو اللون الناتج من مزج الأحمر والأزرق؟',
    'كم ساعة في اليوم؟',
    'ما هو عكس كلمة سريع؟',
    'كم صفر في المليون؟',
    'ما هو الحيوان الوطني لمصر؟'
  ];
  v_q_idx INTEGER := mod(extract(doy from now())::integer - 1, 8) + 1;
  v_attempts INTEGER;
BEGIN
  SELECT count(*) INTO v_attempts FROM public.brain_challenge_attempts WHERE user_id = v_user_id AND challenge_date = v_today;
  RETURN jsonb_build_object(
    'challenge_date', v_today,
    'question', v_questions[v_q_idx],
    'attempts_today', v_attempts,
    'attempts_remaining', greatest(0, 3 - v_attempts)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_daily_streak()
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today TEXT := to_char(now(), 'YYYY-MM-DD');
  v_yesterday TEXT := to_char(now() - interval '1 day', 'YYYY-MM-DD');
  v_current INTEGER := 0;
  v_longest INTEGER := 0;
  v_last TEXT;
  v_points INTEGER := 0;
  v_reward JSONB;
BEGIN
  SELECT current_streak, longest_streak, last_login_date INTO v_current, v_longest, v_last FROM public.user_streaks WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    v_current := 1; v_longest := 1; v_points := 5;
    INSERT INTO public.user_streaks (id, user_id, current_streak, longest_streak, last_login_date, streak_points)
    VALUES (gen_random_uuid()::text, v_user_id, v_current, v_longest, v_today, v_points);
  ELSIF v_last = v_today THEN
    RETURN jsonb_build_object('success', true, 'streak', v_current, 'points', 0, 'message', 'Already checked in today');
  ELSE
    v_current := CASE WHEN v_last = v_yesterday THEN v_current + 1 ELSE 1 END;
    v_longest := greatest(v_longest, v_current);
    v_points := CASE WHEN v_current >= 30 THEN 200 WHEN v_current >= 14 THEN 100 WHEN v_current >= 7 THEN 50 WHEN v_current >= 3 THEN 20 ELSE 5 END;
    UPDATE public.user_streaks SET current_streak = v_current, longest_streak = v_longest, last_login_date = v_today, streak_points = streak_points + v_points, updated_at = now() WHERE user_id = v_user_id;
  END IF;
  v_reward := public.grant_reward_points(v_user_id, v_points, 'daily_streak', 'daily_streak:' || v_today, v_today, jsonb_build_object('streak', v_current));
  RETURN jsonb_build_object('success', true, 'streak', v_current, 'points', (v_reward->>'points_awarded')::integer, 'message', 'Streak day ' || v_current || '!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.claim_lucky_spin()
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today TEXT := to_char(now(), 'YYYY-MM-DD');
  v_points INTEGER;
  v_rewards INTEGER[] := ARRAY[1, 2, 3, 5, 10, 15, 20, 25, 30, 50];
  v_reward JSONB;
BEGIN
  IF EXISTS (SELECT 1 FROM public.lucky_spin_claims WHERE user_id = v_user_id AND claimed_date = v_today) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already spun today! Come back tomorrow');
  END IF;
  v_points := v_rewards[floor(random() * array_length(v_rewards, 1))::integer + 1];
  INSERT INTO public.lucky_spin_claims (id, user_id, claimed_date, points_won, reward_type)
  VALUES (gen_random_uuid()::text, v_user_id, v_today, v_points, 'points');
  v_reward := public.grant_reward_points(v_user_id, v_points, 'lucky_spin', 'lucky_spin:' || v_today, v_today, jsonb_build_object('points_won', v_points));
  RETURN jsonb_build_object('success', true, 'points', (v_reward->>'points_awarded')::integer, 'total_points', (v_reward->>'total_points')::integer, 'message', 'You won ' || v_points || ' points!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.claim_mystery_box()
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today TEXT := to_char(now(), 'YYYY-MM-DD');
  v_last_claim TEXT;
  v_days_since INTEGER;
  v_reward_type TEXT;
  v_reward_value INTEGER;
  v_rand FLOAT;
  v_reward JSONB;
BEGIN
  SELECT claimed_date INTO v_last_claim FROM public.mystery_box_claims WHERE user_id = v_user_id ORDER BY claimed_date DESC LIMIT 1;
  IF v_last_claim IS NOT NULL THEN
    v_days_since := (v_today::date - v_last_claim::date);
    IF v_days_since < 3 THEN RETURN jsonb_build_object('success', false, 'days_remaining', 3 - v_days_since, 'message', 'Come back in ' || (3 - v_days_since) || ' days!'); END IF;
  END IF;
  v_rand := random();
  IF v_rand < 0.7 THEN v_reward_type := 'points'; v_reward_value := floor(random() * 40 + 10)::integer;
  ELSIF v_rand < 0.9 THEN v_reward_type := 'coins'; v_reward_value := floor(random() * 20 + 5)::integer;
  ELSE v_reward_type := 'points'; v_reward_value := 100; END IF;
  INSERT INTO public.mystery_box_claims (id, user_id, claimed_date, reward_type, reward_value)
  VALUES (gen_random_uuid()::text, v_user_id, v_today, v_reward_type, v_reward_value);
  IF v_reward_type = 'points' THEN
    v_reward := public.grant_reward_points(v_user_id, v_reward_value, 'mystery_box', 'mystery_box:' || v_today, v_today, jsonb_build_object('reward_type', v_reward_type));
  ELSE
    INSERT INTO public.user_reward_balances (user_id, points, coins, level)
    VALUES (v_user_id, 0, v_reward_value, 1)
    ON CONFLICT (user_id) DO UPDATE SET coins = public.user_reward_balances.coins + v_reward_value, updated_at = now();
    v_reward := jsonb_build_object('points_awarded', 0, 'total_points', (SELECT points FROM public.user_reward_balances WHERE user_id = v_user_id));
  END IF;
  RETURN jsonb_build_object('success', true, 'reward_type', v_reward_type, 'reward_value', v_reward_value, 'total_points', (v_reward->>'total_points')::integer, 'message', 'Mystery Box: ' || v_reward_value || ' ' || v_reward_type);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.submit_brain_challenge(p_answer TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today TEXT := to_char(now(), 'YYYY-MM-DD');
  v_correct_answer TEXT;
  v_question TEXT;
  v_is_correct BOOLEAN;
  v_attempts INTEGER;
  v_points INTEGER := 0;
  v_questions TEXT[] := ARRAY[
    'ما هو الجذر التربيعي لـ 144؟', 'كم عدد أضلاع المثلث؟', 'ما هو ناتج 7 × 8؟',
    'ما هو اللون الناتج من مزج الأحمر والأزرق؟', 'كم ساعة في اليوم؟', 'ما هو عكس كلمة سريع؟',
    'كم صفر في المليون؟', 'ما هو الحيوان الوطني لمصر؟'
  ];
  v_answers TEXT[] := ARRAY['12', '3', '56', 'أرجواني', '24', 'بطيء', '6', 'النسر'];
  v_q_idx INTEGER := mod(extract(doy from now())::integer - 1, 8) + 1;
  v_reward JSONB;
BEGIN
  v_question := v_questions[v_q_idx];
  v_correct_answer := v_answers[v_q_idx];
  SELECT count(*) INTO v_attempts FROM public.brain_challenge_attempts WHERE user_id = v_user_id AND challenge_date = v_today;
  IF v_attempts >= 3 THEN RETURN jsonb_build_object('success', false, 'message', 'Maximum 3 attempts per day'); END IF;
  v_is_correct := lower(trim(coalesce(p_answer, ''))) = lower(trim(v_correct_answer));
  IF v_is_correct THEN v_points := 20; END IF;
  INSERT INTO public.brain_challenge_attempts (id, user_id, challenge_date, question_text, answer_submitted, is_correct, points_earned, attempt_order)
  VALUES (gen_random_uuid()::text, v_user_id, v_today, v_question, p_answer, v_is_correct, v_points, v_attempts + 1);
  IF v_is_correct THEN
    v_reward := public.grant_reward_points(v_user_id, v_points, 'brain_challenge', 'brain_challenge:' || v_today || ':' || (v_attempts + 1)::text, v_today, jsonb_build_object('question', v_question));
  ELSE
    v_reward := jsonb_build_object('points_awarded', 0, 'total_points', (SELECT points FROM public.user_reward_balances WHERE user_id = v_user_id));
  END IF;
  RETURN jsonb_build_object('success', true, 'is_correct', v_is_correct, 'points', (v_reward->>'points_awarded')::integer, 'total_points', (v_reward->>'total_points')::integer, 'message', CASE WHEN v_is_correct THEN 'Correct! +20 points!' ELSE 'Not quite. Try another attempt.' END);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_daily_brain_challenge() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_daily_streak() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_lucky_spin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_mystery_box() TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_brain_challenge(TEXT) TO authenticated;
NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260822_rewards_integrity.sql

-- Integrity hardening for daily reward claims and canonical streak display.

CREATE UNIQUE INDEX IF NOT EXISTS lucky_spin_claims_user_day_idx
  ON public.lucky_spin_claims (user_id, claimed_date);

CREATE UNIQUE INDEX IF NOT EXISTS brain_challenge_attempts_user_day_order_idx
  ON public.brain_challenge_attempts (user_id, challenge_date, attempt_order);

CREATE OR REPLACE FUNCTION public.update_daily_streak()
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today TEXT := to_char(now(), 'YYYY-MM-DD');
  v_yesterday TEXT := to_char(now() - interval '1 day', 'YYYY-MM-DD');
  v_current INTEGER := 0;
  v_longest INTEGER := 0;
  v_last TEXT;
  v_points INTEGER := 0;
  v_reward JSONB;
BEGIN
  SELECT current_streak, longest_streak, last_login_date INTO v_current, v_longest, v_last FROM public.user_streaks WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    v_current := 1; v_longest := 1; v_points := 5;
    INSERT INTO public.user_streaks (id, user_id, current_streak, longest_streak, last_login_date, streak_points)
    VALUES (gen_random_uuid()::text, v_user_id, v_current, v_longest, v_today, v_points);
  ELSIF v_last = v_today THEN
    RETURN jsonb_build_object('success', true, 'streak', v_current, 'points', 0, 'message', 'Already checked in today');
  ELSE
    v_current := CASE WHEN v_last = v_yesterday THEN v_current + 1 ELSE 1 END;
    v_longest := greatest(v_longest, v_current);
    v_points := CASE WHEN v_current >= 30 THEN 200 WHEN v_current >= 14 THEN 100 WHEN v_current >= 7 THEN 50 WHEN v_current >= 3 THEN 20 ELSE 5 END;
    UPDATE public.user_streaks SET current_streak = v_current, longest_streak = v_longest, last_login_date = v_today, streak_points = streak_points + v_points, updated_at = now() WHERE user_id = v_user_id;
  END IF;
  v_reward := public.grant_reward_points(v_user_id, v_points, 'daily_streak', 'daily_streak:' || v_today, v_today, jsonb_build_object('streak', v_current));
  INSERT INTO public.user_reward_balances (user_id, points, daily_streak, last_daily_claim, level)
  VALUES (v_user_id, 0, v_current, v_today::date, public.reward_level_for_points(0))
  ON CONFLICT (user_id) DO UPDATE SET daily_streak = v_current, last_daily_claim = v_today::date, updated_at = now();
  RETURN jsonb_build_object('success', true, 'streak', v_current, 'points', (v_reward->>'points_awarded')::integer, 'message', 'Streak day ' || v_current || '!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260823_rewards_hardening.sql

-- Backend Guard hardening for reward RPCs and payment order input.
-- Client writes are limited to RPCs; balances and approvals remain server-controlled.

DROP POLICY IF EXISTS reward_store_orders_own_insert ON public.reward_store_orders;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reward_store_orders_payment_reference_length') THEN
    ALTER TABLE public.reward_store_orders ADD CONSTRAINT reward_store_orders_payment_reference_length CHECK (payment_reference IS NULL OR length(payment_reference) <= 200);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reward_store_orders_receipt_length') THEN
    ALTER TABLE public.reward_store_orders ADD CONSTRAINT reward_store_orders_receipt_length CHECK (receipt_url IS NULL OR length(receipt_url) <= 1500000);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reward_store_orders_notes_length') THEN
    ALTER TABLE public.reward_store_orders ADD CONSTRAINT reward_store_orders_notes_length CHECK (notes IS NULL OR length(notes) <= 1000);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS mystery_box_claims_user_day_idx
  ON public.mystery_box_claims (user_id, claimed_date);

CREATE OR REPLACE FUNCTION public.purchase_reward_item(p_item_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_item public.reward_store_items%ROWTYPE;
  v_user public.users%ROWTYPE;
  v_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_item_id IS NULL OR length(trim(p_item_id)) = 0 OR length(p_item_id) > 100 THEN RAISE EXCEPTION 'Invalid store item'; END IF;
  SELECT * INTO v_item FROM public.reward_store_items WHERE id = trim(p_item_id) AND is_active = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Store item not found'; END IF;
  IF v_item.item_type <> 'frame' AND v_item.item_type <> 'cosmetic' THEN RAISE EXCEPTION 'This item requires a payment order'; END IF;
  SELECT * INTO v_user FROM public.users WHERE uid = v_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User profile not found'; END IF;
  IF public.reward_plan_rank(v_user.plan_name) < public.reward_plan_rank(v_item.min_plan) THEN RAISE EXCEPTION 'This item requires a higher membership plan'; END IF;
  IF EXISTS (SELECT 1 FROM public.reward_inventory WHERE user_id = v_user_id AND item_id = v_item.id AND is_active = true) THEN
    RETURN jsonb_build_object('success', false, 'already_owned', true, 'item_id', v_item.id);
  END IF;

  SELECT points INTO v_balance FROM public.user_reward_balances WHERE user_id = v_user_id FOR UPDATE;
  v_balance := COALESCE(v_balance, 0);
  IF v_item.price_points > v_balance THEN RAISE EXCEPTION 'Not enough points'; END IF;
  v_new_balance := v_balance - v_item.price_points;

  INSERT INTO public.user_reward_balances (user_id, points, level)
  VALUES (v_user_id, v_new_balance, public.reward_level_for_points(v_new_balance))
  ON CONFLICT (user_id) DO UPDATE SET points = EXCLUDED.points, level = EXCLUDED.level, updated_at = now();

  IF v_item.price_points > 0 THEN
    INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id, metadata)
    VALUES (v_user_id, -v_item.price_points, 'store_purchase', 'store_purchase:' || gen_random_uuid()::text, v_item.id, jsonb_build_object('item_id', v_item.id, 'item_name', v_item.name));
  END IF;

  INSERT INTO public.reward_inventory (user_id, item_id, quantity, source)
  VALUES (v_user_id, v_item.id, 1, CASE WHEN v_item.price_points = 0 THEN 'diamond_membership' ELSE 'points_purchase' END);
  RETURN jsonb_build_object('success', true, 'item_id', v_item.id, 'points_spent', v_item.price_points, 'total_points', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.create_reward_points_order(p_item_id TEXT, p_payment_method TEXT, p_payment_reference TEXT DEFAULT NULL, p_receipt_url TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_item public.reward_store_items%ROWTYPE;
  v_order public.reward_store_orders%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_item_id IS NULL OR length(trim(p_item_id)) = 0 OR length(p_item_id) > 100 THEN RAISE EXCEPTION 'Invalid store item'; END IF;
  IF p_payment_method NOT IN ('vodafone_cash', 'instapay') THEN RAISE EXCEPTION 'Unsupported payment method'; END IF;
  IF p_payment_reference IS NOT NULL AND length(trim(p_payment_reference)) > 200 THEN RAISE EXCEPTION 'Payment reference is too long'; END IF;
  IF p_receipt_url IS NOT NULL AND length(p_receipt_url) > 1500000 THEN RAISE EXCEPTION 'Receipt is too large'; END IF;
  SELECT * INTO v_item FROM public.reward_store_items WHERE id = trim(p_item_id) AND is_active = true AND item_type = 'points_bundle';
  IF NOT FOUND THEN RAISE EXCEPTION 'Points bundle not found'; END IF;
  INSERT INTO public.reward_store_orders (user_id, item_id, order_type, amount_points, amount_egp, payment_method, payment_reference, receipt_url)
  VALUES (v_user_id, v_item.id, 'points_purchase', v_item.reward_points, v_item.price_egp, p_payment_method, NULLIF(trim(p_payment_reference), ''), p_receipt_url)
  RETURNING * INTO v_order;
  RETURN jsonb_build_object('success', true, 'order_id', v_order.id, 'status', v_order.status, 'amount_egp', v_order.amount_egp, 'reward_points', v_item.reward_points);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_daily_brain_challenge()
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today TEXT := to_char(now(), 'YYYY-MM-DD');
  v_questions TEXT[] := ARRAY[
    'ما هو الجذر التربيعي لـ 144؟', 'كم عدد أضلاع المثلث؟', 'ما هو ناتج 7 × 8؟',
    'ما هو اللون الناتج من مزج الأحمر والأزرق؟', 'كم ساعة في اليوم؟', 'ما هو عكس كلمة سريع؟',
    'كم صفر في المليون؟', 'ما هو الحيوان الوطني لمصر؟'
  ];
  v_q_idx INTEGER := mod(extract(doy from now())::integer - 1, 8) + 1;
  v_attempts INTEGER;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT count(*) INTO v_attempts FROM public.brain_challenge_attempts WHERE user_id = v_user_id AND challenge_date = v_today;
  RETURN jsonb_build_object('challenge_date', v_today, 'question', v_questions[v_q_idx], 'attempts_today', v_attempts, 'attempts_remaining', greatest(0, 3 - v_attempts));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_daily_streak()
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today TEXT := to_char(now(), 'YYYY-MM-DD');
  v_yesterday TEXT := to_char(now() - interval '1 day', 'YYYY-MM-DD');
  v_current INTEGER := 0;
  v_longest INTEGER := 0;
  v_last TEXT;
  v_points INTEGER := 0;
  v_reward JSONB;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT current_streak, longest_streak, last_login_date INTO v_current, v_longest, v_last FROM public.user_streaks WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN
    v_current := 1; v_longest := 1; v_points := 5;
    INSERT INTO public.user_streaks (id, user_id, current_streak, longest_streak, last_login_date, streak_points) VALUES (gen_random_uuid()::text, v_user_id, v_current, v_longest, v_today, v_points);
  ELSIF v_last = v_today THEN
    RETURN jsonb_build_object('success', true, 'streak', v_current, 'points', 0, 'message', 'Already checked in today');
  ELSE
    v_current := CASE WHEN v_last = v_yesterday THEN v_current + 1 ELSE 1 END;
    v_longest := greatest(v_longest, v_current);
    v_points := CASE WHEN v_current >= 30 THEN 200 WHEN v_current >= 14 THEN 100 WHEN v_current >= 7 THEN 50 WHEN v_current >= 3 THEN 20 ELSE 5 END;
    UPDATE public.user_streaks SET current_streak = v_current, longest_streak = v_longest, last_login_date = v_today, streak_points = streak_points + v_points, updated_at = now() WHERE user_id = v_user_id;
  END IF;
  v_reward := public.grant_reward_points(v_user_id, v_points, 'daily_streak', 'daily_streak:' || v_today, v_today, jsonb_build_object('streak', v_current));
  INSERT INTO public.user_reward_balances (user_id, points, daily_streak, last_daily_claim, level)
  VALUES (v_user_id, 0, v_current, v_today::date, public.reward_level_for_points(0))
  ON CONFLICT (user_id) DO UPDATE SET daily_streak = v_current, last_daily_claim = v_today::date, updated_at = now();
  RETURN jsonb_build_object('success', true, 'streak', v_current, 'points', (v_reward->>'points_awarded')::integer, 'message', 'Streak day ' || v_current || '!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.claim_lucky_spin()
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today TEXT := to_char(now(), 'YYYY-MM-DD');
  v_points INTEGER;
  v_rows INTEGER;
  v_rewards INTEGER[] := ARRAY[1, 2, 3, 5, 10, 15, 20, 25, 30, 50];
  v_reward JSONB;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  v_points := v_rewards[floor(random() * array_length(v_rewards, 1))::integer + 1];
  INSERT INTO public.lucky_spin_claims (id, user_id, claimed_date, points_won, reward_type)
  VALUES (gen_random_uuid()::text, v_user_id, v_today, v_points, 'points') ON CONFLICT (user_id, claimed_date) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RETURN jsonb_build_object('success', false, 'message', 'Already spun today! Come back tomorrow'); END IF;
  v_reward := public.grant_reward_points(v_user_id, v_points, 'lucky_spin', 'lucky_spin:' || v_today, v_today, jsonb_build_object('points_won', v_points));
  RETURN jsonb_build_object('success', true, 'points', (v_reward->>'points_awarded')::integer, 'total_points', (v_reward->>'total_points')::integer, 'message', 'You won ' || v_points || ' points!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.claim_mystery_box()
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today TEXT := to_char(now(), 'YYYY-MM-DD');
  v_last_claim TEXT;
  v_days_since INTEGER;
  v_reward_type TEXT;
  v_reward_value INTEGER;
  v_rand FLOAT;
  v_reward JSONB;
  v_rows INTEGER;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT claimed_date INTO v_last_claim FROM public.mystery_box_claims WHERE user_id = v_user_id ORDER BY claimed_date DESC LIMIT 1;
  IF v_last_claim IS NOT NULL THEN
    v_days_since := (v_today::date - v_last_claim::date);
    IF v_days_since < 3 THEN RETURN jsonb_build_object('success', false, 'days_remaining', 3 - v_days_since, 'message', 'Come back in ' || (3 - v_days_since) || ' days!'); END IF;
  END IF;
  v_rand := random();
  IF v_rand < 0.7 THEN v_reward_type := 'points'; v_reward_value := floor(random() * 40 + 10)::integer;
  ELSIF v_rand < 0.9 THEN v_reward_type := 'coins'; v_reward_value := floor(random() * 20 + 5)::integer;
  ELSE v_reward_type := 'points'; v_reward_value := 100; END IF;
  INSERT INTO public.mystery_box_claims (id, user_id, claimed_date, reward_type, reward_value) VALUES (gen_random_uuid()::text, v_user_id, v_today, v_reward_type, v_reward_value) ON CONFLICT (user_id, claimed_date) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RETURN jsonb_build_object('success', false, 'message', 'Mystery Box already claimed'); END IF;
  IF v_reward_type = 'points' THEN
    v_reward := public.grant_reward_points(v_user_id, v_reward_value, 'mystery_box', 'mystery_box:' || v_today, v_today, jsonb_build_object('reward_type', v_reward_type));
  ELSE
    INSERT INTO public.user_reward_balances (user_id, points, coins, level) VALUES (v_user_id, 0, v_reward_value, 1)
    ON CONFLICT (user_id) DO UPDATE SET coins = public.user_reward_balances.coins + v_reward_value, updated_at = now();
    v_reward := jsonb_build_object('points_awarded', 0, 'total_points', (SELECT points FROM public.user_reward_balances WHERE user_id = v_user_id));
  END IF;
  RETURN jsonb_build_object('success', true, 'reward_type', v_reward_type, 'reward_value', v_reward_value, 'total_points', (v_reward->>'total_points')::integer, 'message', 'Mystery Box: ' || v_reward_value || ' ' || v_reward_type);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.submit_brain_challenge(p_answer TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today TEXT := to_char(now(), 'YYYY-MM-DD');
  v_correct_answer TEXT;
  v_question TEXT;
  v_is_correct BOOLEAN;
  v_attempts INTEGER;
  v_points INTEGER := 0;
  v_questions TEXT[] := ARRAY['ما هو الجذر التربيعي لـ 144؟', 'كم عدد أضلاع المثلث؟', 'ما هو ناتج 7 × 8؟', 'ما هو اللون الناتج من مزج الأحمر والأزرق؟', 'كم ساعة في اليوم؟', 'ما هو عكس كلمة سريع؟', 'كم صفر في المليون؟', 'ما هو الحيوان الوطني لمصر؟'];
  v_answers TEXT[] := ARRAY['12', '3', '56', 'أرجواني', '24', 'بطيء', '6', 'النسر'];
  v_q_idx INTEGER := mod(extract(doy from now())::integer - 1, 8) + 1;
  v_reward JSONB;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_answer IS NULL OR length(trim(p_answer)) = 0 OR length(p_answer) > 300 THEN RAISE EXCEPTION 'Invalid answer'; END IF;
  v_question := v_questions[v_q_idx]; v_correct_answer := v_answers[v_q_idx];
  SELECT count(*) INTO v_attempts FROM public.brain_challenge_attempts WHERE user_id = v_user_id AND challenge_date = v_today;
  IF v_attempts >= 3 THEN RETURN jsonb_build_object('success', false, 'message', 'Maximum 3 attempts per day'); END IF;
  v_is_correct := lower(trim(p_answer)) = lower(trim(v_correct_answer));
  IF v_is_correct THEN v_points := 20; END IF;
  INSERT INTO public.brain_challenge_attempts (id, user_id, challenge_date, question_text, answer_submitted, is_correct, points_earned, attempt_order) VALUES (gen_random_uuid()::text, v_user_id, v_today, v_question, trim(p_answer), v_is_correct, v_points, v_attempts + 1);
  IF v_is_correct THEN
    v_reward := public.grant_reward_points(v_user_id, v_points, 'brain_challenge', 'brain_challenge:' || v_today || ':' || (v_attempts + 1)::text, v_today, jsonb_build_object('question', v_question));
  ELSE
    v_reward := jsonb_build_object('points_awarded', 0, 'total_points', (SELECT points FROM public.user_reward_balances WHERE user_id = v_user_id));
  END IF;
  RETURN jsonb_build_object('success', true, 'is_correct', v_is_correct, 'points', (v_reward->>'points_awarded')::integer, 'total_points', (v_reward->>'total_points')::integer, 'message', CASE WHEN v_is_correct THEN 'Correct! +20 points!' ELSE 'Not quite. Try another attempt.' END);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.admin_grant_reward_points(p_user_id TEXT, p_points INTEGER, p_note TEXT DEFAULT '')
RETURNS JSONB AS $$
DECLARE
  v_admin public.users%ROWTYPE;
  v_new_balance INTEGER;
BEGIN
  SELECT * INTO v_admin FROM public.users WHERE uid = auth.uid()::text AND is_admin = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_user_id IS NULL OR length(trim(p_user_id)) = 0 OR length(p_user_id) > 100 THEN RAISE EXCEPTION 'Invalid user'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE uid = trim(p_user_id)) THEN RAISE EXCEPTION 'User not found'; END IF;
  IF p_points <= 0 OR p_points > 1000000 THEN RAISE EXCEPTION 'Invalid points amount'; END IF;
  IF p_note IS NOT NULL AND length(p_note) > 500 THEN RAISE EXCEPTION 'Note is too long'; END IF;
  INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id, metadata) VALUES (trim(p_user_id), p_points, 'admin_grant', 'admin_grant:' || gen_random_uuid()::text, trim(p_user_id), jsonb_build_object('note', coalesce(p_note, ''), 'admin_id', v_admin.uid));
  INSERT INTO public.user_reward_balances (user_id, points, level) VALUES (trim(p_user_id), p_points, public.reward_level_for_points(p_points)) ON CONFLICT (user_id) DO UPDATE SET points = public.user_reward_balances.points + p_points, level = public.reward_level_for_points(public.user_reward_balances.points + p_points), updated_at = now() RETURNING points INTO v_new_balance;
  RETURN jsonb_build_object('success', true, 'user_id', trim(p_user_id), 'points_added', p_points, 'total_points', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.admin_review_reward_order(p_order_id UUID, p_status TEXT, p_note TEXT DEFAULT '')
RETURNS JSONB AS $$
DECLARE
  v_admin public.users%ROWTYPE;
  v_order public.reward_store_orders%ROWTYPE;
  v_item public.reward_store_items%ROWTYPE;
  v_new_balance INTEGER;
BEGIN
  SELECT * INTO v_admin FROM public.users WHERE uid = auth.uid()::text AND is_admin = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_status NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'Invalid review status'; END IF;
  IF p_note IS NOT NULL AND length(p_note) > 1000 THEN RAISE EXCEPTION 'Note is too long'; END IF;
  SELECT * INTO v_order FROM public.reward_store_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.status <> 'pending' THEN RETURN jsonb_build_object('success', false, 'status', v_order.status); END IF;
  UPDATE public.reward_store_orders SET status = p_status, notes = NULLIF(p_note, ''), approved_by = v_admin.uid, updated_at = now() WHERE id = p_order_id;
  IF p_status = 'rejected' THEN RETURN jsonb_build_object('success', true, 'status', 'rejected'); END IF;
  SELECT * INTO v_item FROM public.reward_store_items WHERE id = v_order.item_id;
  INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id, metadata) VALUES (v_order.user_id, v_item.reward_points, 'points_purchase', 'reward_order:' || v_order.id::text, v_order.id::text, jsonb_build_object('item_id', v_item.id, 'payment_method', v_order.payment_method, 'amount_egp', v_order.amount_egp)) ON CONFLICT (user_id, event_key) DO NOTHING;
  INSERT INTO public.user_reward_balances (user_id, points, level) VALUES (v_order.user_id, v_item.reward_points, public.reward_level_for_points(v_item.reward_points)) ON CONFLICT (user_id) DO UPDATE SET points = public.user_reward_balances.points + v_item.reward_points, level = public.reward_level_for_points(public.user_reward_balances.points + v_item.reward_points), updated_at = now() RETURNING points INTO v_new_balance;
  RETURN jsonb_build_object('success', true, 'status', 'approved', 'points_added', v_item.reward_points, 'total_points', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.grant_reward_points(TEXT, INTEGER, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purchase_reward_item(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_reward_points_order(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_daily_brain_challenge() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_daily_streak() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_lucky_spin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_mystery_box() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_brain_challenge(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_grant_reward_points(TEXT, INTEGER, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_review_reward_order(UUID, TEXT, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.purchase_reward_item(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_reward_points_order(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_brain_challenge() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_daily_streak() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_lucky_spin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_mystery_box() TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_brain_challenge(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_reward_points(TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_reward_order(UUID, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260824160000_guest_quiz_attempts.sql

-- Anonymous quiz attempts are stored separately from authenticated user profiles.
-- They contribute to public play counts and leaderboards, but never receive XP.
CREATE TABLE IF NOT EXISTS public.guest_quiz_attempts (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  guest_id TEXT NOT NULL CHECK (guest_id ~ '^user-guest-[A-HJ-NP-Z2-9]{6}$'),
  guest_name TEXT NOT NULL CHECK (char_length(trim(guest_name)) BETWEEN 1 AND 120),
  score INTEGER NOT NULL CHECK (score >= 0),
  total_questions INTEGER NOT NULL CHECK (total_questions > 0),
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  feedback TEXT NOT NULL DEFAULT '' CHECK (char_length(feedback) <= 2000),
  attempt_number INTEGER NOT NULL DEFAULT 1 CHECK (attempt_number > 0),
  is_best BOOLEAN NOT NULL DEFAULT false,
  client_attempt_key TEXT NOT NULL CHECK (char_length(client_attempt_key) BETWEEN 16 AND 120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (guest_id, quiz_id, client_attempt_key)
);
CREATE INDEX IF NOT EXISTS guest_quiz_attempts_quiz_idx ON public.guest_quiz_attempts (quiz_id, created_at DESC);
CREATE INDEX IF NOT EXISTS guest_quiz_attempts_guest_quiz_idx ON public.guest_quiz_attempts (guest_id, quiz_id, attempt_number DESC);
ALTER TABLE public.guest_quiz_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS guest_quiz_attempts_direct_read ON public.guest_quiz_attempts;
DROP POLICY IF EXISTS guest_quiz_attempts_direct_insert ON public.guest_quiz_attempts;
DROP POLICY IF EXISTS guest_quiz_attempts_direct_update ON public.guest_quiz_attempts;
DROP POLICY IF EXISTS guest_quiz_attempts_direct_delete ON public.guest_quiz_attempts;

CREATE OR REPLACE FUNCTION public.sync_quiz_total_plays()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_quiz_id TEXT := COALESCE(NEW.quiz_id, OLD.quiz_id);
BEGIN
  UPDATE public.quizzes SET total_plays =
    (SELECT COUNT(*)::INTEGER FROM public.completions WHERE quiz_id = target_quiz_id) +
    (SELECT COUNT(*)::INTEGER FROM public.guest_quiz_attempts WHERE quiz_id = target_quiz_id)
  WHERE id = target_quiz_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS guest_quiz_attempts_sync_quiz_total_plays ON public.guest_quiz_attempts;
CREATE TRIGGER guest_quiz_attempts_sync_quiz_total_plays
AFTER INSERT OR DELETE ON public.guest_quiz_attempts FOR EACH ROW EXECUTE FUNCTION public.sync_quiz_total_plays();

CREATE OR REPLACE FUNCTION public.submit_guest_quiz_attempt(
  p_quiz_id TEXT, p_guest_id TEXT, p_guest_name TEXT, p_score INTEGER,
  p_client_attempt_key TEXT, p_rating INTEGER DEFAULT NULL, p_feedback TEXT DEFAULT ''
)
RETURNS TABLE(id TEXT, quiz_id TEXT, taker_id TEXT, taker_name TEXT, score INTEGER,
              total_questions INTEGER, rating INTEGER, feedback TEXT, created_at TIMESTAMPTZ,
              attempt_number INTEGER, is_best BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id TEXT;
  v_total_questions INTEGER;
  v_attempt_number INTEGER;
  v_previous_best INTEGER;
  v_score INTEGER := COALESCE(p_score, -1);
  v_inserted BOOLEAN := false;
  v_name TEXT := trim(COALESCE(p_guest_name, ''));
BEGIN
  IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Guest submission requires an anonymous session'; END IF;
  IF p_quiz_id IS NULL OR char_length(trim(p_quiz_id)) = 0 OR char_length(p_quiz_id) > 200 THEN RAISE EXCEPTION 'Invalid quiz'; END IF;
  IF p_guest_id IS NULL OR p_guest_id !~ '^user-guest-[A-HJ-NP-Z2-9]{6}$' THEN RAISE EXCEPTION 'Invalid guest identity'; END IF;
  IF char_length(v_name) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Invalid guest name'; END IF;
  IF p_client_attempt_key IS NULL OR char_length(p_client_attempt_key) NOT BETWEEN 16 AND 120 THEN RAISE EXCEPTION 'Invalid attempt key'; END IF;
  IF p_rating IS NOT NULL AND (p_rating < 1 OR p_rating > 5) THEN RAISE EXCEPTION 'Invalid rating'; END IF;
  IF char_length(COALESCE(p_feedback, '')) > 2000 THEN RAISE EXCEPTION 'Feedback is too long'; END IF;
  SELECT COALESCE(jsonb_array_length(q.questions), 0) INTO v_total_questions
    FROM public.quizzes q WHERE q.id = p_quiz_id FOR SHARE;
  IF NOT FOUND OR v_total_questions <= 0 THEN RAISE EXCEPTION 'Quiz not found'; END IF;
  IF v_score < 0 OR v_score > v_total_questions THEN RAISE EXCEPTION 'Invalid score'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_guest_id || ':' || p_quiz_id, 0));
  SELECT g.id INTO v_id FROM public.guest_quiz_attempts g
   WHERE g.guest_id = p_guest_id AND g.quiz_id = p_quiz_id AND g.client_attempt_key = p_client_attempt_key LIMIT 1;
  IF v_id IS NULL THEN
    SELECT COUNT(*)::INTEGER, COALESCE(MAX(g.score), 0) INTO v_attempt_number, v_previous_best
      FROM public.guest_quiz_attempts g WHERE g.quiz_id = p_quiz_id AND g.guest_id = p_guest_id;
    v_attempt_number := v_attempt_number + 1;
    v_id := 'guestcomp_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 10);
    INSERT INTO public.guest_quiz_attempts
      (id, quiz_id, guest_id, guest_name, score, total_questions, rating, feedback, attempt_number, is_best, client_attempt_key)
    VALUES
      (v_id, p_quiz_id, p_guest_id, v_name, v_score, v_total_questions, p_rating, COALESCE(p_feedback, ''),
       v_attempt_number, (v_attempt_number = 1 OR v_score > v_previous_best), p_client_attempt_key);
    v_inserted := true;
  ELSE
    UPDATE public.guest_quiz_attempts AS existing_attempt
       SET rating = COALESCE(p_rating, existing_attempt.rating),
           feedback = CASE WHEN char_length(COALESCE(p_feedback, '')) > 0 THEN p_feedback ELSE existing_attempt.feedback END,
           guest_name = v_name
     WHERE existing_attempt.id = v_id;
  END IF;
  IF v_inserted THEN
    UPDATE public.guest_quiz_attempts current_attempt SET is_best = false
     WHERE current_attempt.quiz_id = p_quiz_id AND current_attempt.guest_id = p_guest_id AND current_attempt.id <> v_id
       AND current_attempt.score < (SELECT new_attempt.score FROM public.guest_quiz_attempts new_attempt WHERE new_attempt.id = v_id);
  END IF;
  RETURN QUERY SELECT g.id, g.quiz_id, g.guest_id, g.guest_name, g.score, g.total_questions,
    g.rating, g.feedback, g.created_at, g.attempt_number, g.is_best
    FROM public.guest_quiz_attempts g WHERE g.id = v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_guest_quiz_attempt_review(
  p_completion_id TEXT, p_guest_id TEXT, p_rating INTEGER, p_feedback TEXT DEFAULT ''
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Guest review requires an anonymous session'; END IF;
  IF p_completion_id IS NULL OR p_guest_id IS NULL OR p_guest_id !~ '^user-guest-[A-HJ-NP-Z2-9]{6}$' THEN RAISE EXCEPTION 'Invalid guest identity'; END IF;
  IF p_rating < 1 OR p_rating > 5 OR char_length(COALESCE(p_feedback, '')) > 2000 THEN RAISE EXCEPTION 'Invalid review'; END IF;
  UPDATE public.guest_quiz_attempts SET rating = p_rating, feedback = COALESCE(p_feedback, '')
   WHERE id = p_completion_id AND guest_id = p_guest_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_completions_by_quiz(p_quiz_id TEXT)
RETURNS TABLE(id TEXT, quiz_id TEXT, quiz_title TEXT, taker_id TEXT, taker_name TEXT, score INTEGER,
              total_questions INTEGER, rating INTEGER, created_at TIMESTAMPTZ, attempt_number INTEGER, is_best BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.quiz_id, c.quiz_title, c.taker_id, c.taker_name, c.score, c.total_questions, c.rating, c.created_at, c.attempt_number, c.is_best
    FROM public.completions c WHERE c.quiz_id = p_quiz_id
  UNION ALL
  SELECT g.id, g.quiz_id, q.title, g.guest_id, g.guest_name, g.score, g.total_questions, g.rating, g.created_at, g.attempt_number, g.is_best
    FROM public.guest_quiz_attempts g JOIN public.quizzes q ON q.id = g.quiz_id WHERE g.quiz_id = p_quiz_id
  ORDER BY created_at DESC LIMIT 500;
$$;

CREATE OR REPLACE FUNCTION public.get_public_recent_completions(p_limit INTEGER DEFAULT 10)
RETURNS TABLE(id TEXT, quiz_id TEXT, quiz_title TEXT, taker_id TEXT, taker_name TEXT, score INTEGER,
              total_questions INTEGER, rating INTEGER, created_at TIMESTAMPTZ, attempt_number INTEGER, is_best BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT x.id, x.quiz_id, x.quiz_title, x.taker_id, x.taker_name, x.score, x.total_questions, x.rating, x.created_at, x.attempt_number, x.is_best
    FROM (
      SELECT c.id, c.quiz_id, c.quiz_title, c.taker_id, c.taker_name, c.score, c.total_questions, c.rating, c.created_at, c.attempt_number, c.is_best FROM public.completions c
      UNION ALL
      SELECT g.id, g.quiz_id, q.title, g.guest_id, g.guest_name, g.score, g.total_questions, g.rating, g.created_at, g.attempt_number, g.is_best FROM public.guest_quiz_attempts g JOIN public.quizzes q ON q.id = g.quiz_id
    ) x ORDER BY x.created_at DESC LIMIT LEAST(50, GREATEST(1, COALESCE(p_limit, 10)));
$$;

CREATE OR REPLACE FUNCTION public.get_public_best_score(p_quiz_id TEXT)
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT GREATEST(COALESCE((SELECT MAX(c.score) FROM public.completions c WHERE c.quiz_id = p_quiz_id), 0), COALESCE((SELECT MAX(g.score) FROM public.guest_quiz_attempts g WHERE g.quiz_id = p_quiz_id), 0))::INTEGER;
$$;

CREATE OR REPLACE FUNCTION public.get_quiz_takers_unique(p_quiz_id TEXT)
RETURNS TABLE(taker_id TEXT, taker_name TEXT, best_score INTEGER, total_questions INTEGER, attempts_count INTEGER, last_attempt_at TIMESTAMPTZ, rating INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT x.taker_id, x.taker_name, MAX(x.score)::INTEGER, MAX(x.total_questions)::INTEGER, COUNT(*)::INTEGER, MAX(x.created_at),
         (ARRAY_AGG(x.rating ORDER BY x.created_at DESC) FILTER (WHERE x.rating IS NOT NULL))[1]
    FROM (
      SELECT c.taker_id, c.taker_name, c.score, c.total_questions, c.created_at, c.rating FROM public.completions c WHERE c.quiz_id = p_quiz_id
      UNION ALL
      SELECT g.guest_id, g.guest_name, g.score, g.total_questions, g.created_at, g.rating FROM public.guest_quiz_attempts g WHERE g.quiz_id = p_quiz_id
    ) x GROUP BY x.taker_id, x.taker_name;
$$;

CREATE OR REPLACE FUNCTION public.get_site_stats()
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'total_quizzes', (SELECT COUNT(*) FROM public.quizzes),
    'total_completions', (SELECT COUNT(*) FROM public.completions) + (SELECT COUNT(*) FROM public.guest_quiz_attempts),
    'total_users', (SELECT COUNT(*) FROM public.users),
    'quizzes_today', (SELECT COUNT(*) FROM public.quizzes WHERE created_at::date = CURRENT_DATE),
    'completions_today', (SELECT COUNT(*) FROM public.completions WHERE created_at::date = CURRENT_DATE) + (SELECT COUNT(*) FROM public.guest_quiz_attempts WHERE created_at::date = CURRENT_DATE),
    'top_quiz_today', COALESCE((SELECT jsonb_build_object('id', id, 'title', title, 'plays', total_plays) FROM public.quizzes ORDER BY total_plays DESC LIMIT 1), 'null'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.submit_guest_quiz_attempt(text, text, text, integer, text, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_guest_quiz_attempt_review(text, text, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_completions_by_quiz(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_recent_completions(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_best_score(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_quiz_takers_unique(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_site_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_guest_quiz_attempt(text, text, text, integer, text, integer, text) TO anon;
GRANT EXECUTE ON FUNCTION public.update_guest_quiz_attempt_review(text, text, integer, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_completions_by_quiz(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_recent_completions(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_best_score(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_quiz_takers_unique(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_site_stats() TO anon, authenticated;

UPDATE public.quizzes q SET total_plays =
  (SELECT COUNT(*)::INTEGER FROM public.completions c WHERE c.quiz_id = q.id) +
  (SELECT COUNT(*)::INTEGER FROM public.guest_quiz_attempts g WHERE g.quiz_id = q.id);
NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260824163000_fix_guest_attempt_retry_idempotency.sql

-- Fix the idempotent retry branch of the guest quiz attempt RPC.
-- The explicit table alias avoids ambiguity with the RETURNS TABLE(id ...) output variable.
CREATE OR REPLACE FUNCTION public.submit_guest_quiz_attempt(
  p_quiz_id TEXT, p_guest_id TEXT, p_guest_name TEXT, p_score INTEGER,
  p_client_attempt_key TEXT, p_rating INTEGER DEFAULT NULL, p_feedback TEXT DEFAULT ''
)
RETURNS TABLE(id TEXT, quiz_id TEXT, taker_id TEXT, taker_name TEXT, score INTEGER,
              total_questions INTEGER, rating INTEGER, feedback TEXT, created_at TIMESTAMPTZ,
              attempt_number INTEGER, is_best BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id TEXT;
  v_total_questions INTEGER;
  v_attempt_number INTEGER;
  v_previous_best INTEGER;
  v_score INTEGER := COALESCE(p_score, -1);
  v_inserted BOOLEAN := false;
  v_name TEXT := trim(COALESCE(p_guest_name, ''));
BEGIN
  IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Guest submission requires an anonymous session'; END IF;
  IF p_quiz_id IS NULL OR char_length(trim(p_quiz_id)) = 0 OR char_length(p_quiz_id) > 200 THEN RAISE EXCEPTION 'Invalid quiz'; END IF;
  IF p_guest_id IS NULL OR p_guest_id !~ '^user-guest-[A-HJ-NP-Z2-9]{6}$' THEN RAISE EXCEPTION 'Invalid guest identity'; END IF;
  IF char_length(v_name) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Invalid guest name'; END IF;
  IF p_client_attempt_key IS NULL OR char_length(p_client_attempt_key) NOT BETWEEN 16 AND 120 THEN RAISE EXCEPTION 'Invalid attempt key'; END IF;
  IF p_rating IS NOT NULL AND (p_rating < 1 OR p_rating > 5) THEN RAISE EXCEPTION 'Invalid rating'; END IF;
  IF char_length(COALESCE(p_feedback, '')) > 2000 THEN RAISE EXCEPTION 'Feedback is too long'; END IF;
  SELECT COALESCE(jsonb_array_length(q.questions), 0) INTO v_total_questions
    FROM public.quizzes q WHERE q.id = p_quiz_id FOR SHARE;
  IF NOT FOUND OR v_total_questions <= 0 THEN RAISE EXCEPTION 'Quiz not found'; END IF;
  IF v_score < 0 OR v_score > v_total_questions THEN RAISE EXCEPTION 'Invalid score'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_guest_id || ':' || p_quiz_id, 0));
  SELECT g.id INTO v_id FROM public.guest_quiz_attempts g
   WHERE g.guest_id = p_guest_id AND g.quiz_id = p_quiz_id AND g.client_attempt_key = p_client_attempt_key LIMIT 1;
  IF v_id IS NULL THEN
    SELECT COUNT(*)::INTEGER, COALESCE(MAX(g.score), 0) INTO v_attempt_number, v_previous_best
      FROM public.guest_quiz_attempts g WHERE g.quiz_id = p_quiz_id AND g.guest_id = p_guest_id;
    v_attempt_number := v_attempt_number + 1;
    v_id := 'guestcomp_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 10);
    INSERT INTO public.guest_quiz_attempts
      (id, quiz_id, guest_id, guest_name, score, total_questions, rating, feedback, attempt_number, is_best, client_attempt_key)
    VALUES
      (v_id, p_quiz_id, p_guest_id, v_name, v_score, v_total_questions, p_rating, COALESCE(p_feedback, ''),
       v_attempt_number, (v_attempt_number = 1 OR v_score > v_previous_best), p_client_attempt_key);
    v_inserted := true;
  ELSE
    UPDATE public.guest_quiz_attempts AS existing_attempt
       SET rating = COALESCE(p_rating, existing_attempt.rating),
           feedback = CASE WHEN char_length(COALESCE(p_feedback, '')) > 0 THEN p_feedback ELSE existing_attempt.feedback END,
           guest_name = v_name
     WHERE existing_attempt.id = v_id;
  END IF;
  IF v_inserted THEN
    UPDATE public.guest_quiz_attempts current_attempt SET is_best = false
     WHERE current_attempt.quiz_id = p_quiz_id AND current_attempt.guest_id = p_guest_id AND current_attempt.id <> v_id
       AND current_attempt.score < (SELECT new_attempt.score FROM public.guest_quiz_attempts new_attempt WHERE new_attempt.id = v_id);
  END IF;
  RETURN QUERY SELECT g.id, g.quiz_id, g.guest_id, g.guest_name, g.score, g.total_questions,
    g.rating, g.feedback, g.created_at, g.attempt_number, g.is_best
    FROM public.guest_quiz_attempts g WHERE g.id = v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_guest_quiz_attempt(text, text, text, integer, text, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_guest_quiz_attempt(text, text, text, integer, text, integer, text) TO anon;
NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260824_security_hardening_v2.sql

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

-- >>> ORIGIN: supabase/migrations/20260824_security_hardening_v3.sql

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

-- >>> ORIGIN: supabase/migrations/20260824_security_hardening_v4.sql

-- Follow-up hardening: close legacy public group-challenge policies and allow
-- only the trusted submission RPC to maintain is_best/attempt metadata.

DROP POLICY IF EXISTS "Users can insert own progress" ON public.group_challenge_progress;
DROP POLICY IF EXISTS "Teachers can insert challenges" ON public.group_challenges;
DROP POLICY IF EXISTS "Teachers can update own challenges" ON public.group_challenges;

CREATE POLICY group_challenge_progress_scoped_insert
  ON public.group_challenge_progress FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM public.group_challenges gc
      LEFT JOIN public.classroom_students cs
        ON cs.class_id = gc.class_id AND cs.student_id = auth.uid()::text
      WHERE gc.id = challenge_id
        AND (cs.student_id IS NOT NULL OR gc.created_by = auth.uid()::text OR public.current_user_is_admin())
    )
  );

CREATE POLICY group_challenges_scoped_insert
  ON public.group_challenges FOR INSERT TO authenticated
  WITH CHECK (
    (created_by = auth.uid()::text AND EXISTS (
      SELECT 1 FROM public.classrooms c WHERE c.id = class_id AND c.created_by = auth.uid()::text
    )) OR public.current_user_is_admin()
  );

CREATE POLICY group_challenges_scoped_update
  ON public.group_challenges FOR UPDATE TO authenticated
  USING ((created_by = auth.uid()::text) OR public.current_user_is_admin())
  WITH CHECK ((created_by = auth.uid()::text) OR public.current_user_is_admin());

CREATE OR REPLACE FUNCTION public.protect_completion_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_internal boolean := current_setting('quizspace.internal_completion_write', true) = 'on';
BEGIN
  IF v_internal OR public.current_user_is_admin() THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NULL OR NEW.taker_id <> auth.uid()::text OR (TG_OP = 'UPDATE' AND OLD.taker_id <> auth.uid()::text) THEN
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
  IF auth.uid() IS NULL OR auth.uid()::text <> p_taker_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_quiz_id IS NULL OR char_length(trim(p_quiz_id)) = 0 OR char_length(p_quiz_id) > 200 THEN RAISE EXCEPTION 'Invalid quiz'; END IF;
  IF p_taker_name IS NULL OR char_length(trim(p_taker_name)) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Invalid taker name'; END IF;
  IF p_rating IS NOT NULL AND (p_rating < 1 OR p_rating > 5) THEN RAISE EXCEPTION 'Invalid rating'; END IF;
  IF p_feedback IS NOT NULL AND char_length(p_feedback) > 2000 THEN RAISE EXCEPTION 'Feedback is too long'; END IF;

  SELECT q.title, COALESCE(jsonb_array_length(q.questions), 0)
    INTO v_quiz_title, v_total_questions
    FROM public.quizzes q
   WHERE q.id = p_quiz_id
   FOR SHARE;
  IF NOT FOUND OR v_total_questions <= 0 THEN RAISE EXCEPTION 'Quiz not found'; END IF;
  IF v_score < 0 OR v_score > v_total_questions THEN RAISE EXCEPTION 'Invalid score'; END IF;

  SELECT COUNT(*)::integer, COALESCE(MAX(c.score), 0)
    INTO v_attempt_number, v_previous_best
    FROM public.completions c
   WHERE c.quiz_id = p_quiz_id AND c.taker_id = p_taker_id;
  v_attempt_number := v_attempt_number + 1;
  v_is_best := v_attempt_number = 1 OR v_score > v_previous_best;
  v_xp_awarded := CASE WHEN v_attempt_number = 1 THEN 10 + (v_score * 10) ELSE GREATEST(0, v_score - v_previous_best) * 10 END;

  v_completion_id := 'comp_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 10);
  PERFORM set_config('quizspace.internal_completion_write', 'on', true);
  IF v_is_best THEN
    UPDATE public.completions SET is_best = false WHERE quiz_id = p_quiz_id AND taker_id = p_taker_id;
  END IF;
  INSERT INTO public.completions (
    id, quiz_id, quiz_title, taker_id, taker_name, score, total_questions,
    rating, feedback, attempt_number, is_best
  ) VALUES (
    v_completion_id, p_quiz_id, v_quiz_title, p_taker_id, trim(p_taker_name),
    v_score, v_total_questions, p_rating, COALESCE(p_feedback, ''), v_attempt_number, v_is_best
  );
  IF v_xp_awarded > 0 THEN
    UPDATE public.users SET xp = COALESCE(xp, 0) + v_xp_awarded, updated_at = now() WHERE uid = p_taker_id;
  END IF;
  PERFORM set_config('quizspace.internal_completion_write', 'off', true);

  RETURN QUERY SELECT c.id, c.quiz_id, c.taker_id, c.taker_name, c.score, c.total_questions,
    c.rating, c.feedback, c.created_at, c.attempt_number, c.is_best, v_xp_awarded
    FROM public.completions c WHERE c.id = v_completion_id;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('quizspace.internal_completion_write', 'off', true);
  RAISE;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_completion_integrity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_quiz_attempt(text, text, text, integer, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(text, text, text, integer, integer, text) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260824_security_hardening_v5.sql

-- Replace definer views with explicit allow-listed RPCs.
-- This avoids exposing SECURITY DEFINER views through PostgREST while keeping
-- public profile and leaderboard features functional.

DROP VIEW IF EXISTS public.public_profiles;
DROP VIEW IF EXISTS public.public_completion_feed;

CREATE OR REPLACE FUNCTION public.get_public_profiles()
RETURNS TABLE(
  uid text,
  name text,
  photo_url text,
  bio text,
  location text,
  custom_id text,
  badge_tier text,
  badge_symbol text,
  badge_color text,
  name_color text,
  cover_url text,
  is_premium boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.uid, u.name, u.photo_url, u.bio, u.location, u.custom_id,
         u.badge_tier, u.badge_symbol, u.badge_color, u.name_color,
         u.cover_url, u.is_premium
    FROM public.users u
   ORDER BY u.name NULLS LAST, u.uid
   LIMIT 5000;
$$;

CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id text)
RETURNS TABLE(
  uid text,
  name text,
  photo_url text,
  bio text,
  location text,
  custom_id text,
  badge_tier text,
  badge_symbol text,
  badge_color text,
  name_color text,
  cover_url text,
  is_premium boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.uid, u.name, u.photo_url, u.bio, u.location, u.custom_id,
         u.badge_tier, u.badge_symbol, u.badge_color, u.name_color,
         u.cover_url, u.is_premium
    FROM public.users u
   WHERE u.uid = p_user_id
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.find_public_profile_by_custom_id(p_custom_id text)
RETURNS TABLE(uid text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.uid FROM public.users u WHERE u.custom_id = p_custom_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_public_completions_by_quiz(p_quiz_id text)
RETURNS TABLE(
  id text,
  quiz_id text,
  quiz_title text,
  taker_id text,
  taker_name text,
  score integer,
  total_questions integer,
  rating integer,
  created_at timestamptz,
  attempt_number integer,
  is_best boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.quiz_id, c.quiz_title, c.taker_id, c.taker_name,
         c.score, c.total_questions, c.rating, c.created_at,
         c.attempt_number, c.is_best
    FROM public.completions c
   WHERE c.quiz_id = p_quiz_id
   ORDER BY c.created_at DESC
   LIMIT 500;
$$;

CREATE OR REPLACE FUNCTION public.get_public_recent_completions(p_limit integer DEFAULT 10)
RETURNS TABLE(
  id text,
  quiz_id text,
  quiz_title text,
  taker_id text,
  taker_name text,
  score integer,
  total_questions integer,
  rating integer,
  created_at timestamptz,
  attempt_number integer,
  is_best boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.quiz_id, c.quiz_title, c.taker_id, c.taker_name,
         c.score, c.total_questions, c.rating, c.created_at,
         c.attempt_number, c.is_best
    FROM public.completions c
   ORDER BY c.created_at DESC
   LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);
$$;

CREATE OR REPLACE FUNCTION public.get_public_best_score(p_quiz_id text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(c.score), 0)::integer FROM public.completions c WHERE c.quiz_id = p_quiz_id;
$$;

REVOKE ALL ON FUNCTION public.get_public_profiles() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_profile(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.find_public_profile_by_custom_id(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_completions_by_quiz(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_recent_completions(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_best_score(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profiles() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_public_profile_by_custom_id(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_completions_by_quiz(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_recent_completions(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_best_score(text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260824_security_hardening_v6.sql

-- Public profile completion history with allow-listed fields only.
CREATE OR REPLACE FUNCTION public.get_public_completions_by_user(p_user_id text)
RETURNS TABLE(
  id text,
  quiz_id text,
  quiz_title text,
  taker_id text,
  taker_name text,
  score integer,
  total_questions integer,
  rating integer,
  created_at timestamptz,
  attempt_number integer,
  is_best boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.quiz_id, c.quiz_title, c.taker_id, c.taker_name,
         c.score, c.total_questions, c.rating, c.created_at,
         c.attempt_number, c.is_best
    FROM public.completions c
   WHERE c.taker_id = p_user_id
   ORDER BY c.created_at DESC
   LIMIT 500;
$$;
REVOKE ALL ON FUNCTION public.get_public_completions_by_user(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_completions_by_user(text) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260824_security_hardening_v7.sql

-- Harden legacy reward/coupon/season RPCs that accept user IDs.

CREATE OR REPLACE FUNCTION public.record_coupon_usage(
  p_coupon_id text,
  p_user_id text,
  p_discount_percent integer,
  p_plan_id text DEFAULT NULL,
  p_order_id text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usage_id text;
  v_coupon public.coupon_codes%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS NULL OR auth.uid()::text <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_coupon_id IS NULL OR p_discount_percent IS NULL OR p_discount_percent < 0 OR p_discount_percent > 100 THEN
    RAISE EXCEPTION 'Invalid coupon request';
  END IF;
  SELECT * INTO v_coupon FROM public.coupon_codes WHERE id = p_coupon_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Coupon not found'; END IF;
  IF NOT v_coupon.is_active THEN RAISE EXCEPTION 'Coupon is inactive'; END IF;
  IF v_coupon.expiry_date IS NOT NULL AND v_coupon.expiry_date < now() THEN RAISE EXCEPTION 'Coupon has expired'; END IF;
  IF v_coupon.used_count >= v_coupon.max_uses THEN RAISE EXCEPTION 'Coupon usage limit reached'; END IF;
  IF EXISTS (SELECT 1 FROM public.coupon_usages WHERE coupon_id = p_coupon_id AND user_id = p_user_id) THEN RAISE EXCEPTION 'User has already used this coupon'; END IF;
  v_usage_id := 'cu_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 8);
  INSERT INTO public.coupon_usages (id, coupon_id, user_id, discount_percent, plan_id, order_id)
  VALUES (v_usage_id, p_coupon_id, p_user_id, p_discount_percent, p_plan_id, p_order_id);
  UPDATE public.coupon_codes SET used_count = used_count + 1 WHERE id = p_coupon_id;
  RETURN v_usage_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_season_member_score(
  p_season_id text,
  p_user_id text,
  p_score_delta integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS NULL OR auth.uid()::text <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_season_id IS NULL OR p_score_delta IS NULL OR p_score_delta < 0 OR p_score_delta > 100 THEN
    RAISE EXCEPTION 'Invalid season score';
  END IF;
  UPDATE public.season_members sm
     SET total_score = COALESCE(sm.total_score, 0) + p_score_delta,
         quizzes_completed = COALESCE(sm.quizzes_completed, 0) + 1,
         updated_at = now()
   WHERE sm.season_id = p_season_id AND sm.user_id = p_user_id
     AND EXISTS (SELECT 1 FROM public.seasons s WHERE s.id = p_season_id AND s.is_active IS TRUE);
END;
$$;

REVOKE ALL ON FUNCTION public.grant_reward_points(text, integer, text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_reward_coins(text, integer, text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_exam_completion_reward(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vip_multiplier_for_user(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_learning_class_member(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_season_member_score(text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_coupon_usage(text, text, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_season_member_score(text, text, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260824_update_store_assets.sql

-- Update reward store item assets with zero duplication and unique high quality styles
UPDATE public.reward_store_items SET image_url = 'images/frame-neon-orbit.webp' WHERE id = 'frame_neon_orbit';
UPDATE public.reward_store_items SET image_url = 'images/frame-aurora.webp' WHERE id = 'frame_aurora';
UPDATE public.reward_store_items SET image_url = 'images/frame-fire.webp' WHERE id = 'frame_fire';
UPDATE public.reward_store_items SET image_url = 'images/frame-crystal-luxe.webp' WHERE id = 'frame_crystal_luxe';
UPDATE public.reward_store_items SET image_url = 'images/frame-star-crown.webp' WHERE id = 'frame_star_crown';
UPDATE public.reward_store_items SET image_url = 'images/frame-diamond-comet.webp' WHERE id = 'frame_diamond_comet';
UPDATE public.reward_store_items SET image_url = 'images/frame-diamond-crown.webp' WHERE id = 'frame_diamond_crown';

-- Add Matrix frame & seasonal frames
INSERT INTO public.reward_store_items (id, item_type, name, name_ar, description, description_ar, price_points, price_egp, reward_points, image_url, css_class, min_plan, sort_order)
VALUES 
  ('frame_matrix', 'frame', 'Matrix Code', 'كود الماتريكس', 'A digital falling code frame for techies.', 'إطار الأكواد الرقمية المتساقطة لمحبي التقنية.', 1500, 0, 0, 'images/frame-matrix-green.webp', 'frame-matrix', 'free', 35),
  ('frame_ramadan_lantern', 'frame', 'Ramadan Crescent', 'هلال رمضان', 'Special seasonal festive crescent frame.', 'إطار الهلال الرمضاني المميز.', 1200, 0, 0, 'images/frame-ramadan-crescent.webp', 'frame-ramadan', 'free', 45),
  ('frame_back_to_school', 'frame', 'Back to School', 'العودة للمدارس', 'Special back-to-school academic frame.', 'إطار العودة للمدارس والكتب الدراسية.', 1000, 0, 0, 'images/frame-back-school.webp', 'frame-school', 'free', 55)
ON CONFLICT (id) DO UPDATE SET image_url = EXCLUDED.image_url, css_class = EXCLUDED.css_class, description_ar = EXCLUDED.description_ar;

-- >>> ORIGIN: supabase/migrations/20260825193000_quiz_question_media.sql

-- Durable question media is public because published quizzes are public content.
-- Upload, update, and delete remain restricted to the authenticated owner folder.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quiz-question-media',
  'quiz-question-media',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

DROP POLICY IF EXISTS quiz_question_media_select_public ON storage.objects;
CREATE POLICY quiz_question_media_select_public
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'quiz-question-media');

DROP POLICY IF EXISTS quiz_question_media_insert_own ON storage.objects;
CREATE POLICY quiz_question_media_insert_own
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'quiz-question-media'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

DROP POLICY IF EXISTS quiz_question_media_update_own ON storage.objects;
CREATE POLICY quiz_question_media_update_own
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'quiz-question-media'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'quiz-question-media'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

DROP POLICY IF EXISTS quiz_question_media_delete_own ON storage.objects;
CREATE POLICY quiz_question_media_delete_own
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'quiz-question-media'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif'
]
WHERE id = 'quiz-extraction-uploads';

-- >>> ORIGIN: supabase/migrations/20260825_fix_admin_reward_grant_rpc.sql

-- Canonical admin reward grant RPC.
-- The reward schema stores all user IDs as TEXT, so this function intentionally
-- accepts a TEXT target ID and updates the canonical user_reward_balances table.

DROP FUNCTION IF EXISTS public.admin_grant_reward_points(INTEGER, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.admin_grant_reward_points(TEXT, INTEGER, TEXT, TEXT);

CREATE FUNCTION public.admin_grant_reward_points(
  p_user_id TEXT,
  p_amount INTEGER,
  p_reason TEXT DEFAULT '',
  p_currency TEXT DEFAULT 'points'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id TEXT := auth.uid()::TEXT;
  v_target_id TEXT := NULLIF(trim(p_user_id), '');
  v_new_balance INTEGER;
  v_event_key TEXT := 'admin_grant:' || gen_random_uuid()::TEXT;
BEGIN
  IF v_admin_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE uid = v_admin_id AND is_admin IS TRUE
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF v_target_id IS NULL OR length(v_target_id) > 100 OR NOT EXISTS (
    SELECT 1 FROM public.users WHERE uid = v_target_id
  ) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF p_amount IS NULL OR p_amount < 1 OR p_amount > 1000000 THEN
    RAISE EXCEPTION 'Invalid reward amount';
  END IF;

  IF p_currency NOT IN ('points', 'coins') THEN
    RAISE EXCEPTION 'Invalid reward currency';
  END IF;

  IF p_reason IS NOT NULL AND length(p_reason) > 500 THEN
    RAISE EXCEPTION 'Reward note is too long';
  END IF;

  INSERT INTO public.reward_points_ledger (
    user_id, points, event_type, event_key, reference_id, metadata
  ) VALUES (
    v_target_id,
    CASE WHEN p_currency = 'points' THEN p_amount ELSE 0 END,
    'admin_grant',
    v_event_key,
    v_admin_id,
    jsonb_build_object(
      'currency', p_currency,
      'amount', p_amount,
      'note', COALESCE(p_reason, ''),
      'admin_id', v_admin_id
    )
  );

  IF p_currency = 'points' THEN
    INSERT INTO public.user_reward_balances (user_id, points, level)
    VALUES (v_target_id, p_amount, public.reward_level_for_points(p_amount))
    ON CONFLICT (user_id) DO UPDATE
      SET points = public.user_reward_balances.points + EXCLUDED.points,
          level = public.reward_level_for_points(public.user_reward_balances.points + EXCLUDED.points),
          updated_at = now()
    RETURNING points INTO v_new_balance;
  ELSE
    INSERT INTO public.user_reward_balances (user_id, coins, level)
    VALUES (v_target_id, p_amount, public.reward_level_for_points(0))
    ON CONFLICT (user_id) DO UPDATE
      SET coins = public.user_reward_balances.coins + EXCLUDED.coins,
          updated_at = now()
    RETURNING coins INTO v_new_balance;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_target_id,
    'currency', p_currency,
    'amount_added', p_amount,
    'new_balance', v_new_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_reward_points(TEXT, INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_reward_points(TEXT, INTEGER, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260825_profile_asset_catalog_hardening.sql

-- QuizSpace profile asset catalog hardening.
-- Every active frame must have one unique image asset. Free frames are owned by
-- every user at activation time and do not require a purchase row.

UPDATE public.reward_store_items
SET image_url = 'images/frame-diamond-comet.webp'
WHERE id = 'frame_diamond_comet';

UPDATE public.reward_store_items
SET image_url = 'images/frame-diamond-crown.webp'
WHERE id = 'frame_diamond_crown';

UPDATE public.reward_store_items
SET image_url = 'images/frame-star-crown.webp', is_featured = true
WHERE id = 'offer_vip_combo';

INSERT INTO public.reward_store_items
  (id, item_type, name, name_ar, description, description_ar, price_points, price_egp, reward_points, image_url, css_class, min_plan, sort_order, is_active)
VALUES
  ('frame_free_1', 'frame', 'Soft Halo', 'هالة ناعمة', 'A clean, subtle halo for every learner.', 'هالة بسيطة وناعمة لكل طالب.', 0, 0, 0, 'images/frame-free-1.webp', 'frame-free-soft-halo', 'free', 1, true),
  ('frame_free_2', 'frame', 'Clean Mint', 'نعناع هادئ', 'A calm mint frame with a crisp profile fit.', 'إطار نعناعي هادئ بملاءمة واضحة للصورة.', 0, 0, 0, 'images/frame-free-2.webp', 'frame-free-clean-mint', 'free', 2, true),
  ('frame_diamond_comet', 'frame', 'Diamond Comet', 'مذنب ماسي', 'Exclusive crystalline comet ring.', 'إطار بلوري حصري بتصميم مذنب.', 0, 0, 0, '/manus-storage/frame-diamond-comet_596fd1b8.webp', 'frame-diamond-comet', 'diamond', 60, true),
  ('frame_diamond_crown', 'frame', 'Diamond Crown', 'التاج الماسي', 'Exclusive crown ring with platinum facets.', 'إطار تاج حصري بلمسات بلاتينية.', 0, 0, 0, '/manus-storage/frame-diamond-crown_c3f3f17c.webp', 'frame-diamond-crown', 'diamond', 70, true),
  ('frame_ramadan_lantern', 'frame', 'Ramadan Crescent', 'هلال رمضان', 'A seasonal crescent and lantern ring.', 'إطار موسمي بالهلال والفانوس.', 1200, 0, 0, '/manus-storage/frame-ramadan-crescent_1c3d1be8.webp', 'frame-ramadan', 'free', 80, true),
  ('frame_back_to_school', 'frame', 'Back to School', 'العودة للمدارس', 'A seasonal school-themed profile ring.', 'إطار موسمي مستوحى من المدرسة والكتب.', 1000, 0, 0, '/manus-storage/frame-back-school_68d31549.webp', 'frame-school', 'free', 90, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  price_points = EXCLUDED.price_points,
  price_egp = EXCLUDED.price_egp,
  image_url = EXCLUDED.image_url,
  css_class = EXCLUDED.css_class,
  min_plan = EXCLUDED.min_plan,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

CREATE UNIQUE INDEX IF NOT EXISTS reward_store_active_frame_image_unique
  ON public.reward_store_items (image_url)
  WHERE item_type = 'frame' AND id <> 'offer_vip_combo' AND is_active = true AND image_url IS NOT NULL;

CREATE OR REPLACE FUNCTION public.activate_reward_frame(p_item_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_item_id TEXT := trim(p_item_id);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF v_item_id IS NULL OR length(v_item_id) = 0 OR length(v_item_id) > 100 THEN
    RAISE EXCEPTION 'Invalid frame selection' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.reward_store_items AS item
    WHERE item.id = v_item_id AND item.is_active = true AND item.item_type = 'frame'
  ) THEN
    RAISE EXCEPTION 'Invalid frame selection' USING ERRCODE = '22023';
  END IF;

  IF v_item_id NOT IN ('frame_free_1', 'frame_free_2') AND NOT EXISTS (
    SELECT 1
    FROM public.reward_inventory AS inventory
    WHERE inventory.user_id = v_user_id
      AND inventory.item_id = v_item_id
      AND inventory.is_active = true
  ) THEN
    RAISE EXCEPTION 'You do not own this frame' USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('app.quizspace_allow_frame_update', 'true', true);
  UPDATE public.users
  SET active_frame_id = v_item_id, updated_at = now()
  WHERE uid = v_user_id;

  RETURN jsonb_build_object('success', true, 'active_frame_id', v_item_id);
END;
$$;

REVOKE ALL ON FUNCTION public.activate_reward_frame(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_reward_frame(TEXT) TO authenticated;

-- >>> ORIGIN: supabase/migrations/20260826_next_generation_motivation.sql

-- Next-generation motivation foundation.
-- All balance changes remain inside server-authorized functions with idempotent ledger keys.

ALTER TABLE public.user_streaks
  ADD COLUMN IF NOT EXISTS protection_days INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_protection_earned_at DATE,
  ADD COLUMN IF NOT EXISTS last_protection_used_for DATE;

ALTER TABLE public.user_streaks
  DROP CONSTRAINT IF EXISTS user_streaks_protection_days_check;
ALTER TABLE public.user_streaks
  ADD CONSTRAINT user_streaks_protection_days_check CHECK (protection_days BETWEEN 0 AND 2);

CREATE TABLE IF NOT EXISTS public.learning_class_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id TEXT NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 3 AND 80),
  description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 280),
  target_count INTEGER NOT NULL CHECK (target_count BETWEEN 3 AND 500),
  current_count INTEGER NOT NULL DEFAULT 0 CHECK (current_count >= 0),
  reward_points INTEGER NOT NULL DEFAULT 35 CHECK (reward_points BETWEEN 1 AND 500),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_by TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at AND ends_at <= starts_at + INTERVAL '31 days')
);

CREATE TABLE IF NOT EXISTS public.learning_class_challenge_contributions (
  challenge_id UUID NOT NULL REFERENCES public.learning_class_challenges(id) ON DELETE CASCADE,
  completion_id TEXT NOT NULL REFERENCES public.completions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  contributed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (challenge_id, completion_id)
);

CREATE TABLE IF NOT EXISTS public.learning_class_challenge_claims (
  challenge_id UUID NOT NULL REFERENCES public.learning_class_challenges(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (challenge_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.learning_season_reward_choices (
  season_id TEXT NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  choice_key TEXT NOT NULL CHECK (choice_key ~ '^[a-z0-9_]{3,40}$'),
  reward_type TEXT NOT NULL CHECK (reward_type IN ('points', 'coins', 'badge')),
  reward_amount INTEGER NOT NULL DEFAULT 0 CHECK (reward_amount >= 0),
  reward_badge_id TEXT REFERENCES public.reward_badges(id) ON DELETE RESTRICT,
  required_quizzes INTEGER NOT NULL DEFAULT 3 CHECK (required_quizzes BETWEEN 1 AND 100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (season_id, choice_key),
  CHECK (
    (reward_type = 'badge' AND reward_badge_id IS NOT NULL AND reward_amount = 0)
    OR (reward_type IN ('points', 'coins') AND reward_badge_id IS NULL AND reward_amount > 0)
  )
);

CREATE TABLE IF NOT EXISTS public.learning_season_reward_claims (
  season_id TEXT NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  choice_key TEXT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (season_id, user_id),
  FOREIGN KEY (season_id, choice_key)
    REFERENCES public.learning_season_reward_choices(season_id, choice_key)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS learning_class_challenges_class_window_idx
  ON public.learning_class_challenges(class_id, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS learning_class_challenge_contributions_user_idx
  ON public.learning_class_challenge_contributions(user_id, contributed_at DESC);
CREATE INDEX IF NOT EXISTS learning_season_reward_claims_user_idx
  ON public.learning_season_reward_claims(user_id, claimed_at DESC);
CREATE INDEX IF NOT EXISTS completions_taker_created_idx
  ON public.completions(taker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS completions_quiz_created_idx
  ON public.completions(quiz_id, created_at DESC);

ALTER TABLE public.learning_class_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_class_challenge_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_class_challenge_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_season_reward_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_season_reward_claims ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_learning_class_member(p_class_id TEXT, p_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.classrooms c WHERE c.id = p_class_id AND c.created_by = p_user_id
    UNION ALL
    SELECT 1 FROM public.classroom_students s WHERE s.class_id = p_class_id AND s.student_id = p_user_id
  );
$$;

DROP POLICY IF EXISTS learning_class_challenges_member_read ON public.learning_class_challenges;
CREATE POLICY learning_class_challenges_member_read
  ON public.learning_class_challenges FOR SELECT TO authenticated
  USING ((SELECT public.is_learning_class_member(class_id, auth.uid()::text)));

DROP POLICY IF EXISTS learning_class_challenge_contributions_own_read ON public.learning_class_challenge_contributions;
CREATE POLICY learning_class_challenge_contributions_own_read
  ON public.learning_class_challenge_contributions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS learning_class_challenge_claims_own_read ON public.learning_class_challenge_claims;
CREATE POLICY learning_class_challenge_claims_own_read
  ON public.learning_class_challenge_claims FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS learning_season_reward_choices_read ON public.learning_season_reward_choices;
CREATE POLICY learning_season_reward_choices_read
  ON public.learning_season_reward_choices FOR SELECT TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS learning_season_reward_claims_own_read ON public.learning_season_reward_claims;
CREATE POLICY learning_season_reward_claims_own_read
  ON public.learning_season_reward_claims FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::text));

CREATE OR REPLACE FUNCTION public.grant_reward_coins(
  p_user_id TEXT,
  p_coins INTEGER,
  p_event_type TEXT,
  p_event_key TEXT,
  p_reference_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows INTEGER := 0;
  v_total INTEGER := 0;
BEGIN
  IF p_user_id IS NULL OR p_user_id = '' OR p_coins <= 0 THEN
    RAISE EXCEPTION 'Invalid reward request';
  END IF;

  INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id, metadata)
  VALUES (p_user_id, 0, p_event_type, p_event_key, p_reference_id, COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('coins', p_coins))
  ON CONFLICT (user_id, event_key) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  INSERT INTO public.user_reward_balances (user_id, points, coins, level)
  VALUES (p_user_id, 0, CASE WHEN v_rows > 0 THEN p_coins ELSE 0 END, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    coins = public.user_reward_balances.coins + CASE WHEN v_rows > 0 THEN p_coins ELSE 0 END,
    updated_at = now();

  SELECT coins INTO v_total FROM public.user_reward_balances WHERE user_id = p_user_id;
  RETURN jsonb_build_object('coins_awarded', CASE WHEN v_rows > 0 THEN p_coins ELSE 0 END, 'total_coins', COALESCE(v_total, 0));
END;
$$;

CREATE OR REPLACE FUNCTION public.update_daily_streak()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today DATE := current_date;
  v_last DATE;
  v_current INTEGER := 0;
  v_longest INTEGER := 0;
  v_protection INTEGER := 1;
  v_points INTEGER := 0;
  v_used_protection BOOLEAN := false;
  v_earned_protection BOOLEAN := false;
  v_reward JSONB;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT current_streak, longest_streak, NULLIF(last_login_date, '')::date, protection_days
    INTO v_current, v_longest, v_last, v_protection
  FROM public.user_streaks WHERE user_id = v_user_id FOR UPDATE;

  IF NOT FOUND THEN
    v_current := 1;
    v_longest := 1;
    v_protection := 1;
    INSERT INTO public.user_streaks (id, user_id, current_streak, longest_streak, last_login_date, streak_points, protection_days)
    VALUES (gen_random_uuid()::text, v_user_id, v_current, v_longest, v_today::text, 0, v_protection);
  ELSIF v_last = v_today THEN
    RETURN jsonb_build_object('success', true, 'streak', v_current, 'points', 0, 'protection_days', v_protection, 'message', 'Already checked in today');
  ELSIF v_last = v_today - 1 THEN
    v_current := v_current + 1;
  ELSIF v_last = v_today - 2 AND v_protection > 0 THEN
    v_current := v_current + 1;
    v_protection := v_protection - 1;
    v_used_protection := true;
  ELSE
    v_current := 1;
  END IF;

  v_longest := greatest(v_longest, v_current);
  IF v_current >= 7 AND mod(v_current, 7) = 0 AND v_protection < 2 THEN
    v_protection := v_protection + 1;
    v_earned_protection := true;
  END IF;
  v_points := CASE WHEN v_current >= 30 THEN 200 WHEN v_current >= 14 THEN 100 WHEN v_current >= 7 THEN 50 WHEN v_current >= 3 THEN 20 ELSE 5 END;

  UPDATE public.user_streaks SET
    current_streak = v_current,
    longest_streak = v_longest,
    last_login_date = v_today::text,
    streak_points = streak_points + v_points,
    protection_days = v_protection,
    last_protection_earned_at = CASE WHEN v_earned_protection THEN v_today ELSE last_protection_earned_at END,
    last_protection_used_for = CASE WHEN v_used_protection THEN v_today - 1 ELSE last_protection_used_for END,
    updated_at = now()
  WHERE user_id = v_user_id;

  v_reward := public.grant_reward_points(v_user_id, v_points, 'daily_streak', 'daily_streak:' || v_today::text, v_today::text,
    jsonb_build_object('streak', v_current, 'used_protection', v_used_protection, 'earned_protection', v_earned_protection));
  RETURN jsonb_build_object('success', true, 'streak', v_current, 'points', COALESCE((v_reward->>'points_awarded')::integer, 0), 'protection_days', v_protection, 'used_protection', v_used_protection, 'earned_protection', v_earned_protection);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_smart_review_cards()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_cards JSONB;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(card) ORDER BY card.accuracy ASC, card.attempts DESC), '[]'::jsonb)
    INTO v_cards
  FROM (
    SELECT
      COALESCE(NULLIF(trim(q.category), ''), 'general') AS topic,
      COUNT(*)::integer AS attempts,
      ROUND(100 * AVG(c.score::numeric / NULLIF(c.total_questions, 0)), 1) AS accuracy,
      MAX(c.created_at) AS last_attempt_at,
      ARRAY_AGG(DISTINCT c.quiz_id ORDER BY c.quiz_id) FILTER (WHERE c.quiz_id IS NOT NULL) AS quiz_ids
    FROM public.completions c
    JOIN public.quizzes q ON q.id = c.quiz_id
    WHERE c.taker_id = v_user_id
      AND c.total_questions > 0
      AND c.created_at >= now() - INTERVAL '60 days'
    GROUP BY COALESCE(NULLIF(trim(q.category), ''), 'general')
    HAVING COUNT(*) >= 1
    ORDER BY accuracy ASC, attempts DESC
    LIMIT 3
  ) AS card;
  RETURN jsonb_build_object('cards', v_cards, 'window_days', 60);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_personal_learning_improvement()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_current_count INTEGER;
  v_previous_count INTEGER;
  v_current_accuracy NUMERIC;
  v_previous_accuracy NUMERIC;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT COUNT(*)::integer, ROUND(100 * AVG(score::numeric / NULLIF(total_questions, 0)), 1)
    INTO v_current_count, v_current_accuracy
  FROM public.completions
  WHERE taker_id = v_user_id AND total_questions > 0 AND created_at >= now() - INTERVAL '28 days';
  SELECT COUNT(*)::integer, ROUND(100 * AVG(score::numeric / NULLIF(total_questions, 0)), 1)
    INTO v_previous_count, v_previous_accuracy
  FROM public.completions
  WHERE taker_id = v_user_id AND total_questions > 0
    AND created_at >= now() - INTERVAL '56 days' AND created_at < now() - INTERVAL '28 days';
  RETURN jsonb_build_object(
    'current_period', jsonb_build_object('days', 28, 'completed', COALESCE(v_current_count, 0), 'accuracy', COALESCE(v_current_accuracy, 0)),
    'previous_period', jsonb_build_object('days', 28, 'completed', COALESCE(v_previous_count, 0), 'accuracy', COALESCE(v_previous_accuracy, 0)),
    'accuracy_change', COALESCE(v_current_accuracy, 0) - COALESCE(v_previous_accuracy, 0),
    'completion_change', COALESCE(v_current_count, 0) - COALESCE(v_previous_count, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_learning_class_challenge(
  p_class_id TEXT,
  p_title TEXT,
  p_description TEXT,
  p_target_count INTEGER,
  p_ends_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_id UUID;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF char_length(trim(COALESCE(p_title, ''))) NOT BETWEEN 3 AND 80
    OR char_length(COALESCE(p_description, '')) > 280
    OR COALESCE(p_target_count, 0) NOT BETWEEN 3 AND 500
    OR p_ends_at IS NULL OR p_ends_at <= now() + INTERVAL '1 hour' OR p_ends_at > now() + INTERVAL '31 days' THEN
    RAISE EXCEPTION 'Invalid class challenge';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.classrooms WHERE id = p_class_id AND created_by = v_user_id) THEN
    RAISE EXCEPTION 'Only the classroom teacher can create a challenge';
  END IF;
  INSERT INTO public.learning_class_challenges(class_id, title, description, target_count, ends_at, created_by)
  VALUES (p_class_id, trim(p_title), trim(COALESCE(p_description, '')), p_target_count, p_ends_at, v_user_id)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'challenge_id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_learning_class_challenge_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class_id TEXT;
  v_challenge RECORD;
  v_inserted INTEGER;
BEGIN
  SELECT classroom_id INTO v_class_id FROM public.quizzes WHERE id = NEW.quiz_id;
  IF v_class_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.classroom_students WHERE class_id = v_class_id AND student_id = NEW.taker_id
  ) THEN RETURN NEW; END IF;
  FOR v_challenge IN
    SELECT id, target_count FROM public.learning_class_challenges
    WHERE class_id = v_class_id AND completed_at IS NULL AND starts_at <= NEW.created_at AND ends_at >= NEW.created_at
  LOOP
    INSERT INTO public.learning_class_challenge_contributions(challenge_id, completion_id, user_id)
    VALUES (v_challenge.id, NEW.id, NEW.taker_id)
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    IF v_inserted > 0 THEN
      UPDATE public.learning_class_challenges
      SET current_count = LEAST(current_count + 1, target_count),
          completed_at = CASE WHEN current_count + 1 >= target_count THEN now() ELSE completed_at END,
          updated_at = now()
      WHERE id = v_challenge.id;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS learning_class_challenge_on_completion ON public.completions;
CREATE TRIGGER learning_class_challenge_on_completion
  AFTER INSERT ON public.completions
  FOR EACH ROW EXECUTE FUNCTION public.record_learning_class_challenge_completion();

CREATE OR REPLACE FUNCTION public.get_learning_class_challenges(p_class_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_challenges JSONB;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_learning_class_member(p_class_id, v_user_id) THEN RAISE EXCEPTION 'Not authorized for this classroom'; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id, 'title', c.title, 'description', c.description, 'target_count', c.target_count,
    'current_count', c.current_count, 'ends_at', c.ends_at, 'completed_at', c.completed_at,
    'reward_points', c.reward_points,
    'my_contributions', (SELECT COUNT(*) FROM public.learning_class_challenge_contributions p WHERE p.challenge_id = c.id AND p.user_id = v_user_id),
    'claimed', EXISTS (SELECT 1 FROM public.learning_class_challenge_claims cl WHERE cl.challenge_id = c.id AND cl.user_id = v_user_id)
  ) ORDER BY c.ends_at ASC), '[]'::jsonb)
  INTO v_challenges
  FROM public.learning_class_challenges c
  WHERE c.class_id = p_class_id AND c.ends_at >= now() - INTERVAL '7 days';
  RETURN jsonb_build_object('challenges', v_challenges);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_learning_class_challenge(p_challenge_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_challenge public.learning_class_challenges%ROWTYPE;
  v_rows INTEGER := 0;
  v_reward JSONB;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_challenge FROM public.learning_class_challenges WHERE id = p_challenge_id FOR UPDATE;
  IF NOT FOUND OR NOT public.is_learning_class_member(v_challenge.class_id, v_user_id) THEN RAISE EXCEPTION 'Not authorized for this challenge'; END IF;
  IF v_challenge.completed_at IS NULL THEN RAISE EXCEPTION 'Challenge is not complete yet'; END IF;
  INSERT INTO public.learning_class_challenge_claims(challenge_id, user_id)
  VALUES (p_challenge_id, v_user_id) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RETURN jsonb_build_object('claimed', false, 'message', 'Already claimed'); END IF;
  v_reward := public.grant_reward_points(v_user_id, v_challenge.reward_points, 'class_challenge', 'class_challenge:' || p_challenge_id::text, p_challenge_id::text, jsonb_build_object('class_id', v_challenge.class_id));
  RETURN jsonb_build_object('claimed', true, 'points', COALESCE((v_reward->>'points_awarded')::integer, 0));
END;
$$;

INSERT INTO public.reward_badges (id, name, name_ar, description, description_ar, icon, sort_order)
VALUES ('season_learning_sprint', 'Learning Sprint', 'عدّاء التعلّم', 'Earned by completing a seasonal learning sprint.', 'تُكتسب بإكمال موسم تعليمي قصير.', 'sparkles', 90)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.seasons (id, name, name_ar, description, description_ar, start_date, end_date, is_active, is_archived, prize_description, rules_text, rules_text_ar)
SELECT 'learning_sprint_2026', 'Learning Sprint', 'سباق التعلّم', 'A four-week learning season with a fair earned reward choice.', 'موسم تعليمي لأربعة أسابيع مع اختيار مكافأة مكتسبة وعادلة.', now(), now() + INTERVAL '28 days', true, false, 'Choose one earned season reward.', 'Complete three quizzes during the season to choose one reward.', 'أكمل ثلاثة اختبارات خلال الموسم لاختيار مكافأة واحدة.'
WHERE NOT EXISTS (SELECT 1 FROM public.seasons WHERE is_active = true AND is_archived = false AND start_date <= now() AND end_date >= now());

INSERT INTO public.learning_season_reward_choices(season_id, choice_key, reward_type, reward_amount, reward_badge_id, required_quizzes)
SELECT s.id, v.choice_key, v.reward_type, v.reward_amount, v.reward_badge_id, 3
FROM public.seasons s
CROSS JOIN (VALUES
  ('focus_points', 'points', 120, NULL::text),
  ('focus_coins', 'coins', 25, NULL::text),
  ('focus_badge', 'badge', 0, 'season_learning_sprint'::text)
) AS v(choice_key, reward_type, reward_amount, reward_badge_id)
WHERE s.is_active = true AND s.is_archived = false AND s.start_date <= now() AND s.end_date >= now()
ON CONFLICT (season_id, choice_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_active_learning_season()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_season public.seasons%ROWTYPE;
  v_completed INTEGER := 0;
  v_choices JSONB;
  v_claim TEXT;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT s.* INTO v_season FROM public.seasons s
  WHERE s.is_active = true AND s.is_archived = false AND s.start_date <= now() AND s.end_date >= now()
    AND EXISTS (SELECT 1 FROM public.learning_season_reward_choices c WHERE c.season_id = s.id AND c.is_active = true)
  ORDER BY s.end_date ASC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('season', null, 'choices', '[]'::jsonb); END IF;
  SELECT COUNT(*)::integer INTO v_completed FROM public.completions c
  WHERE c.taker_id = v_user_id AND c.created_at >= v_season.start_date AND c.created_at <= v_season.end_date;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('key', c.choice_key, 'type', c.reward_type, 'amount', c.reward_amount, 'badge_id', c.reward_badge_id, 'required_quizzes', c.required_quizzes) ORDER BY c.choice_key), '[]'::jsonb)
    INTO v_choices FROM public.learning_season_reward_choices c WHERE c.season_id = v_season.id AND c.is_active = true;
  SELECT choice_key INTO v_claim FROM public.learning_season_reward_claims WHERE season_id = v_season.id AND user_id = v_user_id;
  RETURN jsonb_build_object('season', jsonb_build_object('id', v_season.id, 'name', v_season.name, 'name_ar', v_season.name_ar, 'description', v_season.description, 'description_ar', v_season.description_ar, 'ends_at', v_season.end_date), 'completed_quizzes', v_completed, 'choices', v_choices, 'claimed_choice', v_claim);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_learning_season_reward(p_season_id TEXT, p_choice_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_season public.seasons%ROWTYPE;
  v_choice public.learning_season_reward_choices%ROWTYPE;
  v_completed INTEGER := 0;
  v_reward JSONB;
  v_rows INTEGER := 0;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_season FROM public.seasons WHERE id = p_season_id AND is_active = true AND is_archived = false AND start_date <= now() AND end_date >= now();
  IF NOT FOUND THEN RAISE EXCEPTION 'Season is not active'; END IF;
  SELECT * INTO v_choice FROM public.learning_season_reward_choices WHERE season_id = p_season_id AND choice_key = p_choice_key AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reward choice not found'; END IF;
  SELECT COUNT(*)::integer INTO v_completed FROM public.completions WHERE taker_id = v_user_id AND created_at >= v_season.start_date AND created_at <= v_season.end_date;
  IF v_completed < v_choice.required_quizzes THEN RAISE EXCEPTION 'Season requirement is not complete'; END IF;
  INSERT INTO public.learning_season_reward_claims(season_id, user_id, choice_key) VALUES (p_season_id, v_user_id, p_choice_key) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RETURN jsonb_build_object('claimed', false, 'message', 'A season reward was already selected'); END IF;
  IF v_choice.reward_type = 'points' THEN
    v_reward := public.grant_reward_points(v_user_id, v_choice.reward_amount, 'season_reward', 'season_reward:' || p_season_id, p_season_id, jsonb_build_object('choice', p_choice_key));
  ELSIF v_choice.reward_type = 'coins' THEN
    v_reward := public.grant_reward_coins(v_user_id, v_choice.reward_amount, 'season_reward', 'season_reward:' || p_season_id, p_season_id, jsonb_build_object('choice', p_choice_key));
  ELSE
    INSERT INTO public.user_reward_badges(user_id, badge_id) VALUES (v_user_id, v_choice.reward_badge_id) ON CONFLICT DO NOTHING;
    INSERT INTO public.reward_points_ledger(user_id, points, event_type, event_key, reference_id, metadata)
    VALUES (v_user_id, 0, 'season_reward', 'season_reward:' || p_season_id, p_season_id, jsonb_build_object('choice', p_choice_key, 'badge_id', v_choice.reward_badge_id)) ON CONFLICT DO NOTHING;
    v_reward := jsonb_build_object('badge_id', v_choice.reward_badge_id);
  END IF;
  RETURN jsonb_build_object('claimed', true, 'choice', p_choice_key, 'reward', v_reward);
END;
$$;

REVOKE ALL ON FUNCTION public.grant_reward_points(TEXT, INTEGER, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_reward_coins(TEXT, INTEGER, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_learning_class_member(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_learning_class_challenge_completion() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_daily_streak() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_smart_review_cards() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_personal_learning_improvement() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_learning_class_challenge(TEXT, TEXT, TEXT, INTEGER, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_learning_class_challenges(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_learning_class_challenge(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_active_learning_season() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_learning_season_reward(TEXT, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.update_daily_streak() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_smart_review_cards() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_personal_learning_improvement() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_learning_class_challenge(TEXT, TEXT, TEXT, INTEGER, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_learning_class_challenges(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_learning_class_challenge(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_learning_season() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_learning_season_reward(TEXT, TEXT) TO authenticated;

-- >>> ORIGIN: supabase/migrations/20260827_fix_sync_users_id_text_uid.sql

-- Firebase-to-QuizSpace accounts may use legacy text UIDs such as X4PiWcRJ5CeNgMWJDYDbdOqfpHw2.
-- Never cast every users.uid to UUID: users.uid is the authoritative text key,
-- while users.id is a separate UUID compatibility column.
CREATE OR REPLACE FUNCTION public.sync_users_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.uid IS NOT NULL AND NEW.uid ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    NEW.id := NEW.uid::uuid;
  ELSIF TG_OP = 'INSERT' AND NEW.id IS NULL THEN
    NEW.id := gen_random_uuid();
  END IF;
  RETURN NEW;
END;
$$;

-- >>> ORIGIN: supabase/migrations/20260827_flexible_streak_status.sql

CREATE OR REPLACE FUNCTION public.get_learning_streak_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_streak public.user_streaks%ROWTYPE;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_streak FROM public.user_streaks WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('current_streak', 0, 'longest_streak', 0, 'protection_days', 1, 'checked_in_today', false);
  END IF;
  RETURN jsonb_build_object(
    'current_streak', v_streak.current_streak,
    'longest_streak', v_streak.longest_streak,
    'protection_days', v_streak.protection_days,
    'checked_in_today', NULLIF(v_streak.last_login_date, '')::date = current_date,
    'last_login_date', v_streak.last_login_date,
    'last_protection_earned_at', v_streak.last_protection_earned_at,
    'last_protection_used_for', v_streak.last_protection_used_for
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_learning_streak_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_learning_streak_status() TO authenticated;

-- >>> ORIGIN: supabase/migrations/20260827_mobile_quiz_attempts.sql

-- Native mobile quiz attempts are submitted through the Firebase-verified Edge
-- Function. This RPC is intentionally executable only by service_role; the
-- client never receives a Supabase administrative credential.
CREATE OR REPLACE FUNCTION public.submit_mobile_quiz_attempt(
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
  IF p_taker_id IS NULL OR char_length(trim(p_taker_id)) = 0 THEN RAISE EXCEPTION 'Invalid taker'; END IF;
  IF p_quiz_id IS NULL OR char_length(trim(p_quiz_id)) = 0 OR char_length(p_quiz_id) > 256 THEN RAISE EXCEPTION 'Invalid quiz'; END IF;
  IF p_taker_name IS NULL OR char_length(trim(p_taker_name)) NOT BETWEEN 1 AND 160 THEN RAISE EXCEPTION 'Invalid taker name'; END IF;
  IF p_rating IS NOT NULL AND (p_rating < 1 OR p_rating > 5) THEN RAISE EXCEPTION 'Invalid rating'; END IF;
  IF p_feedback IS NOT NULL AND char_length(p_feedback) > 2000 THEN RAISE EXCEPTION 'Feedback is too long'; END IF;

  SELECT q.title, GREATEST(0, COALESCE(jsonb_array_length(q.questions), 0))
    INTO v_quiz_title, v_total_questions
    FROM public.quizzes q
   WHERE q.id = trim(p_quiz_id)
     AND (q.distribution_routing = 'public' OR q.creator_id = p_taker_id)
   FOR SHARE;
  IF NOT FOUND OR v_total_questions <= 0 THEN RAISE EXCEPTION 'Quiz not found'; END IF;
  IF v_score < 0 OR v_score > v_total_questions THEN RAISE EXCEPTION 'Invalid score'; END IF;

  SELECT COUNT(*)::integer, COALESCE(MAX(c.score), 0)
    INTO v_attempt_number, v_previous_best
    FROM public.completions c
   WHERE c.quiz_id = trim(p_quiz_id) AND c.taker_id = p_taker_id;
  v_attempt_number := v_attempt_number + 1;
  v_is_best := v_attempt_number = 1 OR v_score > v_previous_best;
  v_xp_awarded := CASE WHEN v_attempt_number = 1 THEN 10 + (v_score * 10) ELSE GREATEST(0, v_score - v_previous_best) * 10 END;

  v_completion_id := 'comp_' || extract(epoch from clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 10);
  PERFORM set_config('quizspace.internal_completion_write', 'on', true);
  IF v_is_best THEN
    UPDATE public.completions SET is_best = false WHERE quiz_id = trim(p_quiz_id) AND taker_id = p_taker_id;
  END IF;
  INSERT INTO public.completions (
    id, quiz_id, quiz_title, taker_id, taker_name, score, total_questions,
    rating, feedback, attempt_number, is_best
  ) VALUES (
    v_completion_id, trim(p_quiz_id), v_quiz_title, p_taker_id, trim(p_taker_name),
    v_score, v_total_questions, p_rating, COALESCE(p_feedback, ''), v_attempt_number, v_is_best
  );
  IF v_xp_awarded > 0 THEN
    UPDATE public.users SET xp = COALESCE(xp, 0) + v_xp_awarded, updated_at = now() WHERE uid = p_taker_id;
  END IF;
  PERFORM set_config('quizspace.internal_completion_write', 'off', true);

  RETURN QUERY SELECT c.id, c.quiz_id, c.taker_id, c.taker_name, c.score, c.total_questions,
    c.rating, c.feedback, c.created_at, c.attempt_number, c.is_best, v_xp_awarded
    FROM public.completions c WHERE c.id = v_completion_id;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('quizspace.internal_completion_write', 'off', true);
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_mobile_quiz_attempt(text, text, text, integer, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_mobile_quiz_attempt(text, text, text, integer, integer, text) FROM anon;
REVOKE ALL ON FUNCTION public.submit_mobile_quiz_attempt(text, text, text, integer, integer, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.submit_mobile_quiz_attempt(text, text, text, integer, integer, text) TO service_role;

-- >>> ORIGIN: supabase/migrations/20260828_guard_classroom_grades.sql

-- Students may create/update their own submission content, but only a
-- classroom owner may change grades, feedback, or grading timestamps.
CREATE OR REPLACE FUNCTION public.guard_classroom_submission_grading()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid()::text = NEW.student_id
     AND (
       NEW.grade IS DISTINCT FROM OLD.grade
       OR NEW.feedback IS DISTINCT FROM OLD.feedback
       OR NEW.graded_at IS DISTINCT FROM OLD.graded_at
     ) THEN
    RAISE EXCEPTION 'Only the classroom teacher can grade submissions';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS classroom_submission_grading_guard ON public.classroom_submissions;
CREATE TRIGGER classroom_submission_grading_guard
BEFORE UPDATE ON public.classroom_submissions
FOR EACH ROW
EXECUTE FUNCTION public.guard_classroom_submission_grading();

-- >>> ORIGIN: supabase/migrations/20260828_harden_classroom_permissions.sql

-- Harden classroom access without changing or deleting existing rows.
-- The Supabase browser session is the authoritative identity for the web wrapper.

CREATE UNIQUE INDEX IF NOT EXISTS classroom_students_class_student_unique
  ON public.classroom_students (class_id, student_id);

ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_shared_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS classrooms_read ON public.classrooms;
CREATE POLICY classrooms_read ON public.classrooms FOR SELECT USING (
  created_by = auth.uid()::text
  OR EXISTS (
    SELECT 1 FROM public.classroom_students cs
    WHERE cs.class_id = classrooms.id AND cs.student_id = auth.uid()::text
  )
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.uid = auth.uid()::text AND u.is_admin = true
  )
);

DROP POLICY IF EXISTS classrooms_insert_auth ON public.classrooms;
CREATE POLICY classrooms_insert_auth ON public.classrooms FOR INSERT WITH CHECK (
  created_by = auth.uid()::text
);

DROP POLICY IF EXISTS classrooms_update_own ON public.classrooms;
CREATE POLICY classrooms_update_own ON public.classrooms FOR UPDATE USING (
  created_by = auth.uid()::text
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid()::text AND u.is_admin = true)
) WITH CHECK (
  created_by = auth.uid()::text
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid()::text AND u.is_admin = true)
);

DROP POLICY IF EXISTS classrooms_delete_own ON public.classrooms;
CREATE POLICY classrooms_delete_own ON public.classrooms FOR DELETE USING (
  created_by = auth.uid()::text
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid()::text AND u.is_admin = true)
);

DROP POLICY IF EXISTS classroom_students_read ON public.classroom_students;
CREATE POLICY classroom_students_read ON public.classroom_students FOR SELECT USING (
  student_id = auth.uid()::text
  OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_students.class_id AND c.created_by = auth.uid()::text)
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid()::text AND u.is_admin = true)
);

DROP POLICY IF EXISTS classroom_students_insert_own ON public.classroom_students;
CREATE POLICY classroom_students_insert_own ON public.classroom_students FOR INSERT WITH CHECK (
  student_id = auth.uid()::text
  AND EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_students.class_id)
);

DROP POLICY IF EXISTS classroom_students_admin_write ON public.classroom_students;
CREATE POLICY classroom_students_admin_write ON public.classroom_students FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_students.class_id AND c.created_by = auth.uid()::text)
);

DROP POLICY IF EXISTS classroom_students_update_teacher ON public.classroom_students;
CREATE POLICY classroom_students_update_teacher ON public.classroom_students FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_students.class_id AND c.created_by = auth.uid()::text)
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid()::text AND u.is_admin = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_students.class_id AND c.created_by = auth.uid()::text)
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid()::text AND u.is_admin = true)
);

DROP POLICY IF EXISTS classroom_messages_read ON public.classroom_messages;
CREATE POLICY classroom_messages_read ON public.classroom_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.classrooms c
    WHERE c.id = classroom_messages.classroom_id
      AND (c.created_by = auth.uid()::text OR EXISTS (
        SELECT 1 FROM public.classroom_students cs WHERE cs.class_id = c.id AND cs.student_id = auth.uid()::text
      ))
  )
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid()::text AND u.is_admin = true)
);

DROP POLICY IF EXISTS classroom_messages_insert_own ON public.classroom_messages;
CREATE POLICY classroom_messages_insert_own ON public.classroom_messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.classrooms c
    WHERE c.id = classroom_messages.classroom_id
      AND (c.created_by = auth.uid()::text OR (
        c.allow_student_messages = true
        AND EXISTS (SELECT 1 FROM public.classroom_students cs WHERE cs.class_id = c.id AND cs.student_id = auth.uid()::text)
      ))
  )
);

DROP POLICY IF EXISTS classroom_assignments_read ON public.classroom_assignments;
CREATE POLICY classroom_assignments_read ON public.classroom_assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_assignments.class_id AND c.created_by = auth.uid()::text)
  OR EXISTS (SELECT 1 FROM public.classroom_students cs WHERE cs.class_id = classroom_assignments.class_id AND cs.student_id = auth.uid()::text)
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid()::text AND u.is_admin = true)
);

DROP POLICY IF EXISTS classroom_assignments_insert ON public.classroom_assignments;
CREATE POLICY classroom_assignments_insert ON public.classroom_assignments FOR INSERT WITH CHECK (
  created_by = auth.uid()::text
  AND EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_assignments.class_id AND c.created_by = auth.uid()::text)
);

DROP POLICY IF EXISTS classroom_assignments_update_own ON public.classroom_assignments;
CREATE POLICY classroom_assignments_update_own ON public.classroom_assignments FOR UPDATE USING (
  created_by = auth.uid()::text
  OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_assignments.class_id AND c.created_by = auth.uid()::text)
) WITH CHECK (
  created_by = auth.uid()::text
  OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_assignments.class_id AND c.created_by = auth.uid()::text)
);

DROP POLICY IF EXISTS classroom_assignments_delete_own ON public.classroom_assignments;
CREATE POLICY classroom_assignments_delete_own ON public.classroom_assignments FOR DELETE USING (
  created_by = auth.uid()::text
  OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_assignments.class_id AND c.created_by = auth.uid()::text)
);

DROP POLICY IF EXISTS classroom_announcements_read ON public.classroom_announcements;
CREATE POLICY classroom_announcements_read ON public.classroom_announcements FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_announcements.class_id AND c.created_by = auth.uid()::text)
  OR EXISTS (SELECT 1 FROM public.classroom_students cs WHERE cs.class_id = classroom_announcements.class_id AND cs.student_id = auth.uid()::text)
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid()::text AND u.is_admin = true)
);

DROP POLICY IF EXISTS classroom_announcements_insert ON public.classroom_announcements;
CREATE POLICY classroom_announcements_insert ON public.classroom_announcements FOR INSERT WITH CHECK (
  posted_by = auth.uid()::text
  AND EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_announcements.class_id AND c.created_by = auth.uid()::text)
);

DROP POLICY IF EXISTS classroom_announcements_update ON public.classroom_announcements;
CREATE POLICY classroom_announcements_update ON public.classroom_announcements FOR UPDATE USING (
  posted_by = auth.uid()::text
  OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_announcements.class_id AND c.created_by = auth.uid()::text)
) WITH CHECK (
  posted_by = auth.uid()::text
  OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_announcements.class_id AND c.created_by = auth.uid()::text)
);

DROP POLICY IF EXISTS classroom_shared_files_read ON public.classroom_shared_files;
CREATE POLICY classroom_shared_files_read ON public.classroom_shared_files FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_shared_files.class_id AND c.created_by = auth.uid()::text)
  OR EXISTS (SELECT 1 FROM public.classroom_students cs WHERE cs.class_id = classroom_shared_files.class_id AND cs.student_id = auth.uid()::text)
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid()::text AND u.is_admin = true)
);

DROP POLICY IF EXISTS classroom_shared_files_insert ON public.classroom_shared_files;
CREATE POLICY classroom_shared_files_insert ON public.classroom_shared_files FOR INSERT WITH CHECK (
  shared_by = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.classrooms c
    WHERE c.id = classroom_shared_files.class_id
      AND (c.created_by = auth.uid()::text OR (
        c.allow_student_media = true
        AND EXISTS (SELECT 1 FROM public.classroom_students cs WHERE cs.class_id = c.id AND cs.student_id = auth.uid()::text)
      ))
  )
);

DROP POLICY IF EXISTS classroom_shared_files_delete_own ON public.classroom_shared_files;
CREATE POLICY classroom_shared_files_delete_own ON public.classroom_shared_files FOR DELETE USING (
  shared_by = auth.uid()::text
  OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_shared_files.class_id AND c.created_by = auth.uid()::text)
);

-- >>> ORIGIN: supabase/migrations/20260828_harden_classroom_submissions.sql

-- Scope assignment submissions to classroom membership and keep immutable identity fields.
DROP POLICY IF EXISTS classroom_submissions_insert_own ON public.classroom_submissions;
CREATE POLICY classroom_submissions_insert_own ON public.classroom_submissions FOR INSERT WITH CHECK (
  student_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.classroom_assignments a
    JOIN public.classrooms c ON c.id = a.class_id
    WHERE a.id = classroom_submissions.assignment_id
      AND (c.created_by = auth.uid()::text OR EXISTS (
        SELECT 1 FROM public.classroom_students cs
        WHERE cs.class_id = c.id AND cs.student_id = auth.uid()::text
      ))
  )
);

DROP POLICY IF EXISTS classroom_submissions_update ON public.classroom_submissions;
CREATE POLICY classroom_submissions_update ON public.classroom_submissions FOR UPDATE USING (
  student_id = auth.uid()::text
  OR EXISTS (
    SELECT 1
    FROM public.classroom_assignments a
    JOIN public.classrooms c ON c.id = a.class_id
    WHERE a.id = classroom_submissions.assignment_id AND c.created_by = auth.uid()::text
  )
) WITH CHECK (
  student_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.classroom_assignments a
    JOIN public.classrooms c ON c.id = a.class_id
    WHERE a.id = classroom_submissions.assignment_id
      AND (c.created_by = auth.uid()::text OR EXISTS (
        SELECT 1 FROM public.classroom_students cs
        WHERE cs.class_id = c.id AND cs.student_id = auth.uid()::text
      ))
  )
);

CREATE OR REPLACE FUNCTION public.guard_classroom_submission_grading()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.student_id IS DISTINCT FROM OLD.student_id
     OR NEW.assignment_id IS DISTINCT FROM OLD.assignment_id THEN
    RAISE EXCEPTION 'Submission ownership and assignment cannot be changed';
  END IF;

  IF auth.uid()::text = NEW.student_id
     AND (
       NEW.grade IS DISTINCT FROM OLD.grade
       OR NEW.feedback IS DISTINCT FROM OLD.feedback
       OR NEW.graded_at IS DISTINCT FROM OLD.graded_at
     ) THEN
    RAISE EXCEPTION 'Only the classroom teacher can grade submissions';
  END IF;
  RETURN NEW;
END;
$$;

-- >>> ORIGIN: supabase/migrations/20260828_join_classroom_rpc.sql

-- Join by invite code without exposing all classrooms to a non-member.
CREATE OR REPLACE FUNCTION public.join_classroom_by_code(p_class_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id text := auth.uid()::text;
  normalized_code text := upper(trim(coalesce(p_class_code, '')));
  classroom_row public.classrooms%ROWTYPE;
  user_row public.users%ROWTYPE;
BEGIN
  IF caller_id IS NULL OR caller_id = '' THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  IF normalized_code !~ '^[A-Z0-9_-]{3,64}$' THEN
    RAISE EXCEPTION 'Invalid classroom code';
  END IF;

  SELECT * INTO classroom_row
  FROM public.classrooms
  WHERE upper(code) = normalized_code
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Classroom not found';
  END IF;

  SELECT * INTO user_row
  FROM public.users
  WHERE uid = caller_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  INSERT INTO public.classroom_students (
    id, class_id, class_code, student_id, student_name, student_photo, joined_at, last_active
  ) VALUES (
    gen_random_uuid()::text,
    classroom_row.id,
    classroom_row.code,
    caller_id,
    coalesce(nullif(user_row.name, ''), 'طالب QuizSpace'),
    user_row.photo_url,
    now(),
    now()
  )
  ON CONFLICT (class_id, student_id)
  DO UPDATE SET last_active = now();

  RETURN jsonb_build_object(
    'id', classroom_row.id,
    'name', classroom_row.name,
    'code', classroom_row.code,
    'created_at', classroom_row.created_at,
    'created_by', classroom_row.created_by,
    'creator_name', classroom_row.creator_name,
    'allow_student_messages', classroom_row.allow_student_messages,
    'allow_student_media', classroom_row.allow_student_media
  );
END;
$$;

REVOKE ALL ON FUNCTION public.join_classroom_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_classroom_by_code(text) TO authenticated;

-- >>> ORIGIN: supabase/migrations/20260828_private_knowledge_duels.sql

-- Private, opt-in knowledge duels. There is no public leaderboard and answers stay server-side.

CREATE TABLE IF NOT EXISTS public.knowledge_duel_question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL CHECK (topic IN ('math')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('basic')),
  prompt_ar TEXT NOT NULL,
  prompt_en TEXT NOT NULL,
  options JSONB NOT NULL CHECK (jsonb_typeof(options) = 'array' AND jsonb_array_length(options) BETWEEN 2 AND 6),
  normalized_answer TEXT NOT NULL CHECK (char_length(normalized_answer) BETWEEN 1 AND 40),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.knowledge_duels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code TEXT NOT NULL UNIQUE CHECK (invite_code ~ '^[A-Z0-9]{8}$'),
  creator_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  topic TEXT NOT NULL CHECK (topic IN ('math')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('basic')),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'expired', 'cancelled')),
  question_count SMALLINT NOT NULL DEFAULT 5 CHECK (question_count BETWEEN 3 AND 5),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.knowledge_duel_participants (
  duel_id UUID NOT NULL REFERENCES public.knowledge_duels(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  seat SMALLINT NOT NULL CHECK (seat IN (1, 2)),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (duel_id, user_id),
  UNIQUE (duel_id, seat)
);

CREATE TABLE IF NOT EXISTS public.knowledge_duel_rounds (
  duel_id UUID NOT NULL REFERENCES public.knowledge_duels(id) ON DELETE CASCADE,
  sequence SMALLINT NOT NULL CHECK (sequence BETWEEN 1 AND 5),
  question_id UUID NOT NULL REFERENCES public.knowledge_duel_question_bank(id) ON DELETE RESTRICT,
  PRIMARY KEY (duel_id, sequence),
  UNIQUE (duel_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.knowledge_duel_answers (
  duel_id UUID NOT NULL REFERENCES public.knowledge_duels(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  sequence SMALLINT NOT NULL CHECK (sequence BETWEEN 1 AND 5),
  answer TEXT NOT NULL CHECK (char_length(answer) BETWEEN 1 AND 100),
  is_correct BOOLEAN NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (duel_id, user_id, sequence)
);

CREATE INDEX IF NOT EXISTS knowledge_duels_creator_created_idx ON public.knowledge_duels(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS knowledge_duel_participants_user_idx ON public.knowledge_duel_participants(user_id, joined_at DESC);
CREATE INDEX IF NOT EXISTS knowledge_duel_answers_user_idx ON public.knowledge_duel_answers(user_id, submitted_at DESC);

ALTER TABLE public.knowledge_duel_question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_duel_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_duel_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_duel_answers ENABLE ROW LEVEL SECURITY;

INSERT INTO public.knowledge_duel_question_bank(topic, difficulty, prompt_ar, prompt_en, options, normalized_answer)
VALUES
  ('math', 'basic', 'ما ناتج 8 × 7؟', 'What is 8 × 7?', '["48","54","56","64"]'::jsonb, '56'),
  ('math', 'basic', 'ما الجذر التربيعي للعدد 81؟', 'What is the square root of 81?', '["7","8","9","10"]'::jsonb, '9'),
  ('math', 'basic', 'ما ناتج 144 ÷ 12؟', 'What is 144 ÷ 12?', '["10","11","12","13"]'::jsonb, '12'),
  ('math', 'basic', 'كم ضلعاً للمثلث؟', 'How many sides does a triangle have?', '["2","3","4","5"]'::jsonb, '3'),
  ('math', 'basic', 'ما ناتج 25% من 200؟', 'What is 25% of 200?', '["25","40","50","75"]'::jsonb, '50')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.expire_private_knowledge_duel(p_duel_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.knowledge_duels
  SET status = 'expired', updated_at = now()
  WHERE id = p_duel_id AND status IN ('waiting', 'active') AND expires_at <= now();
END;
$$;

CREATE OR REPLACE FUNCTION public.create_private_knowledge_duel(p_topic TEXT DEFAULT 'math', p_difficulty TEXT DEFAULT 'basic')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_duel_id UUID;
  v_code TEXT;
  v_question_ids UUID[];
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_topic <> 'math' OR p_difficulty <> 'basic' THEN RAISE EXCEPTION 'Unsupported duel scope'; END IF;
  IF (SELECT COUNT(*) FROM public.knowledge_duels WHERE creator_id = v_user_id AND created_at >= now() - INTERVAL '24 hours') >= 3 THEN
    RAISE EXCEPTION 'Daily duel creation limit reached';
  END IF;
  SELECT ARRAY_AGG(id ORDER BY random()) INTO v_question_ids
  FROM (SELECT id FROM public.knowledge_duel_question_bank WHERE topic = p_topic AND difficulty = p_difficulty AND is_active = true ORDER BY random() LIMIT 5) q;
  IF COALESCE(array_length(v_question_ids, 1), 0) <> 5 THEN RAISE EXCEPTION 'Duel question set is unavailable'; END IF;
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  INSERT INTO public.knowledge_duels(invite_code, creator_id, topic, difficulty, expires_at)
  VALUES (v_code, v_user_id, p_topic, p_difficulty, now() + INTERVAL '15 minutes') RETURNING id INTO v_duel_id;
  INSERT INTO public.knowledge_duel_participants(duel_id, user_id, seat) VALUES (v_duel_id, v_user_id, 1);
  INSERT INTO public.knowledge_duel_rounds(duel_id, sequence, question_id)
  SELECT v_duel_id, ordinality::smallint, question_id FROM unnest(v_question_ids) WITH ORDINALITY AS x(question_id, ordinality);
  RETURN jsonb_build_object('duel_id', v_duel_id, 'invite_code', v_code, 'expires_at', now() + INTERVAL '15 minutes', 'status', 'waiting');
END;
$$;

CREATE OR REPLACE FUNCTION public.join_private_knowledge_duel(p_invite_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_duel public.knowledge_duels%ROWTYPE;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_duel FROM public.knowledge_duels WHERE invite_code = upper(trim(COALESCE(p_invite_code, ''))) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Duel invitation was not found'; END IF;
  PERFORM public.expire_private_knowledge_duel(v_duel.id);
  SELECT * INTO v_duel FROM public.knowledge_duels WHERE id = v_duel.id FOR UPDATE;
  IF v_duel.status <> 'waiting' THEN RAISE EXCEPTION 'Duel invitation is no longer available'; END IF;
  IF v_duel.creator_id = v_user_id THEN RAISE EXCEPTION 'The creator cannot join their own duel'; END IF;
  IF EXISTS (SELECT 1 FROM public.knowledge_duel_participants WHERE duel_id = v_duel.id AND user_id = v_user_id) THEN RAISE EXCEPTION 'Already joined'; END IF;
  INSERT INTO public.knowledge_duel_participants(duel_id, user_id, seat) VALUES (v_duel.id, v_user_id, 2);
  UPDATE public.knowledge_duels SET status = 'active', updated_at = now() WHERE id = v_duel.id;
  RETURN jsonb_build_object('duel_id', v_duel.id, 'status', 'active');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_private_knowledge_duel_state(p_duel_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_duel public.knowledge_duels%ROWTYPE;
  v_answered INTEGER := 0;
  v_my_score INTEGER := 0;
  v_opponent_score INTEGER := 0;
  v_round JSONB := NULL;
  v_other_complete BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.knowledge_duel_participants WHERE duel_id = p_duel_id AND user_id = v_user_id) THEN RAISE EXCEPTION 'Not a duel participant'; END IF;
  PERFORM public.expire_private_knowledge_duel(p_duel_id);
  SELECT * INTO v_duel FROM public.knowledge_duels WHERE id = p_duel_id;
  SELECT COUNT(*)::integer, COUNT(*) FILTER (WHERE is_correct)::integer INTO v_answered, v_my_score FROM public.knowledge_duel_answers WHERE duel_id = p_duel_id AND user_id = v_user_id;
  IF v_duel.status = 'active' AND v_answered < v_duel.question_count THEN
    SELECT jsonb_build_object('sequence', r.sequence, 'prompt_ar', q.prompt_ar, 'prompt_en', q.prompt_en, 'options', q.options)
    INTO v_round FROM public.knowledge_duel_rounds r JOIN public.knowledge_duel_question_bank q ON q.id = r.question_id
    WHERE r.duel_id = p_duel_id AND r.sequence = v_answered + 1;
  END IF;
  IF v_duel.status = 'completed' THEN
    SELECT COUNT(*) FILTER (WHERE a.is_correct)::integer INTO v_opponent_score
    FROM public.knowledge_duel_answers a WHERE a.duel_id = p_duel_id AND a.user_id <> v_user_id;
  ELSE
    SELECT EXISTS(SELECT 1 FROM public.knowledge_duel_participants WHERE duel_id = p_duel_id AND user_id <> v_user_id AND completed_at IS NOT NULL) INTO v_other_complete;
  END IF;
  RETURN jsonb_build_object('status', v_duel.status, 'topic', v_duel.topic, 'difficulty', v_duel.difficulty, 'expires_at', v_duel.expires_at, 'question_count', v_duel.question_count, 'answered_count', v_answered, 'round', v_round, 'opponent_finished', v_other_complete, 'result', CASE WHEN v_duel.status = 'completed' THEN jsonb_build_object('my_score', v_my_score, 'opponent_score', v_opponent_score, 'outcome', CASE WHEN v_my_score > v_opponent_score THEN 'win' WHEN v_my_score = v_opponent_score THEN 'tie' ELSE 'loss' END) ELSE NULL END);
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_private_knowledge_duel_answer(p_duel_id UUID, p_sequence SMALLINT, p_answer TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_duel public.knowledge_duels%ROWTYPE;
  v_correct TEXT;
  v_answered INTEGER := 0;
  v_complete_count INTEGER := 0;
  v_is_correct BOOLEAN;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF char_length(trim(COALESCE(p_answer, ''))) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid answer'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.knowledge_duel_participants WHERE duel_id = p_duel_id AND user_id = v_user_id) THEN RAISE EXCEPTION 'Not a duel participant'; END IF;
  PERFORM public.expire_private_knowledge_duel(p_duel_id);
  SELECT * INTO v_duel FROM public.knowledge_duels WHERE id = p_duel_id FOR UPDATE;
  IF NOT FOUND OR v_duel.status <> 'active' THEN RAISE EXCEPTION 'Duel is not active'; END IF;
  SELECT COUNT(*)::integer INTO v_answered FROM public.knowledge_duel_answers WHERE duel_id = p_duel_id AND user_id = v_user_id;
  IF p_sequence <> v_answered + 1 OR p_sequence > v_duel.question_count THEN RAISE EXCEPTION 'Answer sequence is not available'; END IF;
  SELECT q.normalized_answer INTO v_correct FROM public.knowledge_duel_rounds r JOIN public.knowledge_duel_question_bank q ON q.id = r.question_id WHERE r.duel_id = p_duel_id AND r.sequence = p_sequence;
  IF v_correct IS NULL THEN RAISE EXCEPTION 'Question is not available'; END IF;
  v_is_correct := lower(trim(p_answer)) = lower(trim(v_correct));
  INSERT INTO public.knowledge_duel_answers(duel_id, user_id, sequence, answer, is_correct) VALUES (p_duel_id, v_user_id, p_sequence, trim(p_answer), v_is_correct);
  IF p_sequence = v_duel.question_count THEN UPDATE public.knowledge_duel_participants SET completed_at = now() WHERE duel_id = p_duel_id AND user_id = v_user_id; END IF;
  SELECT COUNT(*)::integer INTO v_complete_count FROM public.knowledge_duel_participants WHERE duel_id = p_duel_id AND completed_at IS NOT NULL;
  IF v_complete_count = 2 THEN UPDATE public.knowledge_duels SET status = 'completed', completed_at = now(), updated_at = now() WHERE id = p_duel_id; END IF;
  RETURN jsonb_build_object('accepted', true, 'answered_count', p_sequence, 'completed', v_complete_count = 2);
END;
$$;

REVOKE ALL ON FUNCTION public.expire_private_knowledge_duel(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_private_knowledge_duel(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_private_knowledge_duel(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_private_knowledge_duel_state(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_private_knowledge_duel_answer(UUID, SMALLINT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_private_knowledge_duel(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_private_knowledge_duel(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_private_knowledge_duel_state(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_private_knowledge_duel_answer(UUID, SMALLINT, TEXT) TO authenticated;

-- >>> ORIGIN: supabase/migrations/20260829_private_duel_direct_access_policy.sql

-- Private duel records are intentionally available only through SECURITY DEFINER RPCs.
-- Explicit false policies retain RLS default-deny behavior while documenting the boundary.
CREATE POLICY "knowledge_duel_question_bank_direct_access_denied" ON public.knowledge_duel_question_bank
FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "knowledge_duels_direct_access_denied" ON public.knowledge_duels
FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "knowledge_duel_participants_direct_access_denied" ON public.knowledge_duel_participants
FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "knowledge_duel_rounds_direct_access_denied" ON public.knowledge_duel_rounds
FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "knowledge_duel_answers_direct_access_denied" ON public.knowledge_duel_answers
FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- >>> ORIGIN: supabase/migrations/20260830_motivation_usage_analytics.sql

-- Privacy-preserving Motivation Hub usage telemetry.
-- One row per authenticated learner, tab, event type, and UTC date keeps the
-- data set bounded and records daily unique engagement rather than click trails.

CREATE TABLE IF NOT EXISTS public.motivation_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  tab TEXT NOT NULL CHECK (tab IN (
    'motivation', 'motivation-lucky', 'motivation-brain', 'motivation-review',
    'motivation-season', 'motivation-duel', 'motivation-store'
  )),
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'engaged')),
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tab, event_type, event_date)
);

CREATE INDEX IF NOT EXISTS motivation_usage_events_date_tab_idx
  ON public.motivation_usage_events (event_date DESC, tab, event_type);

ALTER TABLE public.motivation_usage_events ENABLE ROW LEVEL SECURITY;

-- The client must use the validated RPC boundary.  Neither learners nor
-- administrators can read or alter raw event rows directly.
REVOKE ALL ON TABLE public.motivation_usage_events FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS motivation_usage_events_no_direct_access ON public.motivation_usage_events;
CREATE POLICY motivation_usage_events_no_direct_access
  ON public.motivation_usage_events
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.record_motivation_usage_event(
  p_tab TEXT,
  p_event_type TEXT DEFAULT 'view'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  IF p_tab NOT IN (
    'motivation', 'motivation-lucky', 'motivation-brain', 'motivation-review',
    'motivation-season', 'motivation-duel', 'motivation-store'
  ) OR p_event_type NOT IN ('view', 'engaged') THEN
    RAISE EXCEPTION 'Invalid motivation usage event';
  END IF;

  INSERT INTO public.motivation_usage_events (user_id, tab, event_type)
  VALUES (v_user_id, p_tab, p_event_type)
  ON CONFLICT (user_id, tab, event_type, event_date) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_motivation_usage_summary(
  p_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_days INTEGER := COALESCE(p_days, 30);
BEGIN
  IF v_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users WHERE uid = v_user_id AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Administrator privileges are required';
  END IF;

  IF v_days < 7 OR v_days > 90 THEN
    RAISE EXCEPTION 'Invalid reporting window';
  END IF;

  RETURN (
    WITH tabs(tab, sort_order) AS (
      VALUES
        ('motivation', 1), ('motivation-lucky', 2), ('motivation-brain', 3),
        ('motivation-review', 4), ('motivation-season', 5),
        ('motivation-duel', 6), ('motivation-store', 7)
    ), events AS (
      SELECT tab, event_type, event_date, user_id
      FROM public.motivation_usage_events
      WHERE event_date >= CURRENT_DATE - (v_days - 1)
    ), tab_stats AS (
      SELECT
        t.tab,
        t.sort_order,
        COUNT(e.*) FILTER (WHERE e.event_type = 'view')::INTEGER AS unique_daily_opens,
        COUNT(DISTINCT e.user_id) FILTER (WHERE e.event_type = 'view')::INTEGER AS unique_learners,
        COUNT(e.*) FILTER (WHERE e.event_type = 'engaged')::INTEGER AS unique_daily_engagements
      FROM tabs t
      LEFT JOIN events e ON e.tab = t.tab
      GROUP BY t.tab, t.sort_order
    ), daily_stats AS (
      SELECT
        d.day::DATE AS day,
        COUNT(e.*) FILTER (WHERE e.event_type = 'view')::INTEGER AS unique_daily_opens,
        COUNT(DISTINCT e.user_id) FILTER (WHERE e.event_type = 'view')::INTEGER AS unique_learners
      FROM generate_series(CURRENT_DATE - (v_days - 1), CURRENT_DATE, INTERVAL '1 day') AS d(day)
      LEFT JOIN events e ON e.event_date = d.day::DATE
      GROUP BY d.day
      ORDER BY d.day
    )
    SELECT jsonb_build_object(
      'window_days', v_days,
      'total_unique_daily_opens', COALESCE((SELECT SUM(unique_daily_opens) FROM tab_stats), 0),
      'total_unique_learners', COALESCE((SELECT COUNT(DISTINCT user_id) FROM events WHERE event_type = 'view'), 0),
      'total_unique_daily_engagements', COALESCE((SELECT SUM(unique_daily_engagements) FROM tab_stats), 0),
      'tabs', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'tab', tab,
        'unique_daily_opens', unique_daily_opens,
        'unique_learners', unique_learners,
        'unique_daily_engagements', unique_daily_engagements
      ) ORDER BY sort_order) FROM tab_stats), '[]'::JSONB),
      'daily', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'date', day,
        'unique_daily_opens', unique_daily_opens,
        'unique_learners', unique_learners
      ) ORDER BY day) FROM daily_stats), '[]'::JSONB)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_motivation_usage_event(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_motivation_usage_summary(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_motivation_usage_event(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_motivation_usage_summary(INTEGER) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260831_notification_lesson_and_platform_settings_access.sql

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

-- >>> ORIGIN: supabase/migrations/20260832_correct_zero_priced_point_bundles.sql

-- The two point bundles were visible as 0 EGP and awarded zero points.
-- Keep payment-only bundles cash-priced and make their rewards explicit.
UPDATE public.reward_store_items
SET
  price_egp = 25.00,
  price_coins = 0,
  reward_points = 500,
  updated_at = now()
WHERE id = 'bundle_small';

UPDATE public.reward_store_items
SET
  price_egp = 120.00,
  price_coins = 0,
  reward_points = 2500,
  updated_at = now()
WHERE id = 'bundle_large';

-- >>> ORIGIN: supabase/migrations/20260833_learning_streak_user_isolation.sql

-- Learning streaks are private, canonical state keyed exclusively by auth.uid().
-- The legacy reward-balance streak remains a denormalized display mirror only.

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own streak" ON public.user_streaks;
DROP POLICY IF EXISTS "Users can update own streak" ON public.user_streaks;
DROP POLICY IF EXISTS "Users can insert own streak" ON public.user_streaks;

CREATE POLICY "Users can manage only their own streak" ON public.user_streaks
  FOR ALL TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE UNIQUE INDEX IF NOT EXISTS user_streaks_user_id_unique_idx
  ON public.user_streaks (user_id);

CREATE OR REPLACE FUNCTION public.update_daily_streak()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today DATE := current_date;
  v_last DATE;
  v_current INTEGER;
  v_longest INTEGER;
  v_protection INTEGER;
  v_points INTEGER;
  v_used_protection BOOLEAN := false;
  v_earned_protection BOOLEAN := false;
  v_reward JSONB;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.user_streaks (
    id, user_id, current_streak, longest_streak, last_login_date, streak_points, protection_days
  ) VALUES (
    gen_random_uuid()::text, v_user_id, 0, 0, '', 0, 1
  ) ON CONFLICT (user_id) DO NOTHING;

  SELECT current_streak, longest_streak, NULLIF(last_login_date, '')::date, protection_days
    INTO v_current, v_longest, v_last, v_protection
  FROM public.user_streaks
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_last = v_today THEN
    RETURN jsonb_build_object(
      'success', true,
      'streak', v_current,
      'points', 0,
      'protection_days', v_protection,
      'message', 'Already checked in today'
    );
  END IF;

  IF v_last IS NULL THEN
    v_current := 1;
    v_longest := GREATEST(COALESCE(v_longest, 0), 1);
  ELSIF v_last = v_today - 1 THEN
    v_current := v_current + 1;
  ELSIF v_last = v_today - 2 AND v_protection > 0 THEN
    v_current := v_current + 1;
    v_protection := v_protection - 1;
    v_used_protection := true;
  ELSE
    v_current := 1;
  END IF;

  v_longest := GREATEST(v_longest, v_current);
  IF v_current >= 7 AND mod(v_current, 7) = 0 AND v_protection < 2 THEN
    v_protection := v_protection + 1;
    v_earned_protection := true;
  END IF;

  v_points := CASE
    WHEN v_current >= 30 THEN 200
    WHEN v_current >= 14 THEN 100
    WHEN v_current >= 7 THEN 50
    WHEN v_current >= 3 THEN 20
    ELSE 5
  END;

  UPDATE public.user_streaks
  SET current_streak = v_current,
      longest_streak = v_longest,
      last_login_date = v_today::text,
      streak_points = streak_points + v_points,
      protection_days = v_protection,
      last_protection_earned_at = CASE WHEN v_earned_protection THEN v_today ELSE last_protection_earned_at END,
      last_protection_used_for = CASE WHEN v_used_protection THEN v_today - 1 ELSE last_protection_used_for END,
      updated_at = now()
  WHERE user_id = v_user_id;

  v_reward := public.grant_reward_points(
    v_user_id,
    v_points,
    'daily_streak',
    'daily_streak:' || v_today::text,
    v_today::text,
    jsonb_build_object(
      'streak', v_current,
      'used_protection', v_used_protection,
      'earned_protection', v_earned_protection
    )
  );

  INSERT INTO public.user_reward_balances (user_id, points, daily_streak, last_daily_claim, level)
  VALUES (v_user_id, 0, v_current, v_today, public.reward_level_for_points(0))
  ON CONFLICT (user_id) DO UPDATE
  SET daily_streak = EXCLUDED.daily_streak,
      last_daily_claim = EXCLUDED.last_daily_claim,
      updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'streak', v_current,
    'points', COALESCE((v_reward->>'points_awarded')::integer, 0),
    'protection_days', v_protection,
    'used_protection', v_used_protection,
    'earned_protection', v_earned_protection
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_learning_streak_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_streak public.user_streaks%ROWTYPE;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_streak
  FROM public.user_streaks
  WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'current_streak', 0,
      'longest_streak', 0,
      'protection_days', 1,
      'checked_in_today', false
    );
  END IF;

  RETURN jsonb_build_object(
    'current_streak', v_streak.current_streak,
    'longest_streak', v_streak.longest_streak,
    'protection_days', v_streak.protection_days,
    'checked_in_today', NULLIF(v_streak.last_login_date, '')::date = current_date,
    'last_login_date', v_streak.last_login_date,
    'last_protection_earned_at', v_streak.last_protection_earned_at,
    'last_protection_used_for', v_streak.last_protection_used_for
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_daily_streak() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_learning_streak_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_daily_streak() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_learning_streak_status() TO authenticated;

-- >>> ORIGIN: supabase/migrations/20260834_weekly_task_notification_type.sql

-- Weekly-task claims create a user notification after the ledger and balance
-- updates. The type must be accepted so the entire claim transaction commits.
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('info', 'community', 'system', 'promotion', 'lesson', 'weekly_task'));

-- >>> ORIGIN: supabase/migrations/20260835_secure_single_brain_challenge_attempt.sql

-- A daily brain question must be answered at most once per user. A separate
-- claim table makes the policy safe under concurrent submissions and preserves
-- historic multi-attempt rows without deleting learning history.
CREATE TABLE IF NOT EXISTS public.brain_challenge_daily_claims (
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  challenge_date TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, challenge_date)
);

ALTER TABLE public.brain_challenge_daily_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brain_challenge_daily_claims_own_read ON public.brain_challenge_daily_claims;
CREATE POLICY brain_challenge_daily_claims_own_read ON public.brain_challenge_daily_claims
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid())::text);

-- Existing entries count as a completed attempt for their historical day.
INSERT INTO public.brain_challenge_daily_claims (user_id, challenge_date)
SELECT DISTINCT user_id, challenge_date
FROM public.brain_challenge_attempts
ON CONFLICT (user_id, challenge_date) DO NOTHING;

-- Client writes could otherwise bypass the RPC's one-attempt rule.
DROP POLICY IF EXISTS "Users can insert own attempts" ON public.brain_challenge_attempts;

CREATE OR REPLACE FUNCTION public.get_daily_brain_challenge()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today TEXT := to_char(now(), 'YYYY-MM-DD');
  v_questions TEXT[] := ARRAY[
    'ما هو الجذر التربيعي لـ 144؟', 'كم عدد أضلاع المثلث؟', 'ما هو ناتج 7 × 8؟',
    'ما هو اللون الناتج من مزج الأحمر والأزرق؟', 'كم ساعة في اليوم؟', 'ما هو عكس كلمة سريع؟',
    'كم صفر في المليون؟', 'ما هو الحيوان الوطني لمصر؟'
  ];
  v_q_idx INTEGER := mod(extract(doy from now())::integer - 1, 8) + 1;
  v_attempted BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.brain_challenge_daily_claims
    WHERE user_id = v_user_id AND challenge_date = v_today
  ) INTO v_attempted;

  RETURN jsonb_build_object(
    'challenge_date', v_today,
    'question', v_questions[v_q_idx],
    'attempts_today', CASE WHEN v_attempted THEN 1 ELSE 0 END,
    'attempts_remaining', CASE WHEN v_attempted THEN 0 ELSE 1 END,
    'attempted', v_attempted
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_brain_challenge(p_answer TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today TEXT := to_char(now(), 'YYYY-MM-DD');
  v_correct_answer TEXT;
  v_question TEXT;
  v_is_correct BOOLEAN;
  v_points INTEGER := 0;
  v_questions TEXT[] := ARRAY[
    'ما هو الجذر التربيعي لـ 144؟', 'كم عدد أضلاع المثلث؟', 'ما هو ناتج 7 × 8؟',
    'ما هو اللون الناتج من مزج الأحمر والأزرق؟', 'كم ساعة في اليوم؟', 'ما هو عكس كلمة سريع؟',
    'كم صفر في المليون؟', 'ما هو الحيوان الوطني لمصر؟'
  ];
  v_answers TEXT[] := ARRAY['12', '3', '56', 'أرجواني', '24', 'بطيء', '6', 'النسر'];
  v_q_idx INTEGER := mod(extract(doy from now())::integer - 1, 8) + 1;
  v_reward JSONB;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_answer IS NULL OR length(trim(p_answer)) = 0 OR length(p_answer) > 300 THEN
    RAISE EXCEPTION 'Invalid answer';
  END IF;

  INSERT INTO public.brain_challenge_daily_claims (user_id, challenge_date)
  VALUES (v_user_id, v_today)
  ON CONFLICT (user_id, challenge_date) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'already_attempted',
      'attempted', true,
      'attempts_remaining', 0
    );
  END IF;

  v_question := v_questions[v_q_idx];
  v_correct_answer := v_answers[v_q_idx];
  v_is_correct := lower(trim(p_answer)) = lower(trim(v_correct_answer));
  IF v_is_correct THEN v_points := 20; END IF;

  INSERT INTO public.brain_challenge_attempts (
    id, user_id, challenge_date, question_text, answer_submitted,
    is_correct, points_earned, attempt_order
  ) VALUES (
    gen_random_uuid()::text, v_user_id, v_today, v_question, trim(p_answer),
    v_is_correct, v_points, 1
  );

  IF v_is_correct THEN
    v_reward := public.grant_reward_points(
      v_user_id, v_points, 'brain_challenge', 'brain_challenge:' || v_today,
      v_today, jsonb_build_object('question', v_question)
    );
  ELSE
    v_reward := jsonb_build_object(
      'points_awarded', 0,
      'total_points', (SELECT points FROM public.user_reward_balances WHERE user_id = v_user_id)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'is_correct', v_is_correct,
    'points', coalesce((v_reward->>'points_awarded')::integer, 0),
    'total_points', coalesce((v_reward->>'total_points')::integer, 0),
    'attempted', true,
    'attempts_remaining', 0,
    'reason', CASE WHEN v_is_correct THEN NULL ELSE 'incorrect' END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_daily_brain_challenge() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_brain_challenge(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_daily_brain_challenge() TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_brain_challenge(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260836_repair_daily_quiz_rewards.sql

-- Daily quizzes are private payloads, so their identifiers are intentionally
-- absent from public.quizzes. Store their results separately instead of
-- violating completions.quiz_id's foreign key.
CREATE TABLE IF NOT EXISTS public.daily_quiz_completions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  quiz_id TEXT NOT NULL,
  quiz_title TEXT NOT NULL DEFAULT 'Daily Challenge',
  taker_name TEXT NOT NULL DEFAULT 'طالب متميز',
  score INTEGER NOT NULL CHECK (score >= 0),
  total_questions INTEGER NOT NULL CHECK (total_questions > 0),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  feedback TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, quiz_id)
);

ALTER TABLE public.daily_quiz_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS daily_quiz_completions_own_read ON public.daily_quiz_completions;
CREATE POLICY daily_quiz_completions_own_read ON public.daily_quiz_completions
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid())::text);

-- Drop first because the response shape adds reward status for the client.
DROP FUNCTION IF EXISTS public.submit_user_daily_quiz_attempt(TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION public.submit_user_daily_quiz_attempt(
  p_quiz_id TEXT,
  p_taker_id TEXT,
  p_taker_name TEXT,
  p_score INTEGER,
  p_total_questions INTEGER,
  p_rating INTEGER DEFAULT NULL,
  p_feedback TEXT DEFAULT ''
)
RETURNS TABLE(
  id TEXT,
  quiz_id TEXT,
  taker_id TEXT,
  taker_name TEXT,
  score INTEGER,
  total_questions INTEGER,
  rating INTEGER,
  feedback TEXT,
  created_at TIMESTAMPTZ,
  xp_awarded INTEGER,
  points_awarded INTEGER,
  total_points INTEGER,
  daily_completed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_completion public.daily_quiz_completions%ROWTYPE;
  v_completion_id TEXT;
  v_quiz_xp INTEGER := 0;
  v_points INTEGER := 0;
  v_points_awarded INTEGER := 0;
  v_total_points INTEGER := 0;
  v_rows INTEGER := 0;
  v_inserted BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_taker_id IS NULL OR p_taker_id <> v_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_quiz_id IS NULL OR p_quiz_id !~ '^daily-[A-Za-z0-9-]{8,200}$' THEN
    RAISE EXCEPTION 'Invalid daily quiz identifier';
  END IF;

  IF p_score IS NULL OR p_total_questions IS NULL OR p_total_questions < 1
    OR p_score < 0 OR p_score > p_total_questions THEN
    RAISE EXCEPTION 'Invalid quiz score';
  END IF;

  IF p_rating IS NOT NULL AND (p_rating < 1 OR p_rating > 5) THEN
    RAISE EXCEPTION 'Invalid quiz rating';
  END IF;

  IF length(COALESCE(p_feedback, '')) > 4000 THEN
    RAISE EXCEPTION 'Feedback is too long';
  END IF;

  -- Lock the active private slot. A retry after a committed success returns
  -- the original result without re-awarding points; a competing submission
  -- waits on this lock and follows the same idempotent path.
  PERFORM 1
  FROM public.daily_quiz_user_slots
  WHERE user_id = v_user_id
    AND quiz_payload->>'id' = p_quiz_id
    AND answered_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    SELECT * INTO v_completion
    FROM public.daily_quiz_completions
    WHERE user_id = v_user_id AND daily_quiz_completions.quiz_id = p_quiz_id
    LIMIT 1;

    IF FOUND THEN
      UPDATE public.daily_quiz_completions AS daily_completion
      SET rating = COALESCE(p_rating, v_completion.rating),
          feedback = CASE WHEN COALESCE(p_feedback, '') = '' THEN v_completion.feedback ELSE p_feedback END,
          taker_name = COALESCE(NULLIF(trim(p_taker_name), ''), v_completion.taker_name),
          updated_at = now()
      WHERE daily_completion.id = v_completion.id
      RETURNING * INTO v_completion;

      SELECT COALESCE(points, 0) INTO v_total_points
      FROM public.user_reward_balances
      WHERE user_id = v_user_id;

      RETURN QUERY SELECT
        v_completion.id,
        v_completion.quiz_id,
        v_completion.user_id,
        v_completion.taker_name,
        v_completion.score,
        v_completion.total_questions,
        v_completion.rating,
        v_completion.feedback,
        v_completion.created_at,
        0,
        0,
        COALESCE(v_total_points, 0),
        true;
      RETURN;
    END IF;

    RAISE EXCEPTION 'Daily quiz is unavailable';
  END IF;

  SELECT * INTO v_completion
  FROM public.daily_quiz_completions
  WHERE user_id = v_user_id AND daily_quiz_completions.quiz_id = p_quiz_id
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.daily_quiz_completions AS daily_completion
    SET rating = COALESCE(p_rating, v_completion.rating),
        feedback = CASE WHEN COALESCE(p_feedback, '') = '' THEN v_completion.feedback ELSE p_feedback END,
        taker_name = COALESCE(NULLIF(trim(p_taker_name), ''), v_completion.taker_name),
        updated_at = now()
    WHERE daily_completion.id = v_completion.id
    RETURNING * INTO v_completion;
  ELSE
    v_completion_id := 'daily_comp_' || extract(epoch FROM now())::bigint || '_' || substr(md5(random()::text), 1, 8);
    v_quiz_xp := 10 + (p_score * 10);
    v_points := 10 + (p_score * 2);

    IF (p_score::numeric / p_total_questions::numeric) >= 0.80 THEN
      v_points := v_points + 15;
    END IF;

    IF p_score >= p_total_questions THEN
      v_points := v_points + 30;
    END IF;

    INSERT INTO public.daily_quiz_completions (
      id, user_id, quiz_id, quiz_title, taker_name, score, total_questions, rating, feedback
    ) VALUES (
      v_completion_id,
      v_user_id,
      p_quiz_id,
      'Daily Challenge',
      COALESCE(NULLIF(trim(p_taker_name), ''), 'طالب متميز'),
      p_score,
      p_total_questions,
      p_rating,
      COALESCE(p_feedback, '')
    )
    RETURNING * INTO v_completion;

    INSERT INTO public.reward_points_ledger (
      user_id, points, event_type, event_key, reference_id, metadata
    ) VALUES (
      v_user_id,
      v_points,
      'quiz_completion',
      'quiz_completion:' || v_completion.id,
      v_completion.id,
      jsonb_build_object(
        'quiz_id', v_completion.quiz_id,
        'score', v_completion.score,
        'total_questions', v_completion.total_questions,
        'source', 'daily_quiz'
      )
    )
    ON CONFLICT (user_id, event_key) DO NOTHING;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_inserted := v_rows > 0;

    IF v_inserted THEN
      v_points_awarded := v_points;
      INSERT INTO public.user_reward_balances (user_id, points, level)
      VALUES (v_user_id, v_points, public.reward_level_for_points(v_points))
      ON CONFLICT (user_id) DO UPDATE
      SET points = public.user_reward_balances.points + v_points,
          level = public.reward_level_for_points(public.user_reward_balances.points + v_points),
          updated_at = now()
      RETURNING points INTO v_total_points;

      UPDATE public.users
      SET xp = COALESCE(xp, 0) + v_quiz_xp + (v_points * 10),
          updated_at = now()
      WHERE uid::text = v_user_id;
    END IF;
  END IF;

  IF NOT v_inserted THEN
    SELECT COALESCE(points, 0) INTO v_total_points
    FROM public.user_reward_balances
    WHERE user_id = v_user_id;
  END IF;

  UPDATE public.daily_quiz_user_slots
  SET quiz_payload = NULL,
      quiz_id = NULL,
      answered_at = now(),
      next_available_at = now() + refresh_interval_seconds * interval '1 second',
      refreshing = false
  WHERE user_id = v_user_id
    AND quiz_payload->>'id' = p_quiz_id;

  RETURN QUERY SELECT
    v_completion.id,
    v_completion.quiz_id,
    v_completion.user_id,
    v_completion.taker_name,
    v_completion.score,
    v_completion.total_questions,
    v_completion.rating,
    v_completion.feedback,
    v_completion.created_at,
    v_quiz_xp,
    v_points_awarded,
    COALESCE(v_total_points, 0),
    true;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_user_daily_quiz_attempt(TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_user_daily_quiz_attempt(TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT) TO authenticated;

-- >>> ORIGIN: supabase/migrations/20260837_extend_legacy_daily_quiz_completion_records.sql

-- An earlier daily-slot migration already created this table as a minimal
-- completion marker. Extend that live schema before the reward-aware RPC uses
-- it as the canonical daily completion record.
ALTER TABLE public.daily_quiz_completions
  ADD COLUMN IF NOT EXISTS id TEXT,
  ADD COLUMN IF NOT EXISTS quiz_title TEXT NOT NULL DEFAULT 'Daily Challenge',
  ADD COLUMN IF NOT EXISTS taker_name TEXT NOT NULL DEFAULT 'طالب متميز',
  ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_questions INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS rating INTEGER,
  ADD COLUMN IF NOT EXISTS feedback TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE public.daily_quiz_completions
SET id = COALESCE(id, 'daily_comp_' || substr(md5(user_id || ':' || quiz_id), 1, 24)),
    created_at = COALESCE(created_at, completed_at, now()),
    updated_at = COALESCE(updated_at, completed_at, now());

ALTER TABLE public.daily_quiz_completions
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS daily_quiz_completions_id_key
  ON public.daily_quiz_completions (id);

-- >>> ORIGIN: supabase/migrations/20260838_set_daily_completion_timestamps.sql

-- The legacy table gained timestamps through a nullable extension migration.
-- Keep its future inserts safe even when callers omit these bookkeeping fields.
ALTER TABLE public.daily_quiz_completions
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

-- >>> ORIGIN: supabase/migrations/20260839_fix_daily_completion_retry_ambiguity.sql

-- Qualify the completion identifier in the retry-only update path. The table
-- function exposes an output column named id, so the unqualified reference is
-- ambiguous after the first successful submission closes the private slot.
DO $$
DECLARE
  v_definition TEXT;
BEGIN
  SELECT pg_get_functiondef(p.oid)
  INTO v_definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'submit_user_daily_quiz_attempt'
  LIMIT 1;

  IF v_definition IS NULL THEN
    RAISE EXCEPTION 'submit_user_daily_quiz_attempt is missing';
  END IF;

  v_definition := replace(
    v_definition,
    'UPDATE public.daily_quiz_completions',
    'UPDATE public.daily_quiz_completions AS daily_completion'
  );
  v_definition := replace(
    v_definition,
    'WHERE id = v_completion.id',
    'WHERE daily_completion.id = v_completion.id'
  );

  EXECUTE v_definition;
END;
$$;

-- >>> ORIGIN: supabase/migrations/20260840_harden_reward_idempotency_and_rpc_surface.sql

-- Preserve all caller authorization checks while ensuring milestone ledger conflicts
-- can never be followed by a second balance or XP increment.
CREATE OR REPLACE FUNCTION public.award_quiz_completion_rewards(p_completion_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_completion RECORD;
  v_points INTEGER;
  v_event_key TEXT;
  v_inserted BOOLEAN := false;
  v_rows INTEGER := 0;
  v_total_completed INTEGER;
  v_level INTEGER;
  v_total_points INTEGER;
  v_extra_points INTEGER := 0;
BEGIN
  SELECT c.* INTO v_completion
  FROM public.completions c
  WHERE c.id = p_completion_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Completion not found';
  END IF;

  IF auth.uid()::text <> v_completion.taker_id::text THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_event_key := 'quiz_completion:' || p_completion_id;
  v_points := 10 + (GREATEST(0, COALESCE(v_completion.score, 0)) * 2);

  IF COALESCE(v_completion.total_questions, 0) > 0
     AND (v_completion.score::numeric / v_completion.total_questions::numeric) >= 0.80 THEN
    v_points := v_points + 15;
  END IF;

  IF COALESCE(v_completion.total_questions, 0) > 0
     AND v_completion.score >= v_completion.total_questions THEN
    v_points := v_points + 30;
  END IF;

  INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id, metadata)
  VALUES (
    v_completion.taker_id::text,
    v_points,
    'quiz_completion',
    v_event_key,
    p_completion_id,
    jsonb_build_object('quiz_id', v_completion.quiz_id, 'score', v_completion.score, 'total_questions', v_completion.total_questions)
  )
  ON CONFLICT (user_id, event_key) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_inserted := v_rows > 0;

  IF v_inserted THEN
    INSERT INTO public.user_reward_balances (user_id, points, level)
    VALUES (v_completion.taker_id::text, v_points, public.reward_level_for_points(v_points))
    ON CONFLICT (user_id) DO UPDATE
      SET points = public.user_reward_balances.points + v_points,
          level = public.reward_level_for_points(public.user_reward_balances.points + v_points),
          updated_at = now();

    UPDATE public.users
      SET xp = COALESCE(xp, 0) + (v_points * 10)
      WHERE uid::text = v_completion.taker_id::text;
  END IF;

  SELECT count(*)::integer INTO v_total_completed
  FROM public.completions
  WHERE taker_id = v_completion.taker_id;

  IF v_total_completed = 5 THEN
    INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id)
    VALUES (v_completion.taker_id::text, 200, 'milestone_reward', 'milestone_5_quizzes', p_completion_id)
    ON CONFLICT (user_id, event_key) DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;

    IF v_rows > 0 THEN
      v_extra_points := v_extra_points + 200;
      UPDATE public.user_reward_balances
        SET points = points + 200,
            level = public.reward_level_for_points(points + 200),
            updated_at = now()
        WHERE user_id = v_completion.taker_id::text;
      UPDATE public.users
        SET xp = COALESCE(xp, 0) + 2000
        WHERE uid::text = v_completion.taker_id::text;
    END IF;
  END IF;

  IF v_total_completed = 10 THEN
    INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id)
    VALUES (v_completion.taker_id::text, 500, 'milestone_reward', 'milestone_10_quizzes', p_completion_id)
    ON CONFLICT (user_id, event_key) DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;

    IF v_rows > 0 THEN
      v_extra_points := v_extra_points + 500;
      UPDATE public.user_reward_balances
        SET points = points + 500,
            level = public.reward_level_for_points(points + 500),
            updated_at = now()
        WHERE user_id = v_completion.taker_id::text;
      UPDATE public.users
        SET xp = COALESCE(xp, 0) + 5000
        WHERE uid::text = v_completion.taker_id::text;
      INSERT INTO public.reward_inventory (user_id, item_id)
      VALUES (v_completion.taker_id::text, 'frame_nature_leaf')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  IF v_total_completed >= 1 THEN
    INSERT INTO public.user_reward_badges(user_id, badge_id)
    VALUES (v_completion.taker_id::text, 'first_quiz')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_total_completed >= 10 THEN
    INSERT INTO public.user_reward_badges(user_id, badge_id)
    VALUES (v_completion.taker_id::text, 'active_learner')
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT b.points, b.level INTO v_total_points, v_level
  FROM public.user_reward_balances b
  WHERE b.user_id = v_completion.taker_id::text;

  RETURN jsonb_build_object(
    'points_awarded', (CASE WHEN v_inserted THEN v_points ELSE 0 END) + v_extra_points,
    'total_points', v_total_points,
    'level', v_level,
    'milestone_reached', v_total_completed IN (5, 10)
  );
END;
$function$;

-- These are internal helper/trigger functions and are not application RPC endpoints.
REVOKE EXECUTE ON FUNCTION public.check_daily_cooldown(text, text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_unverified_active_frame_update() FROM PUBLIC, anon, authenticated;

-- >>> ORIGIN: supabase/migrations/20260841_internal_extraction_jobs.sql

-- Internal, resumable document-extraction jobs.
-- Source files remain private in Storage and the job contains only metadata
-- and the structured extraction result, never raw file bytes.

CREATE TABLE IF NOT EXISTS public.extraction_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL CHECK (char_length(idempotency_key) BETWEEN 16 AND 128),
  file_storage_path TEXT NOT NULL CHECK (char_length(file_storage_path) BETWEEN 3 AND 512),
  file_mime_type TEXT NOT NULL CHECK (char_length(file_mime_type) BETWEEN 3 AND 160),
  extraction_mode TEXT NOT NULL DEFAULT 'literal' CHECK (extraction_mode IN ('literal', 'generate')),
  custom_instruction TEXT CHECK (custom_instruction IS NULL OR char_length(custom_instruction) <= 2000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete', 'error')),
  progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  processed_chunks INTEGER NOT NULL DEFAULT 0 CHECK (processed_chunks >= 0),
  total_chunks INTEGER CHECK (total_chunks IS NULL OR total_chunks > 0),
  progress_message TEXT CHECK (progress_message IS NULL OR char_length(progress_message) <= 500),
  questions_json JSONB,
  quiz_title TEXT,
  quiz_description TEXT,
  provider TEXT,
  error_message TEXT CHECK (error_message IS NULL OR char_length(error_message) <= 500),
  processing_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS extraction_jobs_user_status_created_idx
  ON public.extraction_jobs (user_id, status, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_extraction_job_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS extraction_jobs_set_updated_at ON public.extraction_jobs;
CREATE TRIGGER extraction_jobs_set_updated_at
  BEFORE UPDATE ON public.extraction_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_extraction_job_updated_at();

ALTER TABLE public.extraction_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS extraction_jobs_select_own ON public.extraction_jobs;
CREATE POLICY extraction_jobs_select_own
  ON public.extraction_jobs
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS extraction_jobs_insert_own ON public.extraction_jobs;
CREATE POLICY extraction_jobs_insert_own
  ON public.extraction_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS extraction_jobs_update_own ON public.extraction_jobs;
CREATE POLICY extraction_jobs_update_own
  ON public.extraction_jobs
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE ON public.extraction_jobs TO authenticated;

-- Private, short-lived source documents used only while their matching job runs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quiz-extraction-uploads',
  'quiz-extraction-uploads',
  false,
  12582912,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS extraction_uploads_select_own ON storage.objects;
CREATE POLICY extraction_uploads_select_own
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'quiz-extraction-uploads'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

DROP POLICY IF EXISTS extraction_uploads_insert_own ON storage.objects;
CREATE POLICY extraction_uploads_insert_own
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'quiz-extraction-uploads'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

DROP POLICY IF EXISTS extraction_uploads_delete_own ON storage.objects;
CREATE POLICY extraction_uploads_delete_own
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'quiz-extraction-uploads'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- >>> ORIGIN: supabase/migrations/20260842_extraction_job_processing_lease.sql

-- A processing lease makes waitUntil execution safe across retries. Only the
-- worker invocation that owns the current token may publish progress or a result.

ALTER TABLE public.extraction_jobs
  ADD COLUMN IF NOT EXISTS requested_question_count INTEGER
    CHECK (requested_question_count IS NULL OR requested_question_count BETWEEN 1 AND 500),
  ADD COLUMN IF NOT EXISTS processing_token UUID,
  ADD COLUMN IF NOT EXISTS processing_lease_expires_at TIMESTAMPTZ;

-- >>> ORIGIN: supabase/migrations/20260843_allow_images_in_extraction_uploads.sql

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
  'image/jpeg',
  'image/png',
  'image/webp'
]
WHERE id = 'quiz-extraction-uploads';

-- >>> ORIGIN: supabase/migrations/20260844_admin_reward_store_catalog.sql

-- Reward catalog administration is RPC-only. RLS continues to control all
-- storefront reads, while the functions below fail closed to super admins.

CREATE OR REPLACE FUNCTION public.admin_upsert_reward_store_item(
  p_id TEXT,
  p_name TEXT,
  p_name_ar TEXT,
  p_description TEXT DEFAULT '',
  p_description_ar TEXT DEFAULT '',
  p_price_points INTEGER DEFAULT 0,
  p_price_egp NUMERIC DEFAULT 0,
  p_image_url TEXT DEFAULT NULL,
  p_css_class TEXT DEFAULT NULL,
  p_min_plan TEXT DEFAULT 'free',
  p_sort_order INTEGER DEFAULT 0,
  p_is_featured BOOLEAN DEFAULT FALSE,
  p_is_active BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id TEXT := lower(trim(coalesce(p_id, '')));
  v_name TEXT := trim(coalesce(p_name, ''));
  v_name_ar TEXT := trim(coalesce(p_name_ar, ''));
  v_image_url TEXT := nullif(trim(coalesce(p_image_url, '')), '');
  v_plan TEXT := lower(trim(coalesce(p_min_plan, 'free')));
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid = auth.uid()::text AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Super-admin permission required' USING ERRCODE = '42501';
  END IF;

  IF v_id !~ '^[a-z0-9][a-z0-9_-]{2,96}$' OR v_name = '' OR v_name_ar = '' THEN
    RAISE EXCEPTION 'Invalid catalog item' USING ERRCODE = '22023';
  END IF;
  IF coalesce(p_price_points, 0) < 0 OR coalesce(p_price_egp, 0) < 0 OR coalesce(p_sort_order, 0) < 0 THEN
    RAISE EXCEPTION 'Invalid catalog pricing or order' USING ERRCODE = '22023';
  END IF;
  IF v_plan NOT IN ('free', 'silver', 'gold', 'diamond') THEN
    RAISE EXCEPTION 'Invalid minimum plan' USING ERRCODE = '22023';
  END IF;
  IF v_image_url IS NULL THEN
    RAISE EXCEPTION 'Frame image is required' USING ERRCODE = '22023';
  END IF;
  IF p_is_active AND EXISTS (
    SELECT 1 FROM public.reward_store_items
    WHERE item_type = 'frame' AND image_url = v_image_url AND id <> v_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'An active frame already uses this image' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.reward_store_items (
    id, item_type, name, name_ar, description, description_ar,
    price_points, price_egp, image_url, css_class, min_plan,
    sort_order, is_featured, is_active, updated_at
  ) VALUES (
    v_id, 'frame', v_name, v_name_ar, coalesce(p_description, ''), coalesce(p_description_ar, ''),
    coalesce(p_price_points, 0), coalesce(p_price_egp, 0), v_image_url, nullif(trim(coalesce(p_css_class, '')), ''), v_plan,
    coalesce(p_sort_order, 0), coalesce(p_is_featured, false), coalesce(p_is_active, true), now()
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    name_ar = EXCLUDED.name_ar,
    description = EXCLUDED.description,
    description_ar = EXCLUDED.description_ar,
    price_points = EXCLUDED.price_points,
    price_egp = EXCLUDED.price_egp,
    image_url = EXCLUDED.image_url,
    css_class = EXCLUDED.css_class,
    min_plan = EXCLUDED.min_plan,
    sort_order = EXCLUDED.sort_order,
    is_featured = EXCLUDED.is_featured,
    is_active = EXCLUDED.is_active,
    updated_at = now();

  RETURN jsonb_build_object('success', true, 'id', v_id, 'is_active', coalesce(p_is_active, true));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_reward_store_item_visibility(
  p_item_id TEXT,
  p_is_active BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item_id TEXT := trim(coalesce(p_item_id, ''));
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid = auth.uid()::text AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Super-admin permission required' USING ERRCODE = '42501';
  END IF;

  IF v_item_id = '' THEN
    RAISE EXCEPTION 'Invalid catalog item' USING ERRCODE = '22023';
  END IF;

  UPDATE public.reward_store_items
  SET is_active = coalesce(p_is_active, false), updated_at = now()
  WHERE id = v_item_id AND item_type = 'frame';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Frame was not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object('success', true, 'id', v_item_id, 'is_active', coalesce(p_is_active, false));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_upsert_reward_store_item(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, NUMERIC, TEXT, TEXT, TEXT, INTEGER, BOOLEAN, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_reward_store_item_visibility(TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_upsert_reward_store_item(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, NUMERIC, TEXT, TEXT, TEXT, INTEGER, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_reward_store_item_visibility(TEXT, BOOLEAN) TO authenticated;

-- >>> ORIGIN: supabase/migrations/20260844_harden_extraction_job_trigger_function.sql

CREATE OR REPLACE FUNCTION public.set_extraction_job_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- >>> ORIGIN: supabase/migrations/20260845_remove_unused_extraction_job_lease_index.sql

DROP INDEX IF EXISTS public.extraction_jobs_processing_lease_idx;

-- >>> ORIGIN: supabase/migrations/20260846_extraction_job_chunks.sql

-- Persisted work units for scanned PDF extraction. Each row represents a
-- small, independently retryable page range belonging to one user-owned job.

CREATE TABLE IF NOT EXISTS public.extraction_job_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_job_id UUID NOT NULL REFERENCES public.extraction_jobs(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),
  page_start INTEGER NOT NULL CHECK (page_start >= 1),
  page_end INTEGER NOT NULL CHECK (page_end >= page_start),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete', 'error')),
  processing_token UUID,
  processing_lease_expires_at TIMESTAMPTZ,
  questions_json JSONB,
  provider TEXT,
  error_message TEXT CHECK (error_message IS NULL OR char_length(error_message) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (parent_job_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS extraction_job_chunks_parent_status_idx
  ON public.extraction_job_chunks (parent_job_id, status, chunk_index);

CREATE OR REPLACE FUNCTION public.set_extraction_job_chunk_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS extraction_job_chunks_set_updated_at ON public.extraction_job_chunks;
CREATE TRIGGER extraction_job_chunks_set_updated_at
  BEFORE UPDATE ON public.extraction_job_chunks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_extraction_job_chunk_updated_at();

ALTER TABLE public.extraction_job_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS extraction_job_chunks_select_own ON public.extraction_job_chunks;
CREATE POLICY extraction_job_chunks_select_own
  ON public.extraction_job_chunks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.extraction_jobs jobs
      WHERE jobs.id = parent_job_id
        AND jobs.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS extraction_job_chunks_insert_own ON public.extraction_job_chunks;
CREATE POLICY extraction_job_chunks_insert_own
  ON public.extraction_job_chunks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.extraction_jobs jobs
      WHERE jobs.id = parent_job_id
        AND jobs.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS extraction_job_chunks_update_own ON public.extraction_job_chunks;
CREATE POLICY extraction_job_chunks_update_own
  ON public.extraction_job_chunks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.extraction_jobs jobs
      WHERE jobs.id = parent_job_id
        AND jobs.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.extraction_jobs jobs
      WHERE jobs.id = parent_job_id
        AND jobs.user_id = (select auth.uid())
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.extraction_job_chunks TO authenticated;

-- >>> ORIGIN: supabase/migrations/20260847_asset_catalog_governance.sql

-- Asset catalog governance: preserve existing catalog rows and prevent duplicate active standalone frame artwork.
-- This migration intentionally contains no DELETE statement; historical reward-store items must remain auditable.

CREATE UNIQUE INDEX IF NOT EXISTS reward_store_active_frame_image_unique
  ON public.reward_store_items (image_url)
  WHERE item_type = 'frame'
    AND id <> 'offer_vip_combo'
    AND is_active = true
    AND image_url IS NOT NULL;

-- >>> ORIGIN: supabase/migrations/20260848_public_profile_asset_paths.sql

-- QuizSpace is served from GitHub Pages. Store frame assets must therefore resolve through the project base path.

UPDATE public.reward_store_items
SET image_url = 'images/frame-diamond-comet-quizspace.webp', updated_at = now()
WHERE id = 'frame_diamond_comet';

UPDATE public.reward_store_items
SET image_url = 'images/frame-diamond-crown-quizspace.webp', updated_at = now()
WHERE id = 'frame_diamond_crown';

UPDATE public.reward_store_items
SET image_url = 'images/frame-ramadan-lantern-quizspace.webp', updated_at = now()
WHERE id = 'frame_ramadan_lantern';

UPDATE public.reward_store_items
SET image_url = 'images/frame-back-to-school-quizspace.webp', updated_at = now()
WHERE id = 'frame_back_to_school';

-- >>> ORIGIN: supabase/migrations/20260849_clear_active_frame.sql

-- Persist an explicit "no frame" choice without bypassing ownership checks.
CREATE OR REPLACE FUNCTION public.deactivate_reward_frame()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('app.quizspace_allow_frame_update', 'true', true);
  UPDATE public.users
  SET active_frame_id = NULL, updated_at = now()
  WHERE uid = v_user_id;

  RETURN jsonb_build_object('success', true, 'active_frame_id', NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.deactivate_reward_frame() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deactivate_reward_frame() TO authenticated;

-- >>> ORIGIN: supabase/migrations/20260850_deterministic_profile_asset_paths.sql

-- Point reward-store frame records at the audited transparent WebP assets.
-- IDs remain stable so existing ownership and active-frame selections continue to work.

UPDATE public.reward_store_items
SET image_url = 'clean-assets-deterministic/frame-diamond-comet-quizspace-transparent.webp', updated_at = now()
WHERE id = 'frame_diamond_comet';

UPDATE public.reward_store_items
SET image_url = 'clean-assets-deterministic/frame-diamond-crown-quizspace-transparent.webp', updated_at = now()
WHERE id = 'frame_diamond_crown';

UPDATE public.reward_store_items
SET image_url = 'clean-assets-deterministic/frame-ramadan-lantern-quizspace-transparent.webp', updated_at = now()
WHERE id = 'frame_ramadan_lantern';

UPDATE public.reward_store_items
SET image_url = 'clean-assets-deterministic/frame-back-to-school-quizspace-transparent.webp', updated_at = now()
WHERE id = 'frame_back_to_school';

-- >>> ORIGIN: supabase/migrations/20260851_profile_asset_redesign_v2.sql

-- Replace broken/latest frame visuals without deleting reward rows or changing ownership.
-- Only affected frame rows are updated, and every new image_url is unique among active rows.
UPDATE public.reward_store_items SET image_url = 'clean-assets-replacement/nature-leaf-transparent.webp' WHERE id = 'frame_free_1';
UPDATE public.reward_store_items SET image_url = 'clean-assets-replacement/aurora-glass-transparent.webp' WHERE id = 'frame_free_2';
UPDATE public.reward_store_items SET image_url = 'clean-assets-replacement/galaxy-ring-transparent.webp' WHERE id = 'frame_diamond_comet';
UPDATE public.reward_store_items SET image_url = 'clean-assets-replacement/cyber-orbit-transparent.webp' WHERE id = 'frame_diamond_crown';
UPDATE public.reward_store_items SET image_url = 'clean-assets-replacement/ramadan-green-transparent.webp' WHERE id = 'frame_ramadan_lantern';
UPDATE public.reward_store_items SET image_url = 'clean-assets-replacement/school-bus-transparent.webp' WHERE id = 'frame_back_to_school';
UPDATE public.reward_store_items SET image_url = 'clean-assets-replacement/fire-trail-transparent.webp' WHERE id = 'frame_legendary_dragon';

-- >>> ORIGIN: supabase/migrations/20260852_pdf_export_history.sql

-- Keep exported quiz PDFs private and user-scoped so they can be redownloaded safely.
CREATE TABLE IF NOT EXISTS public.pdf_export_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id TEXT REFERENCES public.quizzes(id) ON DELETE SET NULL,
  quiz_title TEXT NOT NULL CHECK (char_length(quiz_title) BETWEEN 1 AND 500),
  question_count INTEGER NOT NULL CHECK (question_count >= 0),
  file_name TEXT NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 180),
  storage_path TEXT NOT NULL UNIQUE CHECK (char_length(storage_path) BETWEEN 3 AND 512),
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 5242880),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pdf_export_history_user_created_idx
  ON public.pdf_export_history (user_id, created_at DESC);

ALTER TABLE public.pdf_export_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pdf_export_history_select_own ON public.pdf_export_history;
CREATE POLICY pdf_export_history_select_own
  ON public.pdf_export_history
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS pdf_export_history_insert_own ON public.pdf_export_history;
CREATE POLICY pdf_export_history_insert_own
  ON public.pdf_export_history
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

GRANT SELECT, INSERT ON public.pdf_export_history TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quiz-pdf-exports',
  'quiz-pdf-exports',
  false,
  5242880,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['application/pdf'];

DROP POLICY IF EXISTS quiz_pdf_exports_select_own ON storage.objects;
CREATE POLICY quiz_pdf_exports_select_own
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'quiz-pdf-exports'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

DROP POLICY IF EXISTS quiz_pdf_exports_insert_own ON storage.objects;
CREATE POLICY quiz_pdf_exports_insert_own
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'quiz-pdf-exports'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

DROP POLICY IF EXISTS quiz_pdf_exports_delete_own ON storage.objects;
CREATE POLICY quiz_pdf_exports_delete_own
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'quiz-pdf-exports'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- >>> ORIGIN: supabase/migrations/20260853_stone_ice_reward_catalog.sql

-- Add a premium stone/ice frame set and let verified super admins
-- manage storefront visibility for every catalog item type.

INSERT INTO public.reward_store_items (
  id, item_type, name, name_ar, description, description_ar,
  price_points, price_egp, reward_points, image_url, css_class,
  min_plan, is_active, sort_order, is_featured, updated_at
) VALUES
  (
    'frame_stone_royal', 'frame', 'Royal Basalt', 'البازلت الملكي',
    'Carved basalt and limestone ring with warm gold mineral veins.',
    'إطار من البازلت والحجر الجيري المنحوت بعروق ذهبية دافئة.',
    4200, 0, 0, 'clean-assets-replacement/frame-stone-royal-transparent.webp',
    'frame-stone-royal', 'gold', true, 101, false, now()
  ),
  (
    'frame_stone_moon', 'frame', 'Moonstone Citadel', 'قلعة حجر القمر',
    'Cool slate and pale granite frame with moonlit crystal seams.',
    'إطار من الأردواز والجرانيت الفاتح بلمسات بلورية مضيئة.',
    5000, 0, 0, 'clean-assets-replacement/frame-stone-moon-transparent.webp',
    'frame-stone-moon', 'gold', true, 102, false, now()
  ),
  (
    'frame_ice_glacier', 'frame', 'Glacier Crown', 'تاج الجليد الأزرق',
    'A faceted glacier ring with a bright blue crystal crown.',
    'إطار جليدي متعدد الأوجه تتوسطه بلورات زرقاء لامعة.',
    6200, 0, 0, 'clean-assets-replacement/frame-ice-glacier-transparent.webp',
    'frame-ice-glacier', 'diamond', true, 103, false, now()
  ),
  (
    'frame_ice_frost', 'frame', 'Frosted Snowflower', 'زهرة الصقيع',
    'Frost filigree and lavender crystals arranged as a winter snowflower.',
    'زخارف صقيع وبلورات بنفسجية في تكوين يشبه زهرة الشتاء.',
    7000, 0, 0, 'clean-assets-replacement/frame-ice-frost-transparent.webp',
    'frame-ice-frost', 'diamond', true, 104, false, now()
  )
ON CONFLICT (id) DO UPDATE SET
  item_type = EXCLUDED.item_type,
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  price_points = EXCLUDED.price_points,
  price_egp = EXCLUDED.price_egp,
  reward_points = EXCLUDED.reward_points,
  image_url = EXCLUDED.image_url,
  css_class = EXCLUDED.css_class,
  min_plan = EXCLUDED.min_plan,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  is_featured = EXCLUDED.is_featured,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.admin_set_reward_store_item_visibility(
  p_item_id TEXT,
  p_is_active BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item_id TEXT := trim(coalesce(p_item_id, ''));
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid = auth.uid()::text AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Super-admin permission required' USING ERRCODE = '42501';
  END IF;

  IF v_item_id = '' OR length(v_item_id) > 100 THEN
    RAISE EXCEPTION 'Invalid catalog item' USING ERRCODE = '22023';
  END IF;

  UPDATE public.reward_store_items
  SET is_active = coalesce(p_is_active, false), updated_at = now()
  WHERE id = v_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Catalog item was not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object('success', true, 'id', v_item_id, 'is_active', coalesce(p_is_active, false));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_reward_store_item_visibility(TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_reward_store_item_visibility(TEXT, BOOLEAN) TO authenticated;

-- >>> ORIGIN: supabase/migrations/20260854_recreate_admin_list_profiles_result.sql

-- Recreate the admin profile RPC with an explicit result shape.
-- The previous RETURNS SETOF public.users implementation began returning
-- PostgreSQL 42804 after the users composite type evolved through additive
-- migrations. This migration preserves the admin-only surface and changes
-- only the function result contract; no user rows are mutated.

DROP FUNCTION IF EXISTS public.admin_list_profiles();

CREATE FUNCTION public.admin_list_profiles()
RETURNS TABLE (
  uid TEXT,
  name TEXT,
  email TEXT,
  photo_url TEXT,
  bio TEXT,
  location TEXT,
  phone TEXT,
  is_premium BOOLEAN,
  plan_id TEXT,
  plan_name TEXT,
  is_lifetime BOOLEAN,
  is_founder BOOLEAN,
  is_suspended BOOLEAN,
  is_admin BOOLEAN,
  category_id TEXT,
  renewal_date TIMESTAMPTZ,
  badge_tier TEXT,
  name_color TEXT,
  badge_symbol TEXT,
  badge_color TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  onboarded BOOLEAN,
  custom_id TEXT,
  id UUID,
  gender TEXT,
  birthdate DATE,
  xp INTEGER,
  active_frame_id TEXT,
  premium_until TIMESTAMPTZ,
  level INTEGER,
  cover_url TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    u.uid,
    u.name,
    u.email,
    u.photo_url,
    u.bio,
    u.location,
    u.phone,
    u.is_premium,
    u.plan_id,
    u.plan_name,
    u.is_lifetime,
    u.is_founder,
    u.is_suspended,
    u.is_admin,
    u.category_id,
    u.renewal_date,
    u.badge_tier,
    u.name_color,
    u.badge_symbol,
    u.badge_color,
    u.created_at,
    u.updated_at,
    u.onboarded,
    u.custom_id,
    u.id,
    u.gender,
    u.birthdate,
    u.xp,
    u.active_frame_id,
    u.premium_until,
    u.level,
    u.cover_url
  FROM public.users AS u
  ORDER BY u.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_profiles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;

-- >>> ORIGIN: supabase/migrations/20260855_extraction_job_source_filename.sql

-- Preserve source filename metadata for resumable extraction jobs.
-- File bytes remain private in Storage and are deleted after processing.
ALTER TABLE public.extraction_jobs
  ADD COLUMN IF NOT EXISTS source_file_name TEXT
    CHECK (source_file_name IS NULL OR char_length(source_file_name) BETWEEN 1 AND 255);

-- >>> ORIGIN: supabase/migrations/20260856_ai_performance_error_category.sql

-- Store a bounded, non-sensitive classification for AI provider failures.
-- This is metadata only; it does not alter or delete existing quiz data.
ALTER TABLE public.ai_performance_logs
  ADD COLUMN IF NOT EXISTS error_category text;

ALTER TABLE public.ai_performance_logs
  DROP CONSTRAINT IF EXISTS ai_performance_logs_error_category_length;

ALTER TABLE public.ai_performance_logs
  ADD CONSTRAINT ai_performance_logs_error_category_length
  CHECK (error_category IS NULL OR char_length(error_category) BETWEEN 1 AND 32);

-- >>> ORIGIN: supabase/migrations/20260901_teacher_quiz_progress.sql

-- Teacher-only quiz progress report: enrolled classroom students vs. their latest saved completion.
CREATE OR REPLACE FUNCTION public.get_teacher_quiz_progress(p_quiz_id TEXT)
RETURNS TABLE (
  student_id TEXT,
  student_name TEXT,
  student_photo TEXT,
  completed BOOLEAN,
  score INTEGER,
  total_questions INTEGER,
  completed_at TIMESTAMPTZ,
  attempts_count INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_classroom_id TEXT;
BEGIN
  SELECT q.classroom_id INTO v_classroom_id
  FROM public.quizzes q
  WHERE q.id = p_quiz_id;

  IF v_classroom_id IS NULL THEN
    RAISE EXCEPTION 'Quiz is not assigned to a classroom';
  END IF;

  IF NOT public.current_user_is_admin()
     AND NOT EXISTS (
       SELECT 1 FROM public.classrooms c
       WHERE c.id = v_classroom_id AND c.created_by = auth.uid()::text
     ) THEN
    RAISE EXCEPTION 'Teacher access required';
  END IF;

  RETURN QUERY
  SELECT
    cs.student_id,
    COALESCE(NULLIF(cs.student_name, ''), 'طالب')::TEXT,
    cs.student_photo,
    (c.id IS NOT NULL),
    c.score,
    c.total_questions,
    c.created_at,
    COALESCE((SELECT COUNT(*)::INTEGER FROM public.completions c2
              WHERE c2.quiz_id = p_quiz_id AND c2.taker_id = cs.student_id), 0)
  FROM public.classroom_students cs
  LEFT JOIN public.completions c
    ON c.quiz_id = p_quiz_id AND c.taker_id = cs.student_id
  WHERE cs.class_id = v_classroom_id
  ORDER BY completed DESC, LOWER(COALESCE(cs.student_name, ''));
END;
$$;

REVOKE ALL ON FUNCTION public.get_teacher_quiz_progress(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_teacher_quiz_progress(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- >>> ORIGIN: supabase/migrations/20260902_admin_overview_snapshot.sql

CREATE OR REPLACE FUNCTION public.get_admin_overview_snapshot()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN jsonb_build_object(
    'classrooms', COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.created_at DESC) FROM public.classrooms c), '[]'::jsonb),
    'students', COALESCE((SELECT jsonb_agg(to_jsonb(cs) ORDER BY cs.joined_at DESC NULLS LAST) FROM public.classroom_students cs), '[]'::jsonb)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_admin_overview_snapshot() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_overview_snapshot() TO authenticated;

-- >>> ORIGIN: supabase/migrations/20260902_daily_engagement_rewards.sql

-- Daily engagement rewards are server-authoritative and idempotent.
-- The client may request an activity name only; points and event keys are fixed here.
CREATE OR REPLACE FUNCTION public.claim_daily_engagement_reward(p_activity TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_today TEXT := to_char(now(), 'YYYY-MM-DD');
  v_points INTEGER;
  v_event_type TEXT := 'daily_engagement';
  v_event_key TEXT;
  v_reward JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  CASE p_activity
    WHEN 'notifications_opened' THEN v_points := 2;
    WHEN 'daily_notification_action' THEN v_points := 3;
    ELSE RAISE EXCEPTION 'Unsupported daily engagement activity';
  END CASE;

  v_event_key := v_event_type || ':' || p_activity || ':' || v_today;
  v_reward := public.grant_reward_points(
    v_user_id,
    v_points,
    v_event_type,
    v_event_key,
    v_today,
    jsonb_build_object('activity', p_activity, 'date', v_today)
  );

  RETURN v_reward || jsonb_build_object('activity', p_activity, 'date', v_today);
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_daily_engagement_reward(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_engagement_reward(TEXT) TO authenticated;

-- >>> ORIGIN: supabase/migrations/20260903_fix_classroom_rls_infinite_recursion.sql

-- Fix Infinite Recursion in PostgreSQL RLS Policies for relation "classrooms"
-- Using SECURITY DEFINER helper functions breaks the circular RLS evaluation loop completely.

CREATE OR REPLACE FUNCTION public.is_classroom_student_member(p_class_id text, p_student_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classroom_students
    WHERE class_id = p_class_id AND student_id = p_student_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_classroom_owner(p_class_id text, p_user_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classrooms
    WHERE id = p_class_id AND created_by = p_user_id
  );
$$;

-- Fix classrooms_read Policy to eliminate circular query into classroom_students RLS
DROP POLICY IF EXISTS classrooms_read ON public.classrooms;
CREATE POLICY classrooms_read ON public.classrooms FOR SELECT USING (
  created_by = auth.uid()::text
  OR public.is_classroom_student_member(classrooms.id, auth.uid()::text)
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.uid = auth.uid()::text AND u.is_admin = true
  )
);

-- Fix classroom_students_read Policy to eliminate circular query into classrooms RLS
DROP POLICY IF EXISTS classroom_students_read ON public.classroom_students;
CREATE POLICY classroom_students_read ON public.classroom_students FOR SELECT USING (
  student_id = auth.uid()::text
  OR public.is_classroom_owner(classroom_students.class_id, auth.uid()::text)
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.uid = auth.uid()::text AND u.is_admin = true
  )
);

-- >>> ORIGIN: supabase/migrations/20260904_super_admin_only_quiz_takers.sql

-- Restrict sensitive quiz-solver identities and scores to super admins only.
-- The frontend hides the control for other users, while this SECURITY DEFINER
-- function enforces the same rule at the database boundary.
CREATE OR REPLACE FUNCTION public.get_quiz_takers_unique(p_quiz_id TEXT)
RETURNS TABLE (
  taker_id TEXT,
  taker_name TEXT,
  best_score INTEGER,
  total_questions INTEGER,
  attempts_count INTEGER,
  last_attempt_at TIMESTAMPTZ,
  rating INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Only super admins may view quiz solver details.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT x.taker_id,
         x.taker_name,
         MAX(x.score)::INTEGER,
         MAX(x.total_questions)::INTEGER,
         COUNT(*)::INTEGER,
         MAX(x.created_at),
         (ARRAY_AGG(x.rating ORDER BY x.created_at DESC) FILTER (WHERE x.rating IS NOT NULL))[1]
  FROM (
    SELECT c.taker_id, c.taker_name, c.score, c.total_questions, c.created_at, c.rating
    FROM public.completions c
    WHERE c.quiz_id = p_quiz_id
    UNION ALL
    SELECT g.guest_id, g.guest_name, g.score, g.total_questions, g.created_at, g.rating
    FROM public.guest_quiz_attempts g
    WHERE g.quiz_id = p_quiz_id
  ) AS x
  GROUP BY x.taker_id, x.taker_name;
END;
$$;

REVOKE ALL ON FUNCTION public.get_quiz_takers_unique(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_quiz_takers_unique(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_quiz_takers_unique(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- Public completion summaries remain available through their separate public RPC;
-- this migration only protects the detailed solver list used by the admin panel.

