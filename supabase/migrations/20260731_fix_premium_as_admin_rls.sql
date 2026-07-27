-- The base migration used "is_founder = true OR is_premium = true" (or just
-- is_founder) as an ad-hoc "is this person an admin?" check across several
-- tables. That means every paying Diamond/Founder-tier customer - not just
-- actual admins - currently has write access to coupon codes, subscription
-- plans, account categories, seasons, promotions, and (most importantly)
-- the ability to approve or reject *other users'* premium activation
-- requests. This replaces all of those with the real is_admin column
-- introduced in 20260726_lock_privileged_user_columns.sql, which cannot be
-- self-granted.

-- ---- coupon_codes ----
DROP POLICY IF EXISTS coupon_codes_admin_write ON coupon_codes;
DROP POLICY IF EXISTS coupon_codes_admin_update ON coupon_codes;
DROP POLICY IF EXISTS coupon_codes_admin_delete ON coupon_codes;

CREATE POLICY coupon_codes_admin_write ON coupon_codes FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND is_admin = true)
);
CREATE POLICY coupon_codes_admin_update ON coupon_codes FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND is_admin = true)
);
CREATE POLICY coupon_codes_admin_delete ON coupon_codes FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND is_admin = true)
);

-- ---- subscription_plans ----
DROP POLICY IF EXISTS subscription_plans_admin_write ON subscription_plans;
CREATE POLICY subscription_plans_admin_write ON subscription_plans FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND is_admin = true)
);

-- ---- account_categories ----
DROP POLICY IF EXISTS account_categories_admin_write ON account_categories;
CREATE POLICY account_categories_admin_write ON account_categories FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND is_admin = true)
);

-- ---- coupon_usages (read-only, but was exposing every user's redemption
-- history to every premium subscriber, not just admins) ----
DROP POLICY IF EXISTS coupon_usages_admin_read ON coupon_usages;
CREATE POLICY coupon_usages_admin_read ON coupon_usages FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND is_admin = true)
);

-- ---- seasons ----
DROP POLICY IF EXISTS seasons_admin_write ON seasons;
CREATE POLICY seasons_admin_write ON seasons FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND is_admin = true)
);

-- ---- premium_requests (the approval/rejection flow itself - the most
-- consequential one: any premium user could previously approve or reject
-- *anyone's* premium request) ----
DROP POLICY IF EXISTS premium_requests_admin_read ON premium_requests;
DROP POLICY IF EXISTS premium_requests_admin_update ON premium_requests;
CREATE POLICY premium_requests_admin_read ON premium_requests FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND is_admin = true)
);
CREATE POLICY premium_requests_admin_update ON premium_requests FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND is_admin = true)
);

-- ---- promotions ----
DROP POLICY IF EXISTS promotions_admin_all ON promotions;
CREATE POLICY promotions_admin_all ON promotions FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND is_admin = true)
);
