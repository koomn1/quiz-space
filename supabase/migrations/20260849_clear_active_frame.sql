-- Persist an explicit "no frame" choice without bypassing ownership checks.
CREATE OR REPLACE FUNCTION public.deactivate_reward_frame()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('app.quizspace_allow_frame_update', 'true', true);
  UPDATE public.users
  SET active_frame_id = NULL, updated_at = now()
  WHERE uid = v_user_id;

  RETURN jsonb_build_object('success', true, 'active_frame_id', NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.deactivate_reward_frame() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deactivate_reward_frame() TO authenticated;
