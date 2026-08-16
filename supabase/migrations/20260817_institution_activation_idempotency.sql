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
