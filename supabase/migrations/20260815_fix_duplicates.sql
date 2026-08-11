-- Fix duplicate solvers display + add site stats + featured quizzes support.
-- 20260815

-- 1. Unique takers RPC: returns one row per solver with best score + attempt count
CREATE OR REPLACE FUNCTION public.get_quiz_takers_unique(p_quiz_id TEXT)
RETURNS TABLE (
  taker_id TEXT,
  taker_name TEXT,
  best_score INTEGER,
  total_questions INTEGER,
  attempts_count INTEGER,
  last_attempt_at TIMESTAMPTZ,
  rating INTEGER
) AS $$
  SELECT c.taker_id, c.taker_name,
         MAX(c.score) AS best_score,
         MAX(c.total_questions) AS total_questions,
         COUNT(*)::INTEGER AS attempts_count,
         MAX(c.created_at) AS last_attempt_at,
         (ARRAY_AGG(c.rating ORDER BY c.created_at DESC) FILTER (WHERE c.rating IS NOT NULL))[1] AS rating
  FROM public.completions c
  WHERE c.quiz_id = p_quiz_id
  GROUP BY c.taker_id, c.taker_name;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_quiz_takers_unique(TEXT) TO authenticated;

-- 2. Site-wide live stats for the landing page
CREATE OR REPLACE FUNCTION public.get_site_stats()
RETURNS JSONB AS $$
  SELECT jsonb_build_object(
    'total_quizzes', (SELECT COUNT(*) FROM public.quizzes),
    'total_completions', (SELECT COUNT(*) FROM public.completions),
    'total_users', (SELECT COUNT(*) FROM public.users),
    'quizzes_today', (SELECT COUNT(*) FROM public.quizzes WHERE created_at::date = CURRENT_DATE),
    'completions_today', (SELECT COUNT(*) FROM public.completions WHERE created_at::date = CURRENT_DATE),
    'top_quiz_today', COALESCE(
      (SELECT jsonb_build_object('id', id, 'title', title, 'plays', total_plays)
       FROM public.quizzes ORDER BY total_plays DESC LIMIT 1),
      'null'::jsonb
    )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_site_stats() TO authenticated;

-- 3. Featured quizzes table (for daily featured quiz on landing page)
CREATE TABLE IF NOT EXISTS public.featured_quizzes (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES public.quizzes(id),
  featured_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (featured_date, quiz_id)
);

ALTER TABLE public.featured_quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS featured_quizzes_read ON public.featured_quizzes;
CREATE POLICY featured_quizzes_read ON public.featured_quizzes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS featured_quizzes_insert ON public.featured_quizzes;
CREATE POLICY featured_quizzes_insert ON public.featured_quizzes FOR INSERT TO authenticated WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS featured_quizzes_delete ON public.featured_quizzes;
CREATE POLICY featured_quizzes_delete ON public.featured_quizzes FOR DELETE TO authenticated USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_featured_quizzes_date ON public.featured_quizzes(featured_date DESC);

NOTIFY pgrst, 'reload schema';
