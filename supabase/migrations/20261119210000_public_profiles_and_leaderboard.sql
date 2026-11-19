-- ====================================================================
-- Public Profiles & Global Leaderboard RPC Enhancement
-- Ensures full profile data (XP, level, location, frames) is visible
-- to all visitors and supports handle resolution (custom_id).
-- ====================================================================

-- 1. Enhanced single public profile lookup (by uid OR custom_id)
DROP FUNCTION IF EXISTS public.get_public_profile(TEXT);
CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id TEXT)
RETURNS TABLE(
  uid TEXT,
  name TEXT,
  photo_url TEXT,
  bio TEXT,
  location TEXT,
  custom_id TEXT,
  badge_tier TEXT,
  badge_symbol TEXT,
  badge_color TEXT,
  name_color TEXT,
  cover_url TEXT,
  is_premium BOOLEAN,
  active_frame_id TEXT,
  active_quiz_frame_id TEXT,
  xp INTEGER,
  created_at TIMESTAMPTZ,
  plan_name TEXT
)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT u.uid,
         u.name,
         u.photo_url,
         u.bio,
         u.location,
         u.custom_id,
         u.badge_tier,
         u.badge_symbol,
         u.badge_color,
         u.name_color,
         u.cover_url,
         u.is_premium,
         u.active_frame_id,
         u.active_quiz_frame_id,
         COALESCE(u.xp, 0)::INTEGER,
         u.created_at,
         u.plan_name
  FROM public.users u
  WHERE u.uid = p_user_id
     OR (u.custom_id IS NOT NULL AND LOWER(u.custom_id) = LOWER(p_user_id))
  LIMIT 1;
$$;

-- 2. Enhanced list of public profiles sorted by XP
DROP FUNCTION IF EXISTS public.get_public_profiles();
CREATE OR REPLACE FUNCTION public.get_public_profiles()
RETURNS TABLE(
  uid TEXT,
  name TEXT,
  photo_url TEXT,
  bio TEXT,
  location TEXT,
  custom_id TEXT,
  badge_tier TEXT,
  badge_symbol TEXT,
  badge_color TEXT,
  name_color TEXT,
  cover_url TEXT,
  is_premium BOOLEAN,
  active_frame_id TEXT,
  active_quiz_frame_id TEXT,
  xp INTEGER,
  created_at TIMESTAMPTZ,
  plan_name TEXT
)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT u.uid,
         u.name,
         u.photo_url,
         u.bio,
         u.location,
         u.custom_id,
         u.badge_tier,
         u.badge_symbol,
         u.badge_color,
         u.name_color,
         u.cover_url,
         u.is_premium,
         u.active_frame_id,
         u.active_quiz_frame_id,
         COALESCE(u.xp, 0)::INTEGER,
         u.created_at,
         u.plan_name
  FROM public.users u
  ORDER BY u.xp DESC NULLS LAST, u.name NULLS LAST
  LIMIT 500;
$$;

-- 3. Grants & Schema Reload
GRANT EXECUTE ON FUNCTION public.get_public_profile(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profiles() TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
