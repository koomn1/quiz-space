-- Ensure the log table exists before installing the admin reader.
CREATE TABLE IF NOT EXISTS public.ai_performance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT,
  chunk_count INTEGER DEFAULT 1,
  total_pages INTEGER DEFAULT 1,
  status TEXT NOT NULL,
  latency_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON public.ai_performance_logs(created_at);
ALTER TABLE public.ai_performance_logs ENABLE ROW LEVEL SECURITY;

-- Admin-only reader for AI performance logs.
-- The frontend cannot bypass RLS with the anon key, so use a narrowly scoped
-- SECURITY DEFINER function that checks the authenticated user's admin flag.
CREATE OR REPLACE FUNCTION public.get_ai_performance_logs()
RETURNS SETOF public.ai_performance_logs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
     WHERE uid = auth.uid()::text AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
    SELECT * FROM public.ai_performance_logs
    ORDER BY created_at DESC
    LIMIT 100;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_ai_performance_logs() TO authenticated;
NOTIFY pgrst, 'reload schema';
