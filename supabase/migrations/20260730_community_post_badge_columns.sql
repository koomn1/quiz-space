-- Community posts already snapshot the author's badge_symbol/badge_color at
-- post time (author_badge_symbol/author_badge_color). Add equivalent columns
-- for the new tiered verified-badge / name-color system so posts render with
-- PremiumNameTag instead of the old free-form emoji system.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='community_posts' AND column_name='author_badge_tier') THEN
        ALTER TABLE community_posts ADD COLUMN author_badge_tier TEXT NOT NULL DEFAULT 'none';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='community_posts' AND column_name='author_name_color') THEN
        ALTER TABLE community_posts ADD COLUMN author_name_color TEXT NOT NULL DEFAULT 'default';
    END IF;
END $$;
