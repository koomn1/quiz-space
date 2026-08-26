-- Store a bounded, non-sensitive classification for AI provider failures.
-- This is metadata only; it does not alter or delete existing quiz data.
ALTER TABLE public.ai_performance_logs
  ADD COLUMN IF NOT EXISTS error_category text;

ALTER TABLE public.ai_performance_logs
  DROP CONSTRAINT IF EXISTS ai_performance_logs_error_category_length;

ALTER TABLE public.ai_performance_logs
  ADD CONSTRAINT ai_performance_logs_error_category_length
  CHECK (error_category IS NULL OR char_length(error_category) BETWEEN 1 AND 32);
