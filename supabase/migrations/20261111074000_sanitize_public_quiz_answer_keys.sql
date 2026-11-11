-- Quiz Space AI 2.0 — Phase 2 public answer-key cutover.
-- Apply ONLY after the new web client and mobile-firebase-session-v2 Edge
-- Function are deployed and verified against the private-key preparation RPCs.
--
-- Migration 20261111073000 creates private answer-key storage and starts
-- capturing all new/updated keys while preserving the legacy public payload.
-- This marker activates the trigger's sanitization branch for this transaction
-- and all future quiz writes.

CREATE TABLE IF NOT EXISTS private.quiz_answer_key_cutover (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton = TRUE),
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE private.quiz_answer_key_cutover ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.quiz_answer_key_cutover FROM PUBLIC, anon, authenticated, service_role;

INSERT INTO private.quiz_answer_key_cutover(singleton)
VALUES (TRUE)
ON CONFLICT (singleton) DO NOTHING;

-- The existing trigger now removes correctIndex/correctAnswer/explanation
-- fields from every public quiz payload while retaining private answer rows.
UPDATE public.quizzes
SET questions = questions;

COMMENT ON TABLE private.quiz_answer_key_cutover IS
  'Private feature marker: when present, quiz writes strip answer keys from public questions JSON.';
