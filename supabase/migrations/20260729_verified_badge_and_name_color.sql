-- Replaces the old free-form badge_symbol/badge_color (any emoji + any hex,
-- available to every user regardless of subscription) with a curated,
-- Telegram-style verified badge system that's actually gated to premium.

-- Uses the same tier vocabulary as the existing UserBadge.tsx component
-- (pro/premium/team/enterprise/lifetime/founder), instead of inventing a new
-- one, so we get its already-built distinct shapes/animations per tier.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='badge_tier') THEN
        ALTER TABLE users ADD COLUMN badge_tier TEXT NOT NULL DEFAULT 'none'
            CHECK (badge_tier IN ('none', 'pro', 'premium', 'team', 'enterprise', 'lifetime', 'founder'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='name_color') THEN
        ALTER TABLE users ADD COLUMN name_color TEXT NOT NULL DEFAULT 'default'
            CHECK (name_color IN ('default', 'gold', 'neon_green', 'neon_pink', 'neon_blue', 'silver', 'diamond'));
    END IF;
END $$;

-- Both are cosmetic/self-expression, not privileges like is_premium - but they
-- should still only be *effectively usable* while the user is actually premium.
-- We don't hard-block the column in the trigger (a lapsed subscriber keeping
-- their last badge visible briefly isn't a security issue), but the app layer
-- must check is_premium before rendering/offering these, and getUserProfileStats
-- should not fabricate a badge for a non-premium user.
