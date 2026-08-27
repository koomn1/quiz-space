-- Harden classroom access without changing or deleting existing rows.
-- The Supabase browser session is the authoritative identity for the web wrapper.

CREATE UNIQUE INDEX IF NOT EXISTS classroom_students_class_student_unique
  ON public.classroom_students (class_id, student_id);

ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_shared_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS classrooms_read ON public.classrooms;
CREATE POLICY classrooms_read ON public.classrooms FOR SELECT USING (
  created_by = auth.uid()::text
  OR EXISTS (
    SELECT 1 FROM public.classroom_students cs
    WHERE cs.class_id = classrooms.id AND cs.student_id = auth.uid()::text
  )
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.uid = auth.uid()::text AND u.is_admin = true
  )
);

DROP POLICY IF EXISTS classrooms_insert_auth ON public.classrooms;
CREATE POLICY classrooms_insert_auth ON public.classrooms FOR INSERT WITH CHECK (
  created_by = auth.uid()::text
);

DROP POLICY IF EXISTS classrooms_update_own ON public.classrooms;
CREATE POLICY classrooms_update_own ON public.classrooms FOR UPDATE USING (
  created_by = auth.uid()::text
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid()::text AND u.is_admin = true)
) WITH CHECK (
  created_by = auth.uid()::text
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid()::text AND u.is_admin = true)
);

DROP POLICY IF EXISTS classrooms_delete_own ON public.classrooms;
CREATE POLICY classrooms_delete_own ON public.classrooms FOR DELETE USING (
  created_by = auth.uid()::text
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid()::text AND u.is_admin = true)
);

DROP POLICY IF EXISTS classroom_students_read ON public.classroom_students;
CREATE POLICY classroom_students_read ON public.classroom_students FOR SELECT USING (
  student_id = auth.uid()::text
  OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_students.class_id AND c.created_by = auth.uid()::text)
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid()::text AND u.is_admin = true)
);

DROP POLICY IF EXISTS classroom_students_insert_own ON public.classroom_students;
CREATE POLICY classroom_students_insert_own ON public.classroom_students FOR INSERT WITH CHECK (
  student_id = auth.uid()::text
  AND EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_students.class_id)
);

DROP POLICY IF EXISTS classroom_students_admin_write ON public.classroom_students;
CREATE POLICY classroom_students_admin_write ON public.classroom_students FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_students.class_id AND c.created_by = auth.uid()::text)
);

DROP POLICY IF EXISTS classroom_students_update_teacher ON public.classroom_students;
CREATE POLICY classroom_students_update_teacher ON public.classroom_students FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_students.class_id AND c.created_by = auth.uid()::text)
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid()::text AND u.is_admin = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_students.class_id AND c.created_by = auth.uid()::text)
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid()::text AND u.is_admin = true)
);

DROP POLICY IF EXISTS classroom_messages_read ON public.classroom_messages;
CREATE POLICY classroom_messages_read ON public.classroom_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.classrooms c
    WHERE c.id = classroom_messages.classroom_id
      AND (c.created_by = auth.uid()::text OR EXISTS (
        SELECT 1 FROM public.classroom_students cs WHERE cs.class_id = c.id AND cs.student_id = auth.uid()::text
      ))
  )
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid()::text AND u.is_admin = true)
);

DROP POLICY IF EXISTS classroom_messages_insert_own ON public.classroom_messages;
CREATE POLICY classroom_messages_insert_own ON public.classroom_messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.classrooms c
    WHERE c.id = classroom_messages.classroom_id
      AND (c.created_by = auth.uid()::text OR (
        c.allow_student_messages = true
        AND EXISTS (SELECT 1 FROM public.classroom_students cs WHERE cs.class_id = c.id AND cs.student_id = auth.uid()::text)
      ))
  )
);

DROP POLICY IF EXISTS classroom_assignments_read ON public.classroom_assignments;
CREATE POLICY classroom_assignments_read ON public.classroom_assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_assignments.class_id AND c.created_by = auth.uid()::text)
  OR EXISTS (SELECT 1 FROM public.classroom_students cs WHERE cs.class_id = classroom_assignments.class_id AND cs.student_id = auth.uid()::text)
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid()::text AND u.is_admin = true)
);

DROP POLICY IF EXISTS classroom_assignments_insert ON public.classroom_assignments;
CREATE POLICY classroom_assignments_insert ON public.classroom_assignments FOR INSERT WITH CHECK (
  created_by = auth.uid()::text
  AND EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_assignments.class_id AND c.created_by = auth.uid()::text)
);

DROP POLICY IF EXISTS classroom_assignments_update_own ON public.classroom_assignments;
CREATE POLICY classroom_assignments_update_own ON public.classroom_assignments FOR UPDATE USING (
  created_by = auth.uid()::text
  OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_assignments.class_id AND c.created_by = auth.uid()::text)
) WITH CHECK (
  created_by = auth.uid()::text
  OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_assignments.class_id AND c.created_by = auth.uid()::text)
);

DROP POLICY IF EXISTS classroom_assignments_delete_own ON public.classroom_assignments;
CREATE POLICY classroom_assignments_delete_own ON public.classroom_assignments FOR DELETE USING (
  created_by = auth.uid()::text
  OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_assignments.class_id AND c.created_by = auth.uid()::text)
);

DROP POLICY IF EXISTS classroom_announcements_read ON public.classroom_announcements;
CREATE POLICY classroom_announcements_read ON public.classroom_announcements FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_announcements.class_id AND c.created_by = auth.uid()::text)
  OR EXISTS (SELECT 1 FROM public.classroom_students cs WHERE cs.class_id = classroom_announcements.class_id AND cs.student_id = auth.uid()::text)
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid()::text AND u.is_admin = true)
);

DROP POLICY IF EXISTS classroom_announcements_insert ON public.classroom_announcements;
CREATE POLICY classroom_announcements_insert ON public.classroom_announcements FOR INSERT WITH CHECK (
  posted_by = auth.uid()::text
  AND EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_announcements.class_id AND c.created_by = auth.uid()::text)
);

DROP POLICY IF EXISTS classroom_announcements_update ON public.classroom_announcements;
CREATE POLICY classroom_announcements_update ON public.classroom_announcements FOR UPDATE USING (
  posted_by = auth.uid()::text
  OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_announcements.class_id AND c.created_by = auth.uid()::text)
) WITH CHECK (
  posted_by = auth.uid()::text
  OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_announcements.class_id AND c.created_by = auth.uid()::text)
);

DROP POLICY IF EXISTS classroom_shared_files_read ON public.classroom_shared_files;
CREATE POLICY classroom_shared_files_read ON public.classroom_shared_files FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_shared_files.class_id AND c.created_by = auth.uid()::text)
  OR EXISTS (SELECT 1 FROM public.classroom_students cs WHERE cs.class_id = classroom_shared_files.class_id AND cs.student_id = auth.uid()::text)
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid()::text AND u.is_admin = true)
);

DROP POLICY IF EXISTS classroom_shared_files_insert ON public.classroom_shared_files;
CREATE POLICY classroom_shared_files_insert ON public.classroom_shared_files FOR INSERT WITH CHECK (
  shared_by = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.classrooms c
    WHERE c.id = classroom_shared_files.class_id
      AND (c.created_by = auth.uid()::text OR (
        c.allow_student_media = true
        AND EXISTS (SELECT 1 FROM public.classroom_students cs WHERE cs.class_id = c.id AND cs.student_id = auth.uid()::text)
      ))
  )
);

DROP POLICY IF EXISTS classroom_shared_files_delete_own ON public.classroom_shared_files;
CREATE POLICY classroom_shared_files_delete_own ON public.classroom_shared_files FOR DELETE USING (
  shared_by = auth.uid()::text
  OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_shared_files.class_id AND c.created_by = auth.uid()::text)
);
