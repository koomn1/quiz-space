-- Premium quiz-card frames are separate from avatar/profile frames.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS active_quiz_frame_id TEXT;

-- Keep the field public-safe: it is only a cosmetic selection, never an entitlement.
DROP FUNCTION IF EXISTS public.get_public_profile(TEXT);
CREATE FUNCTION public.get_public_profile(p_user_id TEXT)
RETURNS TABLE(uid TEXT,name TEXT,photo_url TEXT,bio TEXT,location TEXT,custom_id TEXT,badge_tier TEXT,badge_symbol TEXT,badge_color TEXT,name_color TEXT,cover_url TEXT,is_premium BOOLEAN,active_quiz_frame_id TEXT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT u.uid,u.name,u.photo_url,u.bio,NULL::TEXT,u.custom_id,u.badge_tier,u.badge_symbol,
         u.badge_color,u.name_color,u.cover_url,u.is_premium,u.active_quiz_frame_id
  FROM public.users u WHERE u.uid=p_user_id LIMIT 1;
$$;

DROP FUNCTION IF EXISTS public.get_public_profiles();
CREATE FUNCTION public.get_public_profiles()
RETURNS TABLE(uid TEXT,name TEXT,photo_url TEXT,bio TEXT,location TEXT,custom_id TEXT,badge_tier TEXT,badge_symbol TEXT,badge_color TEXT,name_color TEXT,cover_url TEXT,is_premium BOOLEAN,active_quiz_frame_id TEXT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT u.uid,u.name,u.photo_url,u.bio,NULL::TEXT,u.custom_id,u.badge_tier,u.badge_symbol,
         u.badge_color,u.name_color,u.cover_url,u.is_premium,u.active_quiz_frame_id
  FROM public.users u ORDER BY u.name NULLS LAST,u.uid LIMIT 5000;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profiles() TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
