-- Students may create/update their own submission content, but only a
-- classroom owner may change grades, feedback, or grading timestamps.
CREATE OR REPLACE FUNCTION public.guard_classroom_submission_grading()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
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

DROP TRIGGER IF EXISTS classroom_submission_grading_guard ON public.classroom_submissions;
CREATE TRIGGER classroom_submission_grading_guard
BEFORE UPDATE ON public.classroom_submissions
FOR EACH ROW
EXECUTE FUNCTION public.guard_classroom_submission_grading();
