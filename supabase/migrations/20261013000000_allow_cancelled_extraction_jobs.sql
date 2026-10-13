-- The worker and frontend support cancelling a stale extraction job.
-- Keep the database status constraint aligned with that contract.
ALTER TABLE public.extraction_jobs
  DROP CONSTRAINT IF EXISTS extraction_jobs_status_check;

ALTER TABLE public.extraction_jobs
  ADD CONSTRAINT extraction_jobs_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'complete'::text, 'error'::text, 'cancelled'::text]));
