-- Teacher-only quiz progress report: enrolled classroom students vs. their latest saved completion.
CREATE OR REPLACE FUNCTION public.get_teacher_quiz_progress(p_quiz_id TEXT)
RETURNS TABLE (
  student_id TEXT,
  student_name TEXT,
  student_photo TEXT,
  completed BOOLEAN,
  score INTEGER,
  total_questions INTEGER,
  completed_at TIMESTAMPTZ,
  attempts_count INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_classroom_id TEXT;
BEGIN
  SELECT q.classroom_id INTO v_classroom_id
  FROM public.quizzes q
  WHERE q.id = p_quiz_id;

  IF v_classroom_id IS NULL THEN
    RAISE EXCEPTION 'Quiz is not assigned to a classroom';
  END IF;

  IF NOT public.current_user_is_admin()
     AND NOT EXISTS (
       SELECT 1 FROM public.classrooms c
       WHERE c.id = v_classroom_id AND c.created_by = auth.uid()::text
     ) THEN
    RAISE EXCEPTION 'Teacher access required';
  END IF;

  RETURN QUERY
  SELECT
    cs.student_id,
    COALESCE(NULLIF(cs.student_name, ''), 'طالب')::TEXT,
    cs.student_photo,
    (c.id IS NOT NULL),
    c.score,
    c.total_questions,
    c.created_at,
    COALESCE((SELECT COUNT(*)::INTEGER FROM public.completions c2
              WHERE c2.quiz_id = p_quiz_id AND c2.taker_id = cs.student_id), 0)
  FROM public.classroom_students cs
  LEFT JOIN public.completions c
    ON c.quiz_id = p_quiz_id AND c.taker_id = cs.student_id
  WHERE cs.class_id = v_classroom_id
  ORDER BY completed DESC, LOWER(COALESCE(cs.student_name, ''));
END;
$$;

REVOKE ALL ON FUNCTION public.get_teacher_quiz_progress(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_teacher_quiz_progress(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
