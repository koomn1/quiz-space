-- Link new and existing classrooms to an eligible Diamond institution.
ALTER TABLE public.classrooms
  ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_classrooms_institution_id
  ON public.classrooms(institution_id)
  WHERE institution_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quizzes_classroom_category
  ON public.quizzes(classroom_id, category);

CREATE INDEX IF NOT EXISTS idx_completions_quiz_taker_created
  ON public.completions(quiz_id, taker_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.attach_creator_institution_to_classroom()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id TEXT := auth.uid()::text;
  v_institution_id UUID;
BEGIN
  IF v_actor_id IS NOT NULL AND NEW.created_by <> v_actor_id THEN
    RAISE EXCEPTION 'غير مصرح بإنشاء فصل لمستخدم آخر';
  END IF;

  IF NEW.institution_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.institution_members member
      JOIN public.institutions institution ON institution.id = member.institution_id
      WHERE member.institution_id = NEW.institution_id
        AND member.user_id = NEW.created_by
        AND member.status = 'active'
        AND institution.status = 'active'
    ) THEN
      RAISE EXCEPTION 'لا يمكن ربط الفصل بمؤسسة غير مفعّلة لهذا المعلم';
    END IF;
    RETURN NEW;
  END IF;

  SELECT member.institution_id
  INTO v_institution_id
  FROM public.institution_members member
  JOIN public.institutions institution ON institution.id = member.institution_id
  WHERE member.user_id = NEW.created_by
    AND member.status = 'active'
    AND institution.status = 'active'
  ORDER BY member.created_at ASC
  LIMIT 1;

  NEW.institution_id := v_institution_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS attach_creator_institution_to_classroom_trigger ON public.classrooms;
CREATE TRIGGER attach_creator_institution_to_classroom_trigger
  BEFORE INSERT OR UPDATE OF institution_id, created_by ON public.classrooms
  FOR EACH ROW EXECUTE FUNCTION public.attach_creator_institution_to_classroom();

UPDATE public.classrooms classroom
SET institution_id = (
  SELECT member.institution_id
  FROM public.institution_members member
  JOIN public.institutions institution ON institution.id = member.institution_id
  WHERE member.user_id = classroom.created_by
    AND member.status = 'active'
    AND institution.status = 'active'
  ORDER BY member.created_at ASC
  LIMIT 1
)
WHERE classroom.institution_id IS NULL;

CREATE OR REPLACE FUNCTION public.can_view_institution_learning_gaps(p_institution_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.institution_members member
    JOIN public.institutions institution ON institution.id = member.institution_id
    WHERE member.institution_id = p_institution_id
      AND member.user_id = auth.uid()::text
      AND member.status = 'active'
      AND institution.status = 'active'
      AND (
        member.role IN ('owner', 'manager')
        OR EXISTS (
          SELECT 1
          FROM public.classrooms classroom
          WHERE classroom.institution_id = p_institution_id
            AND classroom.created_by = auth.uid()::text
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_institution_learning_gap_students(p_institution_id UUID)
RETURNS TABLE (
  student_id TEXT,
  student_name TEXT,
  student_photo_url TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_view_institution_learning_gaps(p_institution_id) THEN
    RAISE EXCEPTION 'غير مصرح بعرض تحليلات طلاب هذه المؤسسة';
  END IF;

  RETURN QUERY
  SELECT DISTINCT student.student_id, user_profile.name, user_profile.photo_url
  FROM public.classroom_students student
  JOIN public.classrooms classroom ON classroom.id = student.class_id
  JOIN public.users user_profile ON user_profile.uid = student.student_id
  WHERE classroom.institution_id = p_institution_id
    AND (
      public.is_institution_manager(p_institution_id)
      OR classroom.created_by = auth.uid()::text
    )
  ORDER BY user_profile.name NULLS LAST, student.student_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_institution_learning_gaps(
  p_institution_id UUID,
  p_student_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  student_id TEXT,
  student_name TEXT,
  student_photo_url TEXT,
  category TEXT,
  quizzes_taken INTEGER,
  average_score NUMERIC,
  mastery_percent INTEGER,
  gap_level TEXT,
  latest_completion_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_view_institution_learning_gaps(p_institution_id) THEN
    RAISE EXCEPTION 'غير مصرح بعرض تحليلات طلاب هذه المؤسسة';
  END IF;

  IF p_student_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.classroom_students student
    JOIN public.classrooms classroom ON classroom.id = student.class_id
    WHERE classroom.institution_id = p_institution_id
      AND student.student_id = p_student_id
      AND (
        public.is_institution_manager(p_institution_id)
        OR classroom.created_by = auth.uid()::text
      )
  ) THEN
    RAISE EXCEPTION 'الطالب المطلوب ليس ضمن نطاق المؤسسة المصرح به';
  END IF;

  RETURN QUERY
  SELECT
    completion.taker_id,
    user_profile.name,
    user_profile.photo_url,
    COALESCE(NULLIF(BTRIM(quiz.category), ''), 'غير مصنف') AS category,
    COUNT(*)::INTEGER AS quizzes_taken,
    ROUND(AVG((completion.score::NUMERIC / NULLIF(completion.total_questions, 0)) * 100), 1) AS average_score,
    ROUND(AVG((completion.score::NUMERIC / NULLIF(completion.total_questions, 0)) * 100))::INTEGER AS mastery_percent,
    CASE
      WHEN AVG((completion.score::NUMERIC / NULLIF(completion.total_questions, 0)) * 100) < 50 THEN 'priority'
      WHEN AVG((completion.score::NUMERIC / NULLIF(completion.total_questions, 0)) * 100) < 75 THEN 'watch'
      ELSE 'strong'
    END AS gap_level,
    MAX(completion.created_at) AS latest_completion_at
  FROM public.completions completion
  JOIN public.quizzes quiz ON quiz.id = completion.quiz_id
  JOIN public.classrooms classroom ON classroom.id = quiz.classroom_id
  JOIN public.classroom_students student
    ON student.class_id = classroom.id
    AND student.student_id = completion.taker_id
  JOIN public.users user_profile ON user_profile.uid = completion.taker_id
  WHERE classroom.institution_id = p_institution_id
    AND (p_student_id IS NULL OR completion.taker_id = p_student_id)
    AND (
      public.is_institution_manager(p_institution_id)
      OR classroom.created_by = auth.uid()::text
    )
    AND completion.total_questions > 0
  GROUP BY completion.taker_id, user_profile.name, user_profile.photo_url, COALESCE(NULLIF(BTRIM(quiz.category), ''), 'غير مصنف')
  ORDER BY mastery_percent ASC, latest_completion_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_creator_institution_to_classroom() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_institution_learning_gaps(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_institution_learning_gap_students(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_institution_learning_gaps(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_institution_learning_gap_students(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_institution_learning_gaps(UUID, TEXT) TO authenticated;
