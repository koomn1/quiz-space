-- Persistent extraction controls: pause, resume, retry failed chunks, and cancel.
-- Existing error/complete rows remain backward compatible.
ALTER TABLE public.extraction_jobs
  DROP CONSTRAINT IF EXISTS extraction_jobs_status_check;
ALTER TABLE public.extraction_jobs
  ADD CONSTRAINT extraction_jobs_status_check
  CHECK (status IN ('pending', 'processing', 'paused', 'complete', 'error', 'cancelled'));

CREATE INDEX IF NOT EXISTS extraction_jobs_processing_controls_idx
  ON public.extraction_jobs (user_id, status, updated_at DESC);

-- A paused/cancelled job must not retain an active worker lease.
UPDATE public.extraction_jobs
SET processing_token = NULL,
    processing_lease_expires_at = NULL
WHERE status IN ('paused', 'cancelled');
