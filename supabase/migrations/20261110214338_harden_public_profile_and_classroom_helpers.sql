-- Harden SECURITY DEFINER search paths and prevent public probing of classroom membership.
ALTER FUNCTION public.find_public_profile_by_custom_id(TEXT) SET search_path TO public, pg_temp;
ALTER FUNCTION public.get_public_best_score(TEXT) SET search_path TO public, pg_temp;
ALTER FUNCTION public.get_public_completions_by_quiz(TEXT) SET search_path TO public, pg_temp;
ALTER FUNCTION public.get_public_completions_by_user(TEXT) SET search_path TO public, pg_temp;
ALTER FUNCTION public.get_public_recent_completions(INTEGER) SET search_path TO public, pg_temp;
ALTER FUNCTION public.get_site_stats() SET search_path TO public, pg_temp;
ALTER FUNCTION public.normalize_community_post_identity() SET search_path TO public, pg_temp;
ALTER FUNCTION public.submit_guest_quiz_attempt(TEXT,TEXT,TEXT,INTEGER,TEXT,INTEGER,TEXT,JSONB) SET search_path TO public, pg_temp;
ALTER FUNCTION public.update_guest_quiz_attempt_review(TEXT,TEXT,INTEGER,TEXT) SET search_path TO public, pg_temp;
ALTER FUNCTION public.update_guest_quiz_attempt_score(TEXT,TEXT,TEXT,INTEGER) SET search_path TO public, pg_temp;

CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id TEXT)
RETURNS TABLE(uid TEXT,name TEXT,photo_url TEXT,bio TEXT,location TEXT,custom_id TEXT,badge_tier TEXT,badge_symbol TEXT,badge_color TEXT,name_color TEXT,cover_url TEXT,is_premium BOOLEAN)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT u.uid,u.name,u.photo_url,u.bio,NULL::TEXT AS location,u.custom_id,
         u.badge_tier,u.badge_symbol,u.badge_color,u.name_color,u.cover_url,u.is_premium
  FROM public.users u
  WHERE u.uid=p_user_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_public_profiles()
RETURNS TABLE(uid TEXT,name TEXT,photo_url TEXT,bio TEXT,location TEXT,custom_id TEXT,badge_tier TEXT,badge_symbol TEXT,badge_color TEXT,name_color TEXT,cover_url TEXT,is_premium BOOLEAN)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT u.uid,u.name,u.photo_url,u.bio,NULL::TEXT AS location,u.custom_id,
         u.badge_tier,u.badge_symbol,u.badge_color,u.name_color,u.cover_url,u.is_premium
  FROM public.users u
  ORDER BY u.name NULLS LAST,u.uid
  LIMIT 5000;
$$;

CREATE OR REPLACE FUNCTION public.is_classroom_owner(p_class_id TEXT,p_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL
     AND auth.uid()::TEXT = p_user_id
     AND EXISTS (
       SELECT 1 FROM public.classrooms
       WHERE id=p_class_id AND created_by=p_user_id
     );
$$;

CREATE OR REPLACE FUNCTION public.is_classroom_student_member(p_class_id TEXT,p_student_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL
     AND auth.uid()::TEXT = p_student_id
     AND EXISTS (
       SELECT 1 FROM public.classroom_students
       WHERE class_id=p_class_id AND student_id=p_student_id
     );
$$;

-- Trigger-only function: it must not be callable as a public RPC.
REVOKE ALL ON FUNCTION public.normalize_community_post_identity() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
