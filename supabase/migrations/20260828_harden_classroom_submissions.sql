-- Scope assignment submissions to classroom membership and keep immutable identity fields.
DROP POLICY IF EXISTS classroom_submissions_insert_own ON public.classroom_submissions;
CREATE POLICY classroom_submissions_insert_own ON public.classroom_submissions FOR INSERT WITH CHECK (
  student_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.classroom_assignments a
    JOIN public.classrooms c ON c.id = a.class_id
    WHERE a.id = classroom_submissions.assignment_id
      AND (c.created_by = auth.uid()::text OR EXISTS (
        SELECT 1 FROM public.classroom_students cs
        WHERE cs.class_id = c.id AND cs.student_id = auth.uid()::text
      ))
  )
);

DROP POLICY IF EXISTS classroom_submissions_update ON public.classroom_submissions;
CREATE POLICY classroom_submissions_update ON public.classroom_submissions FOR UPDATE USING (
  student_id = auth.uid()::text
  OR EXISTS (
    SELECT 1
    FROM public.classroom_assignments a
    JOIN public.classrooms c ON c.id = a.class_id
    WHERE a.id = classroom_submissions.assignment_id AND c.created_by = auth.uid()::text
  )
) WITH CHECK (
  student_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.classroom_assignments a
    JOIN public.classrooms c ON c.id = a.class_id
    WHERE a.id = classroom_submissions.assignment_id
      AND (c.created_by = auth.uid()::text OR EXISTS (
        SELECT 1 FROM public.classroom_students cs
        WHERE cs.class_id = c.id AND cs.student_id = auth.uid()::text
      ))
  )
);

CREATE OR REPLACE FUNCTION public.guard_classroom_submission_grading()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.student_id IS DISTINCT FROM OLD.student_id
     OR NEW.assignment_id IS DISTINCT FROM OLD.assignment_id THEN
    RAISE EXCEPTION 'Submission ownership and assignment cannot be changed';
  END IF;

  IF auth.uid()::text = NEW.student_id
     AND (
       NEW.grade IS DISTINCT FROM OLD.grade
       OR NEW.feedback IS DISTINCT FROM OLD.feedback
       OR NEW.graded_at IS DISTINCT FROM OLD.graded_at
     ) THEN
    RAISE EXCEPTION 'Only the classroom teacher can grade submissions';
  END IF;
  RETURN NEW;
END;
$$;
