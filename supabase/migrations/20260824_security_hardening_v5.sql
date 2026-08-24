-- Replace definer views with explicit allow-listed RPCs.
-- This avoids exposing SECURITY DEFINER views through PostgREST while keeping
-- public profile and leaderboard features functional.

DROP VIEW IF EXISTS public.public_profiles;
DROP VIEW IF EXISTS public.public_completion_feed;

CREATE OR REPLACE FUNCTION public.get_public_profiles()
RETURNS TABLE(
  uid text,
  name text,
  photo_url text,
  bio text,
  location text,
  custom_id text,
  badge_tier text,
  badge_symbol text,
  badge_color text,
  name_color text,
  cover_url text,
  is_premium boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.uid, u.name, u.photo_url, u.bio, u.location, u.custom_id,
         u.badge_tier, u.badge_symbol, u.badge_color, u.name_color,
         u.cover_url, u.is_premium
    FROM public.users u
   ORDER BY u.name NULLS LAST, u.uid
   LIMIT 5000;
$$;

CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id text)
RETURNS TABLE(
  uid text,
  name text,
  photo_url text,
  bio text,
  location text,
  custom_id text,
  badge_tier text,
  badge_symbol text,
  badge_color text,
  name_color text,
  cover_url text,
  is_premium boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.uid, u.name, u.photo_url, u.bio, u.location, u.custom_id,
         u.badge_tier, u.badge_symbol, u.badge_color, u.name_color,
         u.cover_url, u.is_premium
    FROM public.users u
   WHERE u.uid = p_user_id
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.find_public_profile_by_custom_id(p_custom_id text)
RETURNS TABLE(uid text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.uid FROM public.users u WHERE u.custom_id = p_custom_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_public_completions_by_quiz(p_quiz_id text)
RETURNS TABLE(
  id text,
  quiz_id text,
  quiz_title text,
  taker_id text,
  taker_name text,
  score integer,
  total_questions integer,
  rating integer,
  created_at timestamptz,
  attempt_number integer,
  is_best boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.quiz_id, c.quiz_title, c.taker_id, c.taker_name,
         c.score, c.total_questions, c.rating, c.created_at,
         c.attempt_number, c.is_best
    FROM public.completions c
   WHERE c.quiz_id = p_quiz_id
   ORDER BY c.created_at DESC
   LIMIT 500;
$$;

CREATE OR REPLACE FUNCTION public.get_public_recent_completions(p_limit integer DEFAULT 10)
RETURNS TABLE(
  id text,
  quiz_id text,
  quiz_title text,
  taker_id text,
  taker_name text,
  score integer,
  total_questions integer,
  rating integer,
  created_at timestamptz,
  attempt_number integer,
  is_best boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.quiz_id, c.quiz_title, c.taker_id, c.taker_name,
         c.score, c.total_questions, c.rating, c.created_at,
         c.attempt_number, c.is_best
    FROM public.completions c
   ORDER BY c.created_at DESC
   LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);
$$;

CREATE OR REPLACE FUNCTION public.get_public_best_score(p_quiz_id text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(c.score), 0)::integer FROM public.completions c WHERE c.quiz_id = p_quiz_id;
$$;

REVOKE ALL ON FUNCTION public.get_public_profiles() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_profile(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.find_public_profile_by_custom_id(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_completions_by_quiz(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_recent_completions(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_best_score(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profiles() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_public_profile_by_custom_id(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_completions_by_quiz(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_recent_completions(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_best_score(text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
