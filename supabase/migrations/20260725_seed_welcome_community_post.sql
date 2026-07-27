-- Seed the welcome community post directly in Postgres.
-- Previously this row only existed as a client-side localStorage fallback
-- (DEFAULT_COMMUNITY_POSTS in src/lib/db.ts), which meant every browser without
-- that key set would silently "recreate" a fake post that never existed in the DB.
INSERT INTO community_posts (id, text, author_id, author_name, author_badge_symbol, author_badge_color, likes, liked_by, created_at)
VALUES (
    'cp-welcome',
    'مرحباً بكم في مجتمع QuizSpace التعليمي! شاركونا اختباراتكم وآرائكم هنا 🚀',
    'admin-quizspace',
    'فريق QuizSpace',
    '👑',
    '#f59e0b',
    0,
    '[]'::jsonb,
    now()
)
ON CONFLICT (id) DO NOTHING;
