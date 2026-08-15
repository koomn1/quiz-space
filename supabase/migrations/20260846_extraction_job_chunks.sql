-- Persisted work units for scanned PDF extraction. Each row represents a
-- small, independently retryable page range belonging to one user-owned job.

CREATE TABLE IF NOT EXISTS public.extraction_job_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_job_id UUID NOT NULL REFERENCES public.extraction_jobs(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),
  page_start INTEGER NOT NULL CHECK (page_start >= 1),
  page_end INTEGER NOT NULL CHECK (page_end >= page_start),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete', 'error')),
  processing_token UUID,
  processing_lease_expires_at TIMESTAMPTZ,
  questions_json JSONB,
  provider TEXT,
  error_message TEXT CHECK (error_message IS NULL OR char_length(error_message) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (parent_job_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS extraction_job_chunks_parent_status_idx
  ON public.extraction_job_chunks (parent_job_id, status, chunk_index);

CREATE OR REPLACE FUNCTION public.set_extraction_job_chunk_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS extraction_job_chunks_set_updated_at ON public.extraction_job_chunks;
CREATE TRIGGER extraction_job_chunks_set_updated_at
  BEFORE UPDATE ON public.extraction_job_chunks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_extraction_job_chunk_updated_at();

ALTER TABLE public.extraction_job_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS extraction_job_chunks_select_own ON public.extraction_job_chunks;
CREATE POLICY extraction_job_chunks_select_own
  ON public.extraction_job_chunks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.extraction_jobs jobs
      WHERE jobs.id = parent_job_id
        AND jobs.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS extraction_job_chunks_insert_own ON public.extraction_job_chunks;
CREATE POLICY extraction_job_chunks_insert_own
  ON public.extraction_job_chunks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.extraction_jobs jobs
      WHERE jobs.id = parent_job_id
        AND jobs.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS extraction_job_chunks_update_own ON public.extraction_job_chunks;
CREATE POLICY extraction_job_chunks_update_own
  ON public.extraction_job_chunks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.extraction_jobs jobs
      WHERE jobs.id = parent_job_id
        AND jobs.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.extraction_jobs jobs
      WHERE jobs.id = parent_job_id
        AND jobs.user_id = (select auth.uid())
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.extraction_job_chunks TO authenticated;
