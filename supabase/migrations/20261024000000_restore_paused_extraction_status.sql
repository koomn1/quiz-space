-- Keep the extraction job status contract aligned with the Worker controls.
-- A previous follow-up migration accidentally removed `paused` again.
ALTER TABLE public.extraction_jobs
  DROP CONSTRAINT IF EXISTS extraction_jobs_status_check;

ALTER TABLE public.extraction_jobs
  ADD CONSTRAINT extraction_jobs_status_check
  CHECK (status IN ('pending', 'processing', 'paused', 'complete', 'error', 'cancelled'));
