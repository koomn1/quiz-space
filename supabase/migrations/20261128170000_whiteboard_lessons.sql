-- Whiteboard lesson library: per-user, server-side history of AI whiteboard lessons.
--
-- What this does:
--   1. Creates public.whiteboard_lessons (one row per saved lesson, keyed by (user_id, id)).
--   2. Enables row level security so each account can only read/write its own rows.
--   3. Grants the authenticated role normal CRUD (PostgREST).
--
-- Notes:
--   * user_id is TEXT, not UUID, on purpose: native app users sign in with Firebase and the
--     worker resolves them to an app_user_uid string (see mobile-firebase-session-v2), which is
--     not guaranteed to be a UUID. Web users get their Supabase auth.uid()::text.
--   * The AI worker writes with the service role and always filters user_id = <verified caller id>;
--     these RLS policies protect direct client access (web app via PostgREST with the user JWT).
--   * lesson_json holds the validated whiteboard document (board nodes, narration); the flat
--     columns exist so history lists don't have to parse JSONB.
--   * No data backfill: lessons saved before this table stayed on each device (localStorage /
--     SharedPreferences) and re-upload themselves the next time the user opens the whiteboard card.

CREATE TABLE IF NOT EXISTS public.whiteboard_lessons (
  user_id     TEXT        NOT NULL CHECK (char_length(user_id) BETWEEN 3 AND 256),
  id          TEXT        NOT NULL CHECK (char_length(id) BETWEEN 3 AND 64),
  title       TEXT        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  lang        TEXT        NOT NULL CHECK (lang IN ('ar', 'en')),
  step_count  INTEGER     NOT NULL CHECK (step_count BETWEEN 1 AND 24),
  source_name TEXT        CHECK (source_name IS NULL OR char_length(source_name) <= 255),
  model       TEXT        CHECK (model IS NULL OR char_length(model) <= 120),
  lesson_json JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS whiteboard_lessons_user_created_idx
  ON public.whiteboard_lessons (user_id, created_at DESC);

ALTER TABLE public.whiteboard_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS whiteboard_lessons_select_own ON public.whiteboard_lessons;
CREATE POLICY whiteboard_lessons_select_own
  ON public.whiteboard_lessons
  FOR SELECT
  TO authenticated
  USING ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS whiteboard_lessons_insert_own ON public.whiteboard_lessons;
CREATE POLICY whiteboard_lessons_insert_own
  ON public.whiteboard_lessons
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS whiteboard_lessons_update_own ON public.whiteboard_lessons;
CREATE POLICY whiteboard_lessons_update_own
  ON public.whiteboard_lessons
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid())::text = user_id)
  WITH CHECK ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS whiteboard_lessons_delete_own ON public.whiteboard_lessons;
CREATE POLICY whiteboard_lessons_delete_own
  ON public.whiteboard_lessons
  FOR DELETE
  TO authenticated
  USING ((select auth.uid())::text = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whiteboard_lessons TO authenticated;
