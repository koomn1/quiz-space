CREATE OR REPLACE FUNCTION public.get_institution_export_brand_for_quiz(p_quiz_id TEXT)
RETURNS TABLE (
  institution_id UUID,
  institution_name TEXT,
  branding JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT institution.id, institution.name, institution.branding
  FROM public.quizzes quiz
  JOIN public.classrooms classroom ON classroom.id = quiz.classroom_id
  JOIN public.institutions institution ON institution.id = classroom.institution_id
  WHERE quiz.id = p_quiz_id
    AND public.is_institution_manager(institution.id)
    AND institution.status = 'active'
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_institution_export_brand_for_quiz(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_institution_export_brand_for_quiz(TEXT) TO authenticated;
