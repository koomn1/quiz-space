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
