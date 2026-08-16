-- Keep exported quiz PDFs private and user-scoped so they can be redownloaded safely.
CREATE TABLE IF NOT EXISTS public.pdf_export_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id TEXT REFERENCES public.quizzes(id) ON DELETE SET NULL,
  quiz_title TEXT NOT NULL CHECK (char_length(quiz_title) BETWEEN 1 AND 500),
  question_count INTEGER NOT NULL CHECK (question_count >= 0),
  file_name TEXT NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 180),
  storage_path TEXT NOT NULL UNIQUE CHECK (char_length(storage_path) BETWEEN 3 AND 512),
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 5242880),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pdf_export_history_user_created_idx
  ON public.pdf_export_history (user_id, created_at DESC);

ALTER TABLE public.pdf_export_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pdf_export_history_select_own ON public.pdf_export_history;
CREATE POLICY pdf_export_history_select_own
  ON public.pdf_export_history
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS pdf_export_history_insert_own ON public.pdf_export_history;
CREATE POLICY pdf_export_history_insert_own
  ON public.pdf_export_history
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

GRANT SELECT, INSERT ON public.pdf_export_history TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quiz-pdf-exports',
  'quiz-pdf-exports',
  false,
  5242880,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['application/pdf'];

DROP POLICY IF EXISTS quiz_pdf_exports_select_own ON storage.objects;
CREATE POLICY quiz_pdf_exports_select_own
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'quiz-pdf-exports'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

DROP POLICY IF EXISTS quiz_pdf_exports_insert_own ON storage.objects;
CREATE POLICY quiz_pdf_exports_insert_own
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'quiz-pdf-exports'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

DROP POLICY IF EXISTS quiz_pdf_exports_delete_own ON storage.objects;
CREATE POLICY quiz_pdf_exports_delete_own
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'quiz-pdf-exports'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );
