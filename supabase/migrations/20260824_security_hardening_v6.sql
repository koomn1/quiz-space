-- Public profile completion history with allow-listed fields only.
CREATE OR REPLACE FUNCTION public.get_public_completions_by_user(p_user_id text)
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
   WHERE c.taker_id = p_user_id
   ORDER BY c.created_at DESC
   LIMIT 500;
$$;
REVOKE ALL ON FUNCTION public.get_public_completions_by_user(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_completions_by_user(text) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
