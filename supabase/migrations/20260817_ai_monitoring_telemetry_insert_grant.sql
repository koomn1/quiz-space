-- RLS policy already scopes inserts to the current authenticated user.
-- Granting INSERT is still required before that policy can be evaluated.
GRANT INSERT ON TABLE public.ai_performance_logs TO authenticated;
NOTIFY pgrst, 'reload schema';
