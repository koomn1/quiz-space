CREATE OR REPLACE FUNCTION public.get_admin_overview_snapshot()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN jsonb_build_object(
    'classrooms', COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.created_at DESC) FROM public.classrooms c), '[]'::jsonb),
    'students', COALESCE((SELECT jsonb_agg(to_jsonb(cs) ORDER BY cs.joined_at DESC NULLS LAST) FROM public.classroom_students cs), '[]'::jsonb)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_admin_overview_snapshot() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_overview_snapshot() TO authenticated;
