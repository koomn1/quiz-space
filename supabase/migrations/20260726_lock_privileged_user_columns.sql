-- CRITICAL FIX: users_update_own allowed ANY authenticated user to modify
-- ANY column on their own row (no WITH CHECK, no column restriction), including
-- is_premium, is_founder, plan_id, etc. Combined with users_admin_update_own_team
-- keying off is_premium/is_founder, a user could self-grant premium, then use
-- that to edit every other user's row. Application-layer fixes to db.ts cannot
-- close this hole on their own since a client can call supabase-js directly.

-- ============================================
-- 1. Add a real admin flag that is NEVER writable through RLS/client updates.
--    It can only ever be set directly via the Supabase SQL editor / service role.
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_admin') THEN
        ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- One-time seed for the existing hardcoded admin account used in the frontend
-- (Classrooms.tsx currently checks the email/uid directly - this makes it a
-- real, server-enforced flag instead of a client-side string comparison).
UPDATE users SET is_admin = true WHERE uid = 'adman777888999' OR email = 'adman777888999@gmail.com';

-- ============================================
-- 2. Trigger: silently revert any change to privileged columns unless the
--    actor is a real admin (is_admin = true) or is running as service_role
--    (i.e. a trusted backend / Edge Function using the service key).
-- ============================================
CREATE OR REPLACE FUNCTION protect_privileged_user_columns()
RETURNS TRIGGER AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_is_service_role BOOLEAN;
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
    NEW.custom_id := OLD.custom_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_privileged_user_columns ON users;
CREATE TRIGGER trg_protect_privileged_user_columns
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION protect_privileged_user_columns();

-- ============================================
-- 3. Replace the exploitable is_premium/is_founder admin-update policy with
--    one keyed off the new, non-self-editable is_admin flag.
-- ============================================
DROP POLICY IF EXISTS users_admin_update_own_team ON users;
CREATE POLICY users_admin_update_all ON users FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND is_admin = true));

-- users_update_own and users_insert_policy are left as-is; the trigger above
-- is what actually protects the privileged columns now, so a plain
-- "update own row" policy is safe for name/photo/bio/location edits.
