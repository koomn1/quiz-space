-- Fix Infinite Recursion in PostgreSQL RLS Policies for relation "classrooms"
-- Using SECURITY DEFINER helper functions breaks the circular RLS evaluation loop completely.

CREATE OR REPLACE FUNCTION public.is_classroom_student_member(p_class_id text, p_student_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classroom_students
    WHERE class_id = p_class_id AND student_id = p_student_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_classroom_owner(p_class_id text, p_user_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classrooms
    WHERE id = p_class_id AND created_by = p_user_id
  );
$$;

-- Fix classrooms_read Policy to eliminate circular query into classroom_students RLS
DROP POLICY IF EXISTS classrooms_read ON public.classrooms;
CREATE POLICY classrooms_read ON public.classrooms FOR SELECT USING (
  created_by = auth.uid()::text
  OR public.is_classroom_student_member(classrooms.id, auth.uid()::text)
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.uid = auth.uid()::text AND u.is_admin = true
  )
);

-- Fix classroom_students_read Policy to eliminate circular query into classrooms RLS
DROP POLICY IF EXISTS classroom_students_read ON public.classroom_students;
CREATE POLICY classroom_students_read ON public.classroom_students FOR SELECT USING (
  student_id = auth.uid()::text
  OR public.is_classroom_owner(classroom_students.class_id, auth.uid()::text)
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.uid = auth.uid()::text AND u.is_admin = true
  )
);
