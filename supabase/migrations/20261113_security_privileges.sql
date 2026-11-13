-- Security hardening: keep sensitive telemetry and guest attempts behind
-- narrowly scoped SECURITY DEFINER RPCs. RLS remains enabled as defense in depth.

REVOKE ALL ON TABLE public.guest_quiz_attempts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.web_vitals FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.submit_guest_quiz_attempt(
  TEXT, TEXT, TEXT, INTEGER, TEXT, INTEGER, TEXT, JSONB
) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_guest_quiz_attempt(
  TEXT, TEXT, TEXT, INTEGER, TEXT, INTEGER, TEXT, JSONB
) TO anon;

REVOKE ALL ON FUNCTION public.submit_guest_quiz_attempt_v2(
  TEXT, TEXT, TEXT, JSONB, TEXT, INTEGER, TEXT, JSONB
) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_guest_quiz_attempt_v2(
  TEXT, TEXT, TEXT, JSONB, TEXT, INTEGER, TEXT, JSONB
) TO anon;

REVOKE ALL ON FUNCTION public.submit_quiz_attempt(
  TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, JSONB
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(
  TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, JSONB
) TO authenticated;

REVOKE ALL ON FUNCTION public.record_web_vital(
  TEXT, NUMERIC, TEXT, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_web_vital(
  TEXT, NUMERIC, TEXT, TEXT
) TO authenticated;

NOTIFY pgrst, 'reload schema';
