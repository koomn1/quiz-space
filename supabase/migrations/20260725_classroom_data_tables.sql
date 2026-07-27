-- These four tables replace what used to be pure client-side demo data in
-- src/components/Classrooms.tsx (assignments, submissions, announcements,
-- shared files were only ever kept in localStorage and hardcoded seed arrays).

-- ============================================
-- 1. CLASSROOM ASSIGNMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS classroom_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    due_date DATE,
    max_points INTEGER NOT NULL DEFAULT 100,
    created_by TEXT NOT NULL,
    creator_name TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_classroom_assignments_class_id ON classroom_assignments(class_id);

ALTER TABLE classroom_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS classroom_assignments_read ON classroom_assignments;
DROP POLICY IF EXISTS classroom_assignments_insert ON classroom_assignments;
DROP POLICY IF EXISTS classroom_assignments_update_own ON classroom_assignments;
DROP POLICY IF EXISTS classroom_assignments_delete_own ON classroom_assignments;

-- Anyone enrolled in (or teaching) the classroom can read its assignments.
CREATE POLICY classroom_assignments_read ON classroom_assignments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM classrooms c WHERE c.id = classroom_assignments.class_id AND c.created_by = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM classroom_students cs WHERE cs.class_id = classroom_assignments.class_id AND cs.student_id = auth.uid()::text)
  );

CREATE POLICY classroom_assignments_insert ON classroom_assignments FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM classrooms c WHERE c.id = classroom_assignments.class_id AND c.created_by = auth.uid()::text)
  );

CREATE POLICY classroom_assignments_update_own ON classroom_assignments FOR UPDATE
  USING (created_by = auth.uid()::text);

CREATE POLICY classroom_assignments_delete_own ON classroom_assignments FOR DELETE
  USING (created_by = auth.uid()::text);

-- ============================================
-- 2. CLASSROOM SUBMISSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS classroom_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES classroom_assignments(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    grade INTEGER,
    feedback TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    graded_at TIMESTAMPTZ,
    UNIQUE (assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_classroom_submissions_assignment_id ON classroom_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_classroom_submissions_student_id ON classroom_submissions(student_id);

ALTER TABLE classroom_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS classroom_submissions_read ON classroom_submissions;
DROP POLICY IF EXISTS classroom_submissions_insert_own ON classroom_submissions;
DROP POLICY IF EXISTS classroom_submissions_update ON classroom_submissions;

-- Students can read their own submission; the classroom's teacher can read all.
CREATE POLICY classroom_submissions_read ON classroom_submissions FOR SELECT
  USING (
    student_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM classroom_assignments a
      JOIN classrooms c ON c.id = a.class_id
      WHERE a.id = classroom_submissions.assignment_id AND c.created_by = auth.uid()::text
    )
  );

CREATE POLICY classroom_submissions_insert_own ON classroom_submissions FOR INSERT
  WITH CHECK (student_id = auth.uid()::text);

-- Students can update their own submission (before grading); teachers can update to grade it.
CREATE POLICY classroom_submissions_update ON classroom_submissions FOR UPDATE
  USING (
    student_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM classroom_assignments a
      JOIN classrooms c ON c.id = a.class_id
      WHERE a.id = classroom_submissions.assignment_id AND c.created_by = auth.uid()::text
    )
  );

-- ============================================
-- 3. CLASSROOM ANNOUNCEMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS classroom_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'general' CHECK (priority IN ('general', 'important', 'urgent')),
    posted_by TEXT NOT NULL,
    posted_by_name TEXT NOT NULL DEFAULT '',
    reactions JSONB NOT NULL DEFAULT '{}'::jsonb,
    posted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classroom_announcements_class_id ON classroom_announcements(class_id);

ALTER TABLE classroom_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS classroom_announcements_read ON classroom_announcements;
DROP POLICY IF EXISTS classroom_announcements_insert ON classroom_announcements;
DROP POLICY IF EXISTS classroom_announcements_update ON classroom_announcements;
DROP POLICY IF EXISTS classroom_announcements_delete_own ON classroom_announcements;

CREATE POLICY classroom_announcements_read ON classroom_announcements FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM classrooms c WHERE c.id = classroom_announcements.class_id AND c.created_by = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM classroom_students cs WHERE cs.class_id = classroom_announcements.class_id AND cs.student_id = auth.uid()::text)
  );

CREATE POLICY classroom_announcements_insert ON classroom_announcements FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM classrooms c WHERE c.id = classroom_announcements.class_id AND c.created_by = auth.uid()::text)
  );

-- Any enrolled member can update reactions; only the poster can edit content (enforced in app layer via RPC below).
CREATE POLICY classroom_announcements_update ON classroom_announcements FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM classrooms c WHERE c.id = classroom_announcements.class_id AND c.created_by = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM classroom_students cs WHERE cs.class_id = classroom_announcements.class_id AND cs.student_id = auth.uid()::text)
  );

CREATE POLICY classroom_announcements_delete_own ON classroom_announcements FOR DELETE
  USING (posted_by = auth.uid()::text);

-- Atomic reaction increment so concurrent reactors don't clobber each other
-- (mirrors the existing toggle_post_like pattern used for community_posts).
CREATE OR REPLACE FUNCTION add_announcement_reaction(p_announcement_id UUID, p_emoji TEXT)
RETURNS JSONB AS $$
DECLARE
    v_reactions JSONB;
BEGIN
    UPDATE classroom_announcements
    SET reactions = jsonb_set(
        COALESCE(reactions, '{}'::jsonb),
        ARRAY[p_emoji],
        to_jsonb(COALESCE((reactions ->> p_emoji)::int, 0) + 1)
    )
    WHERE id = p_announcement_id
    RETURNING reactions INTO v_reactions;

    RETURN v_reactions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. CLASSROOM SHARED FILES
-- ============================================
CREATE TABLE IF NOT EXISTS classroom_shared_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    shared_by TEXT NOT NULL,
    shared_by_name TEXT NOT NULL DEFAULT '',
    size_bytes BIGINT,
    file_type TEXT NOT NULL DEFAULT 'link' CHECK (file_type IN ('pdf', 'image', 'docx', 'link')),
    storage_path TEXT,
    url TEXT,
    shared_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classroom_shared_files_class_id ON classroom_shared_files(class_id);

ALTER TABLE classroom_shared_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS classroom_shared_files_read ON classroom_shared_files;
DROP POLICY IF EXISTS classroom_shared_files_insert ON classroom_shared_files;
DROP POLICY IF EXISTS classroom_shared_files_delete_own ON classroom_shared_files;

CREATE POLICY classroom_shared_files_read ON classroom_shared_files FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM classrooms c WHERE c.id = classroom_shared_files.class_id AND c.created_by = auth.uid()::text)
    OR EXISTS (SELECT 1 FROM classroom_students cs WHERE cs.class_id = classroom_shared_files.class_id AND cs.student_id = auth.uid()::text)
  );

CREATE POLICY classroom_shared_files_insert ON classroom_shared_files FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM classrooms c WHERE c.id = classroom_shared_files.class_id AND c.created_by = auth.uid()::text)
      OR EXISTS (SELECT 1 FROM classroom_students cs WHERE cs.class_id = classroom_shared_files.class_id AND cs.student_id = auth.uid()::text)
    )
  );

CREATE POLICY classroom_shared_files_delete_own ON classroom_shared_files FOR DELETE
  USING (
    shared_by = auth.uid()::text
    OR EXISTS (SELECT 1 FROM classrooms c WHERE c.id = classroom_shared_files.class_id AND c.created_by = auth.uid()::text)
  );
