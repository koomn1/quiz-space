-- Preserve source filename metadata for resumable extraction jobs.
-- File bytes remain private in Storage and are deleted after processing.
ALTER TABLE public.extraction_jobs
  ADD COLUMN IF NOT EXISTS source_file_name TEXT
    CHECK (source_file_name IS NULL OR char_length(source_file_name) BETWEEN 1 AND 255);
