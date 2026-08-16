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
