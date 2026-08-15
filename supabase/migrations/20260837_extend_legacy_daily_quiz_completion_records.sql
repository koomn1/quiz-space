-- An earlier daily-slot migration already created this table as a minimal
-- completion marker. Extend that live schema before the reward-aware RPC uses
-- it as the canonical daily completion record.
ALTER TABLE public.daily_quiz_completions
  ADD COLUMN IF NOT EXISTS id TEXT,
  ADD COLUMN IF NOT EXISTS quiz_title TEXT NOT NULL DEFAULT 'Daily Challenge',
  ADD COLUMN IF NOT EXISTS taker_name TEXT NOT NULL DEFAULT 'طالب متميز',
  ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_questions INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS rating INTEGER,
  ADD COLUMN IF NOT EXISTS feedback TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE public.daily_quiz_completions
SET id = COALESCE(id, 'daily_comp_' || substr(md5(user_id || ':' || quiz_id), 1, 24)),
    created_at = COALESCE(created_at, completed_at, now()),
    updated_at = COALESCE(updated_at, completed_at, now());

ALTER TABLE public.daily_quiz_completions
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS daily_quiz_completions_id_key
  ON public.daily_quiz_completions (id);
