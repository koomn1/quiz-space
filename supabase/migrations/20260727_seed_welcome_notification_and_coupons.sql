-- Seed the welcome notification and demo coupon codes directly in Postgres.
-- Previously these only existed as client-side localStorage fallbacks
-- (DEFAULT_NOTIFICATIONS / DEFAULT_COUPONS in src/lib/db.ts), including a
-- FREE100 (100% off) coupon that was never actually enforced against the
-- database - any client without that key set would silently "recreate" it.

INSERT INTO notifications (id, title, body, sender_name, type, created_at)
VALUES (
    'notif-welcome',
    'مرحباً بك في منصة Quiz Space! 🎉',
    'ابدأ الآن بحل أو إنشاء أول اختبار تفاعلي وصعد لوحة المتصدرين!',
    'System',
    'info',
    now()
)
ON CONFLICT (id) DO NOTHING;

-- Demo coupons are opt-in seed data for a fresh install; remove or edit these
-- rows directly in Postgres for production. maxUses/expiry are enforced by the
-- record_coupon_usage RPC, not the client.
INSERT INTO coupon_codes (id, code, discount_percent, max_uses, used_count, expiry_date, is_active, created_at, applicable_plans)
VALUES
    ('QUIZ50', 'QUIZ50', 50, 100, 0, now() + interval '365 days', true, now(), 'silver,gold,diamond'),
    ('FREE100', 'FREE100', 100, 100, 0, now() + interval '365 days', true, now(), 'silver,gold,diamond')
ON CONFLICT (id) DO NOTHING;
