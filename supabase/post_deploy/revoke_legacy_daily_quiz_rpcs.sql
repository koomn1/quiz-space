-- Run ONLY after the updated web client is deployed.
-- This retires the legacy daily-quiz RPCs that return client-carried answer keys
-- or accept a client-supplied score. The v2 client uses *_v2 RPCs exclusively.
REVOKE ALL ON FUNCTION public.get_user_daily_quiz_slot(TEXT,TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_user_daily_quiz_refresh(TEXT,TEXT,JSONB)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_user_daily_quiz_attempt(TEXT,TEXT,TEXT,INTEGER,INTEGER,INTEGER,TEXT)
  FROM PUBLIC, anon, authenticated;

-- The new guest review client sends a per-attempt key to the v2 RPC.
REVOKE ALL ON FUNCTION public.update_guest_quiz_attempt_review(TEXT,TEXT,INTEGER,TEXT)
  FROM PUBLIC, anon, authenticated;

-- Score-edit RPCs allowed clients to rewrite a saved completion after the quiz.
-- The new review UI is read-only; creator essay grading uses grade_quiz_essay_attempt.
REVOKE ALL ON FUNCTION public.update_quiz_attempt_score(TEXT,INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_guest_quiz_attempt_score(TEXT,TEXT,TEXT,INTEGER)
  FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- Retire the old public/authenticated quiz submission RPCs that accept p_score.
REVOKE ALL ON FUNCTION public.submit_quiz_attempt(TEXT,TEXT,TEXT,INTEGER,INTEGER,TEXT,JSONB)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_guest_quiz_attempt(TEXT,TEXT,TEXT,INTEGER,TEXT,INTEGER,TEXT,JSONB)
  FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
