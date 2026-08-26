-- Recreate the admin profile RPC with an explicit result shape.
-- The previous RETURNS SETOF public.users implementation began returning
-- PostgreSQL 42804 after the users composite type evolved through additive
-- migrations. This migration preserves the admin-only surface and changes
-- only the function result contract; no user rows are mutated.

DROP FUNCTION IF EXISTS public.admin_list_profiles();

CREATE FUNCTION public.admin_list_profiles()
RETURNS TABLE (
  uid TEXT,
  name TEXT,
  email TEXT,
  photo_url TEXT,
  bio TEXT,
  location TEXT,
  phone TEXT,
  is_premium BOOLEAN,
  plan_id TEXT,
  plan_name TEXT,
  is_lifetime BOOLEAN,
  is_founder BOOLEAN,
  is_suspended BOOLEAN,
  is_admin BOOLEAN,
  category_id TEXT,
  renewal_date TIMESTAMPTZ,
  badge_tier TEXT,
  name_color TEXT,
  badge_symbol TEXT,
  badge_color TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  onboarded BOOLEAN,
  custom_id TEXT,
  id UUID,
  gender TEXT,
  birthdate DATE,
  xp INTEGER,
  active_frame_id TEXT,
  premium_until TIMESTAMPTZ,
  level INTEGER,
  cover_url TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    u.uid,
    u.name,
    u.email,
    u.photo_url,
    u.bio,
    u.location,
    u.phone,
    u.is_premium,
    u.plan_id,
    u.plan_name,
    u.is_lifetime,
    u.is_founder,
    u.is_suspended,
    u.is_admin,
    u.category_id,
    u.renewal_date,
    u.badge_tier,
    u.name_color,
    u.badge_symbol,
    u.badge_color,
    u.created_at,
    u.updated_at,
    u.onboarded,
    u.custom_id,
    u.id,
    u.gender,
    u.birthdate,
    u.xp,
    u.active_frame_id,
    u.premium_until,
    u.level,
    u.cover_url
  FROM public.users AS u
  ORDER BY u.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_profiles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;
