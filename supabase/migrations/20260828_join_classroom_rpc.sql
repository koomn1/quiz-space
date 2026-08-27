-- Join by invite code without exposing all classrooms to a non-member.
CREATE OR REPLACE FUNCTION public.join_classroom_by_code(p_class_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id text := auth.uid()::text;
  normalized_code text := upper(trim(coalesce(p_class_code, '')));
  classroom_row public.classrooms%ROWTYPE;
  user_row public.users%ROWTYPE;
BEGIN
  IF caller_id IS NULL OR caller_id = '' THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  IF normalized_code !~ '^[A-Z0-9_-]{3,64}$' THEN
    RAISE EXCEPTION 'Invalid classroom code';
  END IF;

  SELECT * INTO classroom_row
  FROM public.classrooms
  WHERE upper(code) = normalized_code
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Classroom not found';
  END IF;

  SELECT * INTO user_row
  FROM public.users
  WHERE uid = caller_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  INSERT INTO public.classroom_students (
    id, class_id, class_code, student_id, student_name, student_photo, joined_at, last_active
  ) VALUES (
    gen_random_uuid()::text,
    classroom_row.id,
    classroom_row.code,
    caller_id,
    coalesce(nullif(user_row.name, ''), 'طالب QuizSpace'),
    user_row.photo_url,
    now(),
    now()
  )
  ON CONFLICT (class_id, student_id)
  DO UPDATE SET last_active = now();

  RETURN jsonb_build_object(
    'id', classroom_row.id,
    'name', classroom_row.name,
    'code', classroom_row.code,
    'created_at', classroom_row.created_at,
    'created_by', classroom_row.created_by,
    'creator_name', classroom_row.creator_name,
    'allow_student_messages', classroom_row.allow_student_messages,
    'allow_student_media', classroom_row.allow_student_media
  );
END;
$$;

REVOKE ALL ON FUNCTION public.join_classroom_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_classroom_by_code(text) TO authenticated;
