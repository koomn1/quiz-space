-- The legacy table gained timestamps through a nullable extension migration.
-- Keep its future inserts safe even when callers omit these bookkeeping fields.
ALTER TABLE public.daily_quiz_completions
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();
