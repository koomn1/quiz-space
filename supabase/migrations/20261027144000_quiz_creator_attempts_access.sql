-- Allow each quiz creator to inspect solvers for their own quiz while retaining
-- unrestricted super-admin access. The query groups every recorded completion
-- and guest attempt; it intentionally has no row cap or pagination truncation.
CREATE OR REPLACE FUNCTION public.get_quiz_takers_unique(p_quiz_id TEXT)
RETURNS TABLE (
  taker_id TEXT,
  taker_name TEXT,
  best_score INTEGER,
  total_questions INTEGER,
  attempts_count INTEGER,
  last_attempt_at TIMESTAMPTZ,
  rating INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_is_admin() AND NOT EXISTS (
    SELECT 1
    FROM public.quizzes q
    WHERE q.id = p_quiz_id
      AND q.creator_id = auth.uid()::text
  ) THEN
    RAISE EXCEPTION 'Only the quiz creator or a super admin may view quiz solver details.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT x.taker_id,
         x.taker_name,
         MAX(x.score)::INTEGER,
         MAX(x.total_questions)::INTEGER,
         COUNT(*)::INTEGER,
         MAX(x.created_at),
         (ARRAY_AGG(x.rating ORDER BY x.created_at DESC) FILTER (WHERE x.rating IS NOT NULL))[1]
  FROM (
    SELECT c.taker_id, c.taker_name, c.score, c.total_questions, c.created_at, c.rating
    FROM public.completions c
    WHERE c.quiz_id = p_quiz_id
    UNION ALL
    SELECT g.guest_id, g.guest_name, g.score, g.total_questions, g.created_at, g.rating
    FROM public.guest_quiz_attempts g
    WHERE g.quiz_id = p_quiz_id
  ) AS x
  GROUP BY x.taker_id, x.taker_name;
END;
$$;

REVOKE ALL ON FUNCTION public.get_quiz_takers_unique(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_quiz_takers_unique(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_quiz_takers_unique(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
