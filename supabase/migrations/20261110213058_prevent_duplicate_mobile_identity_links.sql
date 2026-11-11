-- Prevent one app profile from being silently linked to a second Firebase identity.
CREATE OR REPLACE FUNCTION public.resolve_mobile_firebase_identity(
  p_firebase_project_id TEXT,
  p_firebase_uid TEXT,
  p_verified_email TEXT,
  p_name TEXT DEFAULT NULL,
  p_photo_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_link public.mobile_firebase_identity_links%ROWTYPE;
  v_user public.users%ROWTYPE;
  v_app_uid TEXT;
  v_match_count INTEGER;
  v_created BOOLEAN := FALSE;
  v_email TEXT := lower(trim(COALESCE(p_verified_email,'')));
  v_name TEXT := left(trim(COALESCE(p_name,'')),160);
  v_photo TEXT := left(trim(COALESCE(p_photo_url,'')),2048);
BEGIN
  IF length(trim(COALESCE(p_firebase_project_id,''))) NOT BETWEEN 1 AND 128
     OR length(trim(COALESCE(p_firebase_uid,''))) NOT BETWEEN 1 AND 256
     OR length(v_email) NOT BETWEEN 3 AND 320
     OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'identity_missing';
  END IF;
  IF v_photo <> '' AND v_photo !~ '^https://' THEN v_photo := ''; END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(trim(p_firebase_project_id) || ':' || trim(p_firebase_uid),0)
  );

  SELECT * INTO v_link
  FROM public.mobile_firebase_identity_links
  WHERE firebase_project_id=trim(p_firebase_project_id)
    AND firebase_uid=trim(p_firebase_uid)
  FOR UPDATE;
  IF FOUND THEN
    UPDATE public.mobile_firebase_identity_links
    SET verified_email=v_email,last_seen_at=now()
    WHERE firebase_project_id=trim(p_firebase_project_id)
      AND firebase_uid=trim(p_firebase_uid);
    RETURN jsonb_build_object('app_user_uid',v_link.app_user_uid,'created',FALSE);
  END IF;

  SELECT * INTO v_user
  FROM public.users
  WHERE uid=trim(p_firebase_uid)
  LIMIT 1;
  IF FOUND THEN
    IF lower(COALESCE(v_user.email,'')) <> v_email THEN RAISE EXCEPTION 'identity_conflict'; END IF;
    v_app_uid := v_user.uid;
  ELSE
    SELECT count(*)::INTEGER,min(uid)
    INTO v_match_count,v_app_uid
    FROM public.users
    WHERE lower(COALESCE(email,''))=v_email;

    IF v_match_count > 1 THEN
      RAISE EXCEPTION 'ambiguous_legacy_email';
    ELSIF v_match_count = 0 THEN
      v_app_uid := gen_random_uuid()::TEXT;
      IF v_name = '' THEN v_name := split_part(v_email,'@',1); END IF;
      INSERT INTO public.users(uid,email,name,photo_url,plan_name,is_premium,is_lifetime,is_founder,xp,level)
      VALUES(v_app_uid,v_email,left(v_name,160),NULLIF(v_photo,''),'Free',FALSE,FALSE,FALSE,0,1);
      v_created := TRUE;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.mobile_firebase_identity_links
    WHERE firebase_project_id=trim(p_firebase_project_id)
      AND app_user_uid=v_app_uid
      AND firebase_uid<>trim(p_firebase_uid)
  ) THEN
    RAISE EXCEPTION 'identity_conflict';
  END IF;

  INSERT INTO public.mobile_firebase_identity_links(
    firebase_project_id,firebase_uid,app_user_uid,verified_email
  ) VALUES (trim(p_firebase_project_id),trim(p_firebase_uid),v_app_uid,v_email);

  RETURN jsonb_build_object('app_user_uid',v_app_uid,'created',v_created);
END;
$$;

NOTIFY pgrst, 'reload schema';
