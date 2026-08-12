-- Restrict classroom message metadata and encrypted payload access to authorized participants.
DROP POLICY IF EXISTS classroom_messages_read ON public.classroom_messages;
DROP POLICY IF EXISTS classroom_messages_read_authorized ON public.classroom_messages;

CREATE POLICY classroom_messages_read_authorized
  ON public.classroom_messages
  FOR SELECT
  TO authenticated
  USING (
    sender_id = (auth.uid())::text
    OR EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.uid = (auth.uid())::text
        AND u.is_admin = true
    )
    OR EXISTS (
      SELECT 1
      FROM public.classrooms c
      WHERE c.id = classroom_messages.classroom_id
        AND c.created_by = (auth.uid())::text
    )
    OR EXISTS (
      SELECT 1
      FROM public.classroom_students cs
      WHERE cs.class_id = classroom_messages.classroom_id
        AND cs.student_id = (auth.uid())::text
    )
  );

DROP POLICY IF EXISTS classroom_messages_insert_own ON public.classroom_messages;
DROP POLICY IF EXISTS classroom_messages_insert_authorized ON public.classroom_messages;

CREATE POLICY classroom_messages_insert_authorized
  ON public.classroom_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (auth.uid())::text
    AND (
      EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid = (auth.uid())::text
          AND u.is_admin = true
      )
      OR EXISTS (
        SELECT 1
        FROM public.classrooms c
        WHERE c.id = classroom_messages.classroom_id
          AND c.created_by = (auth.uid())::text
      )
      OR EXISTS (
        SELECT 1
        FROM public.classroom_students cs
        JOIN public.classrooms c ON c.id = cs.class_id
        WHERE cs.student_id = (auth.uid())::text
          AND cs.class_id = classroom_messages.classroom_id
          AND c.allow_student_messages = true
      )
    )
  );
