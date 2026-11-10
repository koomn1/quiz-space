-- Keep the tier resolver internal and restrict user-scoped daily quiz RPCs to signed-in users.
REVOKE ALL ON FUNCTION public.quizspace_resolve_daily_quiz_tier(TEXT)
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.get_user_daily_quiz_slot(TEXT, TEXT)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_user_daily_quiz_refresh(TEXT, TEXT)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.finalize_user_daily_quiz_refresh(TEXT, TEXT, JSONB)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.release_user_daily_quiz_refresh(TEXT, TEXT)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reset_legacy_daily_quiz_slot(TEXT, TEXT)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_user_daily_quiz_slot(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_user_daily_quiz_refresh(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_user_daily_quiz_refresh(TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_user_daily_quiz_refresh(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_legacy_daily_quiz_slot(TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
