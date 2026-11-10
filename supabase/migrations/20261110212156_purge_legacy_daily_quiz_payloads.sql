-- Remove legacy client-carried answer payloads from existing unanswered slots.
-- The next refresh creates a server-owned v2 payload from the private bank.
UPDATE public.daily_quiz_user_slots
SET quiz_id = NULL,
    quiz_payload = NULL,
    generated_at = NULL,
    refreshing = FALSE,
    bank_id = NULL
WHERE answered_at IS NULL
  AND quiz_payload IS NOT NULL;

-- Clients must use the authenticated SECURITY DEFINER slot RPCs, never raw table reads.
REVOKE ALL ON TABLE public.daily_quiz_user_slots FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
