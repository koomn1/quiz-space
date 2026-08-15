-- A processing lease makes waitUntil execution safe across retries. Only the
-- worker invocation that owns the current token may publish progress or a result.

ALTER TABLE public.extraction_jobs
  ADD COLUMN IF NOT EXISTS requested_question_count INTEGER
    CHECK (requested_question_count IS NULL OR requested_question_count BETWEEN 1 AND 500),
  ADD COLUMN IF NOT EXISTS processing_token UUID,
  ADD COLUMN IF NOT EXISTS processing_lease_expires_at TIMESTAMPTZ;
