-- Retire unauthenticated legacy global daily-slot RPCs.
-- The application now uses per-user slots; these old functions can mutate shared tier state.
REVOKE ALL ON FUNCTION public.get_daily_quiz_slot(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_daily_quiz_refresh(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_daily_quiz_refresh(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_daily_quiz_refresh(TEXT) FROM PUBLIC, anon, authenticated;

-- This remaining user-scoped completion helper is authenticated-only.
REVOKE ALL ON FUNCTION public.complete_user_daily_quiz(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_user_daily_quiz(TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
