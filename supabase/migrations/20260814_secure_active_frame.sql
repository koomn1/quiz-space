CREATE OR REPLACE FUNCTION public.activate_reward_frame(p_item_id TEXT)
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

  IF p_item_id IS NULL OR length(trim(p_item_id)) = 0 OR length(trim(p_item_id)) > 100 THEN
    RAISE EXCEPTION 'Invalid frame selection' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.reward_inventory AS inventory
    JOIN public.reward_store_items AS item ON item.id = inventory.item_id
    WHERE inventory.user_id = v_user_id
      AND inventory.item_id = trim(p_item_id)
      AND inventory.is_active = true
      AND item.is_active = true
      AND item.item_type = 'frame'
  ) THEN
    RAISE EXCEPTION 'You do not own this frame' USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('app.quizspace_allow_frame_update', 'true', true);
  UPDATE public.users
  SET active_frame_id = trim(p_item_id), updated_at = now()
  WHERE uid = v_user_id;

  RETURN jsonb_build_object('success', true, 'active_frame_id', trim(p_item_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_unverified_active_frame_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.active_frame_id IS DISTINCT FROM OLD.active_frame_id
     AND current_setting('app.quizspace_allow_frame_update', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Active frames must be selected from owned inventory.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_verify_active_frame ON public.users;
CREATE TRIGGER users_verify_active_frame
  BEFORE UPDATE OF active_frame_id ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_unverified_active_frame_update();

REVOKE ALL ON FUNCTION public.activate_reward_frame(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_reward_frame(TEXT) TO authenticated;
