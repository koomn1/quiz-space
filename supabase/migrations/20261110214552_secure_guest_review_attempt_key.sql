-- Require the per-attempt secret when a guest edits their review.
CREATE OR REPLACE FUNCTION public.update_guest_quiz_attempt_review_v2(
  p_completion_id TEXT,
  p_guest_id TEXT,
  p_client_attempt_key TEXT,
  p_rating INTEGER,
  p_feedback TEXT DEFAULT ''
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated BOOLEAN := FALSE;
BEGIN
  IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Guest review requires an anonymous session'; END IF;
  IF p_completion_id IS NULL
     OR p_guest_id IS NULL
     OR p_guest_id !~ '^user-guest-[A-HJ-NP-Z2-9]{6}$'
     OR p_client_attempt_key IS NULL
     OR length(p_client_attempt_key) NOT BETWEEN 16 AND 128 THEN
    RAISE EXCEPTION 'Invalid guest attempt identity';
  END IF;
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5
     OR char_length(COALESCE(p_feedback,'')) > 2000 THEN
    RAISE EXCEPTION 'Invalid review';
  END IF;

  UPDATE public.guest_quiz_attempts
  SET rating=p_rating,feedback=COALESCE(p_feedback,'')
  WHERE id=p_completion_id
    AND guest_id=p_guest_id
    AND client_attempt_key=p_client_attempt_key;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF NOT v_updated THEN RAISE EXCEPTION 'Guest attempt not found or not owned'; END IF;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.update_guest_quiz_attempt_review_v2(TEXT,TEXT,TEXT,INTEGER,TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_guest_quiz_attempt_review_v2(TEXT,TEXT,TEXT,INTEGER,TEXT)
  TO anon;

NOTIFY pgrst, 'reload schema';
