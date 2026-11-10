-- Pin the remaining security-definer functions to a safe search path.
ALTER FUNCTION public.touch_quiz_error_bank_updated_at() SET search_path TO public, pg_temp;
ALTER FUNCTION public.effective_membership_active(BOOLEAN,BOOLEAN,BOOLEAN,TIMESTAMPTZ) SET search_path TO public, pg_temp;
ALTER FUNCTION public.quizspace_daily_quiz_interval(TEXT) SET search_path TO public, pg_temp;
NOTIFY pgrst, 'reload schema';
