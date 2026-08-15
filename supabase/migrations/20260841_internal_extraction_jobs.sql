-- Internal, resumable document-extraction jobs.
-- Source files remain private in Storage and the job contains only metadata
-- and the structured extraction result, never raw file bytes.

CREATE TABLE IF NOT EXISTS public.extraction_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL CHECK (char_length(idempotency_key) BETWEEN 16 AND 128),
  file_storage_path TEXT NOT NULL CHECK (char_length(file_storage_path) BETWEEN 3 AND 512),
  file_mime_type TEXT NOT NULL CHECK (char_length(file_mime_type) BETWEEN 3 AND 160),
  extraction_mode TEXT NOT NULL DEFAULT 'literal' CHECK (extraction_mode IN ('literal', 'generate')),
  custom_instruction TEXT CHECK (custom_instruction IS NULL OR char_length(custom_instruction) <= 2000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete', 'error')),
  progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  processed_chunks INTEGER NOT NULL DEFAULT 0 CHECK (processed_chunks >= 0),
  total_chunks INTEGER CHECK (total_chunks IS NULL OR total_chunks > 0),
  progress_message TEXT CHECK (progress_message IS NULL OR char_length(progress_message) <= 500),
  questions_json JSONB,
  quiz_title TEXT,
  quiz_description TEXT,
  provider TEXT,
  error_message TEXT CHECK (error_message IS NULL OR char_length(error_message) <= 500),
  processing_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS extraction_jobs_user_status_created_idx
  ON public.extraction_jobs (user_id, status, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_extraction_job_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS extraction_jobs_set_updated_at ON public.extraction_jobs;
CREATE TRIGGER extraction_jobs_set_updated_at
  BEFORE UPDATE ON public.extraction_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_extraction_job_updated_at();

ALTER TABLE public.extraction_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS extraction_jobs_select_own ON public.extraction_jobs;
CREATE POLICY extraction_jobs_select_own
  ON public.extraction_jobs
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS extraction_jobs_insert_own ON public.extraction_jobs;
CREATE POLICY extraction_jobs_insert_own
  ON public.extraction_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS extraction_jobs_update_own ON public.extraction_jobs;
CREATE POLICY extraction_jobs_update_own
  ON public.extraction_jobs
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE ON public.extraction_jobs TO authenticated;

-- Private, short-lived source documents used only while their matching job runs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quiz-extraction-uploads',
  'quiz-extraction-uploads',
  false,
  12582912,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS extraction_uploads_select_own ON storage.objects;
CREATE POLICY extraction_uploads_select_own
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'quiz-extraction-uploads'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

DROP POLICY IF EXISTS extraction_uploads_insert_own ON storage.objects;
CREATE POLICY extraction_uploads_insert_own
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'quiz-extraction-uploads'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

DROP POLICY IF EXISTS extraction_uploads_delete_own ON storage.objects;
CREATE POLICY extraction_uploads_delete_own
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'quiz-extraction-uploads'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );
