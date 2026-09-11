-- Time-aware memberships: access is derived from trusted database time, not client state.
UPDATE public.users
SET renewal_date = premium_until
WHERE renewal_date IS NULL
  AND premium_until IS NOT NULL
  AND COALESCE(is_premium, false)
  AND NOT COALESCE(is_lifetime, false)
  AND NOT COALESCE(is_founder, false);

CREATE OR REPLACE FUNCTION public.effective_membership_active(
  p_is_premium BOOLEAN,
  p_is_lifetime BOOLEAN,
  p_is_founder BOOLEAN,
  p_renewal_date TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(p_is_premium, false)
    AND (
      COALESCE(p_is_lifetime, false)
      OR COALESCE(p_is_founder, false)
      OR p_renewal_date IS NULL
      OR p_renewal_date > now()
    );
$$;

CREATE OR REPLACE FUNCTION public.get_my_membership_status()
RETURNS TABLE (
  is_premium BOOLEAN,
  plan_id TEXT,
  plan_name TEXT,
  is_lifetime BOOLEAN,
  is_founder BOOLEAN,
  renewal_date TIMESTAMPTZ,
  membership_status TEXT,
  is_expired BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT
    public.effective_membership_active(u.is_premium, u.is_lifetime, u.is_founder, u.renewal_date),
    u.plan_id,
    CASE WHEN public.effective_membership_active(u.is_premium, u.is_lifetime, u.is_founder, u.renewal_date)
      THEN u.plan_name ELSE 'Free' END,
    u.is_lifetime,
    u.is_founder,
    u.renewal_date,
    CASE
      WHEN NOT COALESCE(u.is_premium, false) THEN 'free'
      WHEN public.effective_membership_active(u.is_premium, u.is_lifetime, u.is_founder, u.renewal_date) THEN 'active'
      ELSE 'expired'
    END,
    COALESCE(u.is_premium, false) AND NOT public.effective_membership_active(u.is_premium, u.is_lifetime, u.is_founder, u.renewal_date)
  FROM public.users u
  WHERE u.uid = auth.uid()::text;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_membership_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_membership_status() TO authenticated;

DROP FUNCTION IF EXISTS public.admin_update_user_subscription(TEXT, BOOLEAN, TEXT, TEXT, BOOLEAN, BOOLEAN, TIMESTAMPTZ);
CREATE FUNCTION public.admin_update_user_subscription(
  p_user_id TEXT,
  p_is_premium BOOLEAN,
  p_plan_name TEXT,
  p_plan_id TEXT DEFAULT NULL,
  p_is_lifetime BOOLEAN DEFAULT FALSE,
  p_is_founder BOOLEAN DEFAULT FALSE,
  p_renewal_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_renewal TIMESTAMPTZ;
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF p_user_id IS NULL OR length(trim(p_user_id)) = 0 THEN
    RAISE EXCEPTION 'Invalid user id';
  END IF;

  v_renewal := CASE
    WHEN NOT COALESCE(p_is_premium, false) OR COALESCE(p_is_lifetime, false) OR COALESCE(p_is_founder, false) THEN NULL
    WHEN p_renewal_date IS NOT NULL THEN p_renewal_date
    ELSE now() + interval '30 days'
  END;

  UPDATE public.users
  SET is_premium = COALESCE(p_is_premium, false),
      plan_name = CASE WHEN COALESCE(p_is_premium, false) THEN COALESCE(NULLIF(trim(p_plan_name), ''), 'Premium') ELSE 'Free' END,
      plan_id = CASE WHEN COALESCE(p_is_premium, false) THEN NULLIF(trim(p_plan_id), '') ELSE NULL END,
      is_lifetime = COALESCE(p_is_lifetime, false) AND COALESCE(p_is_premium, false),
      is_founder = COALESCE(p_is_founder, false) AND COALESCE(p_is_premium, false),
      renewal_date = v_renewal,
      premium_until = v_renewal,
      updated_at = now()
  WHERE uid = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN jsonb_build_object(
    'user_id', p_user_id,
    'is_premium', COALESCE(p_is_premium, false),
    'renewal_date', v_renewal,
    'is_lifetime', COALESCE(p_is_lifetime, false),
    'is_founder', COALESCE(p_is_founder, false)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user_subscription(TEXT, BOOLEAN, TEXT, TEXT, BOOLEAN, BOOLEAN, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user_subscription(TEXT, BOOLEAN, TEXT, TEXT, BOOLEAN, BOOLEAN, TIMESTAMPTZ) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_list_profiles();
CREATE FUNCTION public.admin_list_profiles()
RETURNS TABLE (
  uid TEXT, name TEXT, email TEXT, photo_url TEXT, bio TEXT, location TEXT, phone TEXT,
  is_premium BOOLEAN, plan_id TEXT, plan_name TEXT, is_lifetime BOOLEAN, is_founder BOOLEAN,
  is_suspended BOOLEAN, is_admin BOOLEAN, category_id TEXT, renewal_date TIMESTAMPTZ,
  badge_tier TEXT, name_color TEXT, badge_symbol TEXT, badge_color TEXT, created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ, onboarded BOOLEAN, custom_id TEXT, id UUID, gender TEXT, birthdate DATE,
  xp INTEGER, active_frame_id TEXT, premium_until TIMESTAMPTZ, level INTEGER, cover_url TEXT,
  membership_status TEXT, is_membership_expired BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  RETURN QUERY
  SELECT u.uid, u.name, u.email, u.photo_url, u.bio, u.location, u.phone,
    public.effective_membership_active(u.is_premium, u.is_lifetime, u.is_founder, u.renewal_date),
    u.plan_id,
    CASE WHEN public.effective_membership_active(u.is_premium, u.is_lifetime, u.is_founder, u.renewal_date) THEN u.plan_name ELSE 'Free' END,
    u.is_lifetime, u.is_founder, u.is_suspended, u.is_admin, u.category_id, u.renewal_date,
    u.badge_tier, u.name_color, u.badge_symbol, u.badge_color, u.created_at, u.updated_at,
    u.onboarded, u.custom_id, u.id, u.gender, u.birthdate, u.xp, u.active_frame_id, u.premium_until,
    u.level, u.cover_url,
    CASE
      WHEN NOT COALESCE(u.is_premium, false) THEN 'free'
      WHEN public.effective_membership_active(u.is_premium, u.is_lifetime, u.is_founder, u.renewal_date) THEN 'active'
      ELSE 'expired'
    END,
    COALESCE(u.is_premium, false) AND NOT public.effective_membership_active(u.is_premium, u.is_lifetime, u.is_founder, u.renewal_date)
  FROM public.users u ORDER BY u.created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;
