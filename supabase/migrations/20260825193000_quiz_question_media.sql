-- Durable question media is public because published quizzes are public content.
-- Upload, update, and delete remain restricted to the authenticated owner folder.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quiz-question-media',
  'quiz-question-media',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

DROP POLICY IF EXISTS quiz_question_media_select_public ON storage.objects;
CREATE POLICY quiz_question_media_select_public
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'quiz-question-media');

DROP POLICY IF EXISTS quiz_question_media_insert_own ON storage.objects;
CREATE POLICY quiz_question_media_insert_own
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'quiz-question-media'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

DROP POLICY IF EXISTS quiz_question_media_update_own ON storage.objects;
CREATE POLICY quiz_question_media_update_own
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'quiz-question-media'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'quiz-question-media'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

DROP POLICY IF EXISTS quiz_question_media_delete_own ON storage.objects;
CREATE POLICY quiz_question_media_delete_own
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'quiz-question-media'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif'
]
WHERE id = 'quiz-extraction-uploads';
