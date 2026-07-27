-- ============================================
-- QuizSpace Database Schema Migration
-- Version: 2.0.1
-- Date: 2026-07-23
-- Description: Fixed RLS policy syntax for older PostgreSQL
--              (Supabase uses PG 14/15, not PG 16)
-- ============================================

-- ============================================
-- 1. FIX USERS TABLE
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='plan_id') THEN
        ALTER TABLE users ADD COLUMN plan_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_suspended') THEN
        ALTER TABLE users ADD COLUMN is_suspended BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_lifetime') THEN
        ALTER TABLE users ADD COLUMN is_lifetime BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_founder') THEN
        ALTER TABLE users ADD COLUMN is_founder BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='category_id') THEN
        ALTER TABLE users ADD COLUMN category_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='renewal_date') THEN
        ALTER TABLE users ADD COLUMN renewal_date TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='created_at') THEN
        ALTER TABLE users ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='updated_at') THEN
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='onboarded') THEN
        ALTER TABLE users ADD COLUMN onboarded BOOLEAN DEFAULT false;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='users_uid_key') THEN
        ALTER TABLE users ADD CONSTRAINT users_uid_key UNIQUE (uid);
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='custom_id') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='users_custom_id_key') THEN
            ALTER TABLE users ADD CONSTRAINT users_custom_id_key UNIQUE (custom_id);
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='users_email_key') THEN
            ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='plan_name') THEN
        CREATE INDEX IF NOT EXISTS idx_users_plan_name ON users(plan_name);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_premium') THEN
        CREATE INDEX IF NOT EXISTS idx_users_is_premium ON users(is_premium);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='created_at') THEN
        CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='custom_id') THEN
        CREATE INDEX IF NOT EXISTS idx_users_custom_id ON users(custom_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='category_id') THEN
        CREATE INDEX IF NOT EXISTS idx_users_category_id ON users(category_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='plan_id') THEN
        CREATE INDEX IF NOT EXISTS idx_users_plan_id ON users(plan_id);
    END IF;
END $$;

-- ============================================
-- 2. FIX COUPON_CODES TABLE
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='coupon_codes') THEN
        CREATE TABLE coupon_codes (
            id TEXT PRIMARY KEY,
            code TEXT NOT NULL,
            discount_percent INTEGER NOT NULL DEFAULT 0,
            max_uses INTEGER NOT NULL DEFAULT 0,
            used_count INTEGER NOT NULL DEFAULT 0,
            expiry_date TIMESTAMPTZ,
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            applicable_plans TEXT DEFAULT 'silver,gold,diamond',
            CONSTRAINT valid_discount_percent CHECK (discount_percent >= 0 AND discount_percent <= 100),
            CONSTRAINT valid_used_count CHECK (used_count >= 0 AND used_count <= max_uses)
        );
    ELSE
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupon_codes' AND column_name='discount_percent') THEN
            ALTER TABLE coupon_codes ADD COLUMN discount_percent INTEGER NOT NULL DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupon_codes' AND column_name='max_uses') THEN
            ALTER TABLE coupon_codes ADD COLUMN max_uses INTEGER NOT NULL DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupon_codes' AND column_name='used_count') THEN
            ALTER TABLE coupon_codes ADD COLUMN used_count INTEGER NOT NULL DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupon_codes' AND column_name='expiry_date') THEN
            ALTER TABLE coupon_codes ADD COLUMN expiry_date TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupon_codes' AND column_name='is_active') THEN
            ALTER TABLE coupon_codes ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupon_codes' AND column_name='created_at') THEN
            ALTER TABLE coupon_codes ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupon_codes' AND column_name='applicable_plans') THEN
            ALTER TABLE coupon_codes ADD COLUMN applicable_plans TEXT DEFAULT 'silver,gold,diamond';
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='coupon_codes_code_key') THEN
        ALTER TABLE coupon_codes ADD CONSTRAINT coupon_codes_code_key UNIQUE (code);
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='coupon_codes_discount_percent_check' AND conrelid::regclass::text = 'coupon_codes') THEN
        ALTER TABLE coupon_codes DROP CONSTRAINT coupon_codes_discount_percent_check;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='coupon_codes_valid_discount_percent' AND conrelid::regclass::text = 'coupon_codes') THEN
        ALTER TABLE coupon_codes ADD CONSTRAINT coupon_codes_valid_discount_percent CHECK (discount_percent >= 0 AND discount_percent <= 100);
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='coupon_codes_valid_used_count' AND conrelid::regclass::text = 'coupon_codes') THEN
        ALTER TABLE coupon_codes DROP CONSTRAINT coupon_codes_valid_used_count;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='coupon_codes_valid_used_count' AND conrelid::regclass::text = 'coupon_codes') THEN
        ALTER TABLE coupon_codes ADD CONSTRAINT coupon_codes_valid_used_count CHECK (used_count >= 0 AND used_count <= max_uses);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_coupon_codes_code ON coupon_codes(code);
CREATE INDEX IF NOT EXISTS idx_coupon_codes_is_active ON coupon_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_coupon_codes_created_at ON coupon_codes(created_at);

-- ============================================
-- 3. FIX PREMIUM_REQUESTS TABLE
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='premium_requests') THEN
        CREATE TABLE premium_requests (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
            user_name TEXT NOT NULL,
            user_email TEXT,
            plan_id TEXT,
            plan_name TEXT NOT NULL,
            amount NUMERIC DEFAULT 0,
            payment_method TEXT DEFAULT 'request',
            payment_screenshot TEXT,
            promo_code TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            reject_reason TEXT,
            notes TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ,
            CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'needs_info'))
        );
    ELSE
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='premium_requests' AND column_name='plan_id') THEN
            ALTER TABLE premium_requests ADD COLUMN plan_id TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='premium_requests' AND column_name='payment_method') THEN
            ALTER TABLE premium_requests ADD COLUMN payment_method TEXT DEFAULT 'request';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='premium_requests' AND column_name='payment_screenshot') THEN
            ALTER TABLE premium_requests ADD COLUMN payment_screenshot TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='premium_requests' AND column_name='promo_code') THEN
            ALTER TABLE premium_requests ADD COLUMN promo_code TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='premium_requests' AND column_name='reject_reason') THEN
            ALTER TABLE premium_requests ADD COLUMN reject_reason TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='premium_requests' AND column_name='notes') THEN
            ALTER TABLE premium_requests ADD COLUMN notes TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='premium_requests' AND column_name='created_at') THEN
            ALTER TABLE premium_requests ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='premium_requests' AND column_name='updated_at') THEN
            ALTER TABLE premium_requests ADD COLUMN updated_at TIMESTAMPTZ;
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname='premium_requests_user_id_fkey' AND conrelid::regclass::text = 'premium_requests'
    ) THEN
        ALTER TABLE premium_requests ADD CONSTRAINT premium_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='premium_requests_status_check' AND conrelid::regclass::text = 'premium_requests') THEN
        ALTER TABLE premium_requests DROP CONSTRAINT premium_requests_status_check;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='premium_requests_valid_status' AND conrelid::regclass::text = 'premium_requests') THEN
        ALTER TABLE premium_requests ADD CONSTRAINT premium_requests_valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'needs_info'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_premium_requests_user_id ON premium_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_requests_status ON premium_requests(status);
CREATE INDEX IF NOT EXISTS idx_premium_requests_created_at ON premium_requests(created_at);

-- ============================================
-- 4. CREATE SUBSCRIPTION_PLANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_ar TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'EGP',
    duration_months INTEGER NOT NULL DEFAULT 1,
    features TEXT[] DEFAULT '{}',
    badge_style TEXT DEFAULT 'pro',
    badge_color TEXT DEFAULT '#c0c0c0',
    priority_level INTEGER NOT NULL DEFAULT 1,
    is_lifetime BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    CONSTRAINT valid_badge_style CHECK (badge_style IN ('pro', 'premium', 'team', 'enterprise', 'lifetime', 'founder')),
    CONSTRAINT valid_priority CHECK (priority_level >= 1 AND priority_level <= 10),
    CONSTRAINT valid_duration CHECK (duration_months >= 1 OR duration_months = 1200)
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_id ON subscription_plans(id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_is_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_priority ON subscription_plans(priority_level);

INSERT INTO subscription_plans (id, name, name_ar, price, currency, duration_months, features, badge_style, badge_color, priority_level, is_lifetime, is_active)
VALUES
    ('silver', 'Silver Scholar', 'الباقة الفضية', 150, 'EGP', 1,
     ARRAY['Cosmo Personal Assistant (AI)', 'Unlimited interactive quizzes', '10 AI quizzes/month', 'PDF reports', 'Email support'],
     'pro', '#c0c0c0', 1, false, true),
    ('gold', 'Educator Gold', 'الباقة الذهبية للمعلمين', 300, 'EGP', 1,
     ARRAY['All Silver features', 'Unlimited AI generation (Gemini)', 'Custom leaderboards', 'Timer customization', 'Detailed reports'],
     'premium', '#f59e0b', 2, false, true),
    ('diamond', 'Diamond Elite VIP', 'الباقة الماسية للمؤسسات', 1500, 'EGP', 1,
     ARRAY['All Gold features', 'Up to 15 teacher seats', 'Bulk Excel export', 'AI learning insights', 'White-label branding', '24/7 VIP support'],
     'founder', '#8b5cf6', 3, false, true),
    ('free', 'Free Tier', 'الباقة المجانية', 0, 'EGP', 1,
     ARRAY['Basic quizzes', 'Community access'],
     'pro', '#9ca3af', 0, false, true),
    ('lifetime', 'Lifetime Founder', 'الباقة المؤسسية مدى الحياة', 4999, 'EGP', 1200,
     ARRAY['All Diamond features', 'Lifetime access', 'Founder badge', 'Priority support'],
     'lifetime', '#fbbf24', 10, true, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. CREATE ACCOUNT_CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS account_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_ar TEXT,
    description TEXT,
    description_ar TEXT,
    icon TEXT DEFAULT '👤',
    color TEXT DEFAULT '#6b7280',
    min_quizzes INTEGER DEFAULT 0,
    min_score INTEGER DEFAULT 0,
    is_hidden BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_categories_sort_order ON account_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_account_categories_is_hidden ON account_categories(is_hidden);

INSERT INTO account_categories (id, name, name_ar, description, description_ar, icon, color, min_quizzes, min_score, is_hidden, sort_order)
VALUES
    ('beginner', 'Beginner Student', 'طالب مبتدئ', 'New learner just getting started', 'متعلم جديد بدأ للتو رحلته', '🌱', '#10b981', 0, 0, false, 1),
    ('intermediate', 'Intermediate Scholar', 'باحث متوسط', 'Active participant with some quizzes completed', 'مشارك نشط أكمل بعض الاختبارات', '📚', '#3b82f6', 5, 300, false, 2),
    ('advanced', 'Advanced Achiever', 'محقق متقدم', 'Dedicated learner with significant progress', 'متعلم متميز بحر تقدّمي كبير', '🎓', '#8b5cf6', 20, 1500, false, 3),
    ('expert', 'Expert Creator', 'خبير مبدع', 'Quiz creator and active community member', 'صانع اختبارات وعضو نشط في المجتمع', '👑', '#f59e0b', 50, 5000, false, 4),
    ('teacher', 'Certified Educator', 'معلم معتمد', 'Premium teacher/educator account', 'حساب معلم/مُعلّم مميز', '🏫', '#ef4444', 0, 0, false, 5)
ON CONFLICT (id) DO NOTHING;

-- Add foreign key from users to account_categories
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname='users_category_id_fkey' AND conrelid::regclass::text = 'users'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_category_id_fkey FOREIGN KEY (category_id) REFERENCES account_categories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================
-- 6. CREATE COUPON_USAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS coupon_usages (
    id TEXT PRIMARY KEY,
    coupon_id TEXT NOT NULL REFERENCES coupon_codes(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    discount_percent INTEGER NOT NULL,
    plan_id TEXT,
    order_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_coupon_discount CHECK (discount_percent >= 0 AND discount_percent <= 100)
);

CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_id ON coupon_usages(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_user_id ON coupon_usages(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_created_at ON coupon_usages(created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_coupon_usages_unique_user_coupon ON coupon_usages(coupon_id, user_id);

-- ============================================
-- 7. CREATE SEASONS TABLE
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    CONSTRAINT valid_season_dates CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_seasons_is_active ON seasons(is_active);
CREATE INDEX IF NOT EXISTS idx_seasons_is_archived ON seasons(is_archived);
CREATE INDEX IF NOT EXISTS idx_seasons_start_date ON seasons(start_date);
CREATE INDEX IF NOT EXISTS idx_seasons_end_date ON seasons(end_date);

-- ============================================
-- 8. CREATE SEASON_MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS season_members (
    id TEXT PRIMARY KEY,
    season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    rank_position INTEGER,
    total_score INTEGER DEFAULT 0,
    quizzes_completed INTEGER DEFAULT 0,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    CONSTRAINT valid_rank CHECK (rank_position IS NULL OR rank_position >= 1),
    CONSTRAINT unique_season_user UNIQUE (season_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_season_members_season_id ON season_members(season_id);
CREATE INDEX IF NOT EXISTS idx_season_members_user_id ON season_members(user_id);
CREATE INDEX IF NOT EXISTS idx_season_members_total_score ON season_members(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_season_members_rank ON season_members(rank_position);

-- ============================================
-- 9. IMPROVE OTHER EXISTING TABLES
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quizzes' AND column_name='distribution_routing') THEN
        ALTER TABLE quizzes ADD COLUMN distribution_routing TEXT DEFAULT 'public';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quizzes' AND column_name='classroom_id') THEN
        ALTER TABLE quizzes ADD COLUMN classroom_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quizzes' AND column_name='time_limit') THEN
        ALTER TABLE quizzes ADD COLUMN time_limit INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quizzes' AND column_name='category') THEN
        ALTER TABLE quizzes ADD COLUMN category TEXT DEFAULT 'عام';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quizzes' AND column_name='created_at') THEN
        ALTER TABLE quizzes ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='quizzes_distribution_routing_check' AND conrelid::regclass::text = 'quizzes') THEN
        ALTER TABLE quizzes ADD CONSTRAINT quizzes_distribution_routing_check CHECK (distribution_routing IN ('public', 'classroom', 'community'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_quizzes_creator_id ON quizzes(creator_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_category ON quizzes(category);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON quizzes(created_at);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='completions' AND column_name='created_at') THEN
        ALTER TABLE completions ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='completions' AND column_name='rating') THEN
        ALTER TABLE completions ADD COLUMN rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='completions' AND column_name='feedback') THEN
        ALTER TABLE completions ADD COLUMN feedback TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_completions_quiz_id ON completions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_completions_taker_id ON completions(taker_id);
CREATE INDEX IF NOT EXISTS idx_completions_created_at ON completions(created_at);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='question_ratings' AND column_name='created_at') THEN
        ALTER TABLE question_ratings ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='question_ratings_rating_value_check' AND conrelid::regclass::text = 'question_ratings') THEN
        ALTER TABLE question_ratings ADD CONSTRAINT question_ratings_rating_value_check CHECK (rating_value IN ('like', 'dislike'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='created_at') THEN
        ALTER TABLE notifications ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='notifications_type_check' AND conrelid::regclass::text = 'notifications') THEN
        ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('info', 'community', 'system', 'promotion'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='follows' AND column_name='created_at') THEN
        ALTER TABLE follows ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='follows_unique' AND conrelid::regclass::text = 'follows') THEN
        ALTER TABLE follows ADD CONSTRAINT follows_unique UNIQUE (follower_id, following_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classrooms' AND column_name='created_at') THEN
        ALTER TABLE classrooms ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classrooms' AND column_name='updated_at') THEN
        ALTER TABLE classrooms ADD COLUMN updated_at TIMESTAMPTZ;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_classrooms_owner ON classrooms(owner_id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classroom_students' AND column_name='joined_at') THEN
        ALTER TABLE classroom_students ADD COLUMN joined_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='classroom_students_unique' AND conrelid::regclass::text = 'classroom_students') THEN
        ALTER TABLE classroom_students ADD CONSTRAINT classroom_students_unique UNIQUE (class_id, student_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_classroom_students_class ON classroom_students(class_id);
CREATE INDEX IF NOT EXISTS idx_classroom_students_student ON classroom_students(student_id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classroom_messages' AND column_name='created_at') THEN
        ALTER TABLE classroom_messages ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_classroom_messages_classroom ON classroom_messages(classroom_id);

CREATE TABLE IF NOT EXISTS promotions (
    id TEXT PRIMARY KEY,
    discount_percent INTEGER NOT NULL DEFAULT 0,
    end_date TIMESTAMPTZ NOT NULL,
    applicable_plans TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_promo_discount CHECK (discount_percent >= 0 AND discount_percent <= 100),
    CONSTRAINT valid_promo_end CHECK (end_date > now())
);

CREATE INDEX IF NOT EXISTS idx_promotions_is_active ON promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_end_date ON promotions(end_date);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='community_posts' AND column_name='created_at') THEN
        ALTER TABLE community_posts ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='community_posts' AND column_name='updated_at') THEN
        ALTER TABLE community_posts ADD COLUMN updated_at TIMESTAMPTZ;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='direct_messages' AND column_name='is_read') THEN
        ALTER TABLE direct_messages ADD COLUMN is_read BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='direct_messages' AND column_name='created_at') THEN
        ALTER TABLE direct_messages ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver ON direct_messages(receiver_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON direct_messages(sender_id);

-- ============================================
-- 10. RLS POLICIES (PG14/15 compatible - no IF NOT EXISTS for policies)
-- ============================================

DO $$
DECLARE
    tbl TEXT;
    tables_list TEXT[] := ARRAY[
        'users', 'coupon_codes', 'coupon_usages', 'premium_requests',
        'subscription_plans', 'account_categories', 'seasons', 'season_members',
        'quizzes', 'completions', 'question_ratings', 'promotions',
        'community_posts', 'direct_messages', 'notifications', 'follows',
        'classrooms', 'classroom_students', 'classroom_messages'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables_list LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    END LOOP;
END $$;

-- Helper: safe CREATE POLICY that doesn't fail if policy exists
-- We drop existing policies first, then recreate them
DROP POLICY IF EXISTS users_read_policy ON users;
DROP POLICY IF EXISTS users_insert_policy ON users;
DROP POLICY IF EXISTS users_update_own ON users;
DROP POLICY IF EXISTS users_admin_all ON users;
DROP POLICY IF EXISTS users_admin_update_own_team ON users;

CREATE POLICY users_read_policy ON users FOR SELECT USING (true);
CREATE POLICY users_insert_policy ON users FOR INSERT WITH CHECK (auth.uid() = uid);
CREATE POLICY users_update_own ON users FOR UPDATE USING (auth.uid() = uid);
CREATE POLICY users_admin_update_own_team ON users FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND (is_founder = true OR is_premium = true))
);

DROP POLICY IF EXISTS coupon_codes_read ON coupon_codes;
DROP POLICY IF EXISTS coupon_codes_admin_write ON coupon_codes;
DROP POLICY IF EXISTS coupon_codes_admin_update ON coupon_codes;
DROP POLICY IF EXISTS coupon_codes_admin_delete ON coupon_codes;

CREATE POLICY coupon_codes_read ON coupon_codes FOR SELECT USING (true);
CREATE POLICY coupon_codes_admin_write ON coupon_codes FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND (is_founder = true OR is_premium = true))
);
CREATE POLICY coupon_codes_admin_update ON coupon_codes FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND (is_founder = true OR is_premium = true))
);
CREATE POLICY coupon_codes_admin_delete ON coupon_codes FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND is_founder = true)
);

DROP POLICY IF EXISTS subscription_plans_read ON subscription_plans;
DROP POLICY IF EXISTS subscription_plans_admin_write ON subscription_plans;

CREATE POLICY subscription_plans_read ON subscription_plans FOR SELECT USING (true);
CREATE POLICY subscription_plans_admin_write ON subscription_plans FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND is_founder = true)
);

DROP POLICY IF EXISTS account_categories_read ON account_categories;
DROP POLICY IF EXISTS account_categories_admin_write ON account_categories;

CREATE POLICY account_categories_read ON account_categories FOR SELECT USING (true);
CREATE POLICY account_categories_admin_write ON account_categories FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND is_founder = true)
);

DROP POLICY IF EXISTS coupon_usages_read_own ON coupon_usages;
DROP POLICY IF EXISTS coupon_usages_admin_read ON coupon_usages;
DROP POLICY IF EXISTS coupon_usages_insert_own ON coupon_usages;

CREATE POLICY coupon_usages_read_own ON coupon_usages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY coupon_usages_admin_read ON coupon_usages FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND (is_founder = true OR is_premium = true))
);
CREATE POLICY coupon_usages_insert_own ON coupon_usages FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS seasons_read ON seasons;
DROP POLICY IF EXISTS seasons_admin_write ON seasons;

CREATE POLICY seasons_read ON seasons FOR SELECT USING (true);
CREATE POLICY seasons_admin_write ON seasons FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND is_founder = true)
);

DROP POLICY IF EXISTS season_members_read ON season_members;
DROP POLICY IF EXISTS season_members_insert_own ON season_members;
DROP POLICY IF EXISTS season_members_update_own ON season_members;
DROP POLICY IF EXISTS season_members_delete_own ON season_members;

CREATE POLICY season_members_read ON season_members FOR SELECT USING (true);
CREATE POLICY season_members_insert_own ON season_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY season_members_update_own ON season_members FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY season_members_delete_own ON season_members FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS quizzes_read ON quizzes;
DROP POLICY IF EXISTS quizzes_insert_auth ON quizzes;
DROP POLICY IF EXISTS quizzes_update_own ON quizzes;
DROP POLICY IF EXISTS quizzes_delete_own ON quizzes;

CREATE POLICY quizzes_read ON quizzes FOR SELECT USING (true);
CREATE POLICY quizzes_insert_auth ON quizzes FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY quizzes_update_own ON quizzes FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY quizzes_delete_own ON quizzes FOR DELETE USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS completions_read_own ON completions;
DROP POLICY IF EXISTS completions_read_public ON completions;
DROP POLICY IF EXISTS completions_insert_own ON completions;

CREATE POLICY completions_read_own ON completions FOR SELECT USING (auth.uid() = taker_id);
CREATE POLICY completions_read_public ON completions FOR SELECT USING (true);
CREATE POLICY completions_insert_own ON completions FOR INSERT WITH CHECK (auth.uid() = taker_id);

DROP POLICY IF EXISTS question_ratings_read ON question_ratings;
DROP POLICY IF EXISTS question_ratings_insert_own ON question_ratings;
DROP POLICY IF EXISTS question_ratings_update_own ON question_ratings;

CREATE POLICY question_ratings_read ON question_ratings FOR SELECT USING (true);
CREATE POLICY question_ratings_insert_own ON question_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY question_ratings_update_own ON question_ratings FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS premium_requests_read_own ON premium_requests;
DROP POLICY IF EXISTS premium_requests_admin_read ON premium_requests;
DROP POLICY IF EXISTS premium_requests_insert_own ON premium_requests;
DROP POLICY IF EXISTS premium_requests_admin_update ON premium_requests;

CREATE POLICY premium_requests_read_own ON premium_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY premium_requests_admin_read ON premium_requests FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND (is_founder = true OR is_premium = true))
);
CREATE POLICY premium_requests_insert_own ON premium_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY premium_requests_admin_update ON premium_requests FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND (is_founder = true OR is_premium = true))
);

DROP POLICY IF EXISTS notifications_read_own ON notifications;

CREATE POLICY notifications_read_own ON notifications FOR SELECT USING (true);

DROP POLICY IF EXISTS direct_messages_read_own ON direct_messages;
DROP POLICY IF EXISTS direct_messages_insert_auth ON direct_messages;

CREATE POLICY direct_messages_read_own ON direct_messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY direct_messages_insert_auth ON direct_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS follows_read ON follows;
DROP POLICY IF EXISTS follows_insert_own ON follows;
DROP POLICY IF EXISTS follows_delete_own ON follows;

CREATE POLICY follows_read ON follows FOR SELECT USING (true);
CREATE POLICY follows_insert_own ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY follows_delete_own ON follows FOR DELETE USING (auth.uid() = follower_id);

DROP POLICY IF EXISTS classrooms_read ON classrooms;
DROP POLICY IF EXISTS classrooms_insert_auth ON classrooms;
DROP POLICY IF EXISTS classrooms_update_own ON classrooms;
DROP POLICY IF EXISTS classrooms_delete_own ON classrooms;

CREATE POLICY classrooms_read ON classrooms FOR SELECT USING (true);
CREATE POLICY classrooms_insert_auth ON classrooms FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY classrooms_update_own ON classrooms FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY classrooms_delete_own ON classrooms FOR DELETE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS classroom_students_read ON classroom_students;
DROP POLICY IF EXISTS classroom_students_insert_own ON classroom_students;
DROP POLICY IF EXISTS classroom_students_admin_write ON classroom_students;

CREATE POLICY classroom_students_read ON classroom_students FOR SELECT USING (true);
CREATE POLICY classroom_students_insert_own ON classroom_students FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY classroom_students_admin_write ON classroom_students FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM classrooms WHERE id = class_id AND created_by = auth.uid())
);

DROP POLICY IF EXISTS classroom_messages_read ON classroom_messages;
DROP POLICY IF EXISTS classroom_messages_insert_own ON classroom_messages;

CREATE POLICY classroom_messages_read ON classroom_messages FOR SELECT USING (true);
CREATE POLICY classroom_messages_insert_own ON classroom_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS community_posts_read ON community_posts;
DROP POLICY IF EXISTS community_posts_insert_auth ON community_posts;
DROP POLICY IF EXISTS community_posts_delete_own ON community_posts;

CREATE POLICY community_posts_read ON community_posts FOR SELECT USING (true);
CREATE POLICY community_posts_insert_auth ON community_posts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND length(author_id) > 0);
CREATE POLICY community_posts_delete_own ON community_posts FOR DELETE USING (auth.uid() = author_id);

DROP POLICY IF EXISTS promotions_admin_all ON promotions;

CREATE POLICY promotions_admin_all ON promotions FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND is_founder = true)
);

-- ============================================
-- 11. TRIGGER: auto-update updated_at on users
-- ============================================
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
-- 12. HELPER FUNCTION: get_coupon_by_code
-- ============================================
CREATE OR REPLACE FUNCTION get_coupon_by_code(p_code TEXT)
RETURNS SETOF coupon_codes AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM coupon_codes
    WHERE UPPER(code) = UPPER(TRIM(p_code))
       OR UPPER(id) = UPPER(TRIM(p_code))
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 13. HELPER FUNCTION: record_coupon_usage
-- ============================================
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

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Coupon not found: %', p_coupon_id;
    END IF;

    IF NOT v_coupon.is_active THEN
        RAISE EXCEPTION 'Coupon is inactive';
    END IF;

    IF v_coupon.expiry_date IS NOT NULL AND v_coupon.expiry_date < now() THEN
        RAISE EXCEPTION 'Coupon has expired';
    END IF;

    IF v_coupon.used_count >= v_coupon.max_uses THEN
        RAISE EXCEPTION 'Coupon usage limit reached';
    END IF;

    IF EXISTS (SELECT 1 FROM coupon_usages WHERE coupon_id = p_coupon_id AND user_id = p_user_id) THEN
        RAISE EXCEPTION 'User has already used this coupon';
    END IF;

    v_usage_id := 'cu_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 8);
    INSERT INTO coupon_usages (id, coupon_id, user_id, discount_percent, plan_id, order_id)
    VALUES (v_usage_id, p_coupon_id, p_user_id, p_discount_percent, p_plan_id, p_order_id);

    UPDATE coupon_codes SET used_count = used_count + 1 WHERE id = p_coupon_id;

    RETURN v_usage_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 14. HELPER FUNCTION: get_season_leaderboard
-- ============================================
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
    SELECT
        sm.rank_position,
        sm.user_id,
        u.name AS user_name,
        sm.total_score,
        sm.quizzes_completed,
        sm.joined_at
    FROM season_members sm
    JOIN users u ON u.uid = sm.user_id
    WHERE sm.season_id = p_season_id
    ORDER BY sm.total_score DESC, sm.joined_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 15. HELPER FUNCTION: get_active_season
-- ============================================
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
    RETURN QUERY
    SELECT
        s.id, s.name, s.name_ar, s.start_date, s.end_date, s.prize_description, s.max_participants
    FROM seasons s
    WHERE s.is_active = true
      AND s.is_archived = false
      AND now() BETWEEN s.start_date AND s.end_date
    ORDER BY s.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 16. HELPER FUNCTION: enroll_in_season
-- ============================================
CREATE OR REPLACE FUNCTION enroll_in_season(
    p_season_id TEXT,
    p_user_id TEXT
)
RETURNS TEXT AS $$
DECLARE
    v_member_id TEXT;
    v_season seasons%ROWTYPE;
BEGIN
    SELECT * INTO v_season FROM seasons WHERE id = p_season_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Season not found: %', p_season_id;
    END IF;

    IF NOT v_season.is_active THEN
        RAISE EXCEPTION 'Season is not active';
    END IF;

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
$$ LANGUAGE plpgsql;

-- ============================================
-- 17. HELPER FUNCTION: update_season_member_score
-- ============================================
CREATE OR REPLACE FUNCTION update_season_member_score(
    p_season_id TEXT,
    p_user_id TEXT,
    p_score_delta INTEGER
)
RETURNS VOID AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM season_members WHERE season_id = p_season_id AND user_id = p_user_id) THEN
        UPDATE season_members
        SET total_score = total_score + p_score_delta,
            quizzes_completed = quizzes_completed + 1,
            updated_at = now()
        WHERE season_id = p_season_id AND user_id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 18. HELPER FUNCTION: update_user_category
-- ============================================
CREATE OR REPLACE FUNCTION update_user_category(p_user_id TEXT)
RETURNS VOID AS $$
DECLARE
    v_quizzes INTEGER;
    v_score INTEGER;
    v_category_id TEXT;
BEGIN
    SELECT COUNT(*), COALESCE(SUM(score), 0)
    INTO v_quizzes, v_score
    FROM completions
    WHERE taker_id = p_user_id;

    SELECT id INTO v_category_id
    FROM account_categories
    WHERE (min_quizzes IS NULL OR v_quizzes >= min_quizzes)
      AND (min_score IS NULL OR v_score >= min_score)
      AND is_hidden = false
    ORDER BY min_quizzes DESC, min_score DESC
    LIMIT 1;

    IF v_category_id IS NOT NULL THEN
        UPDATE users SET category_id = v_category_id WHERE uid = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 20. HELPER FUNCTION: submit_quiz_attempt
-- ============================================
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

    IF v_total_questions = 0 THEN
        v_total_questions := 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM completions WHERE quiz_id = p_quiz_id AND taker_id = p_taker_id) THEN
        v_completion_id := 'comp_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 8);
        INSERT INTO completions (id, quiz_id, quiz_title, taker_id, taker_name, score, total_questions, rating, feedback)
        SELECT v_completion_id, p_quiz_id, q.title, p_taker_id, p_taker_name, p_score, v_total_questions, p_rating, p_feedback
        FROM quizzes q WHERE q.id = p_quiz_id;

        UPDATE quizzes SET total_plays = COALESCE(total_plays, 0) + 1 WHERE id = p_quiz_id;
    ELSE
        UPDATE completions
        SET score = p_score, total_questions = v_total_questions, rating = p_rating, feedback = p_feedback
        WHERE quiz_id = p_quiz_id AND taker_id = p_taker_id;
        v_completion_id := (SELECT id FROM completions WHERE quiz_id = p_quiz_id AND taker_id = p_taker_id);
    END IF;

    PERFORM update_user_category(p_taker_id);

    RETURN QUERY
    SELECT c.id, c.quiz_id, c.taker_id, c.taker_name, c.score, c.total_questions, c.rating, c.feedback, c.created_at
    FROM completions c WHERE c.id = v_completion_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 21. HELPER FUNCTION: toggle_post_like
-- ============================================
CREATE OR REPLACE FUNCTION toggle_post_like(
    p_post_id TEXT,
    p_user_id TEXT
)
RETURNS TABLE (
    likes INTEGER,
    liked_by JSONB
) AS $$
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

    UPDATE community_posts
    SET likes = jsonb_array_length(v_liked_by), liked_by = v_liked_by
    WHERE id = p_post_id;

    RETURN QUERY
    SELECT jsonb_array_length(v_liked_by), v_liked_by FROM community_posts WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 22. REALTIME PUBLICATION NOTES
-- ============================================
-- Note: ALTER PUBLICATION ... ADD TABLE IF NOT EXISTS is not supported
-- in PostgreSQL 14/15 (Supabase). Realtime for new tables should be
-- enabled manually in the Supabase Dashboard:
--   Database > Replication > Realtime > Add table
--
-- Tables to enable manually:
--   coupon_codes, coupon_usages, subscription_plans,
--   account_categories, seasons, season_members,
--   premium_requests, promotions
-- ============================================

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
