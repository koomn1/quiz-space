-- QuizSpace profile asset catalog hardening.
-- Every active frame must have one unique image asset. Free frames are owned by
-- every user at activation time and do not require a purchase row.

UPDATE public.reward_store_items
SET image_url = 'images/frame-diamond-comet.webp'
WHERE id = 'frame_diamond_comet';

UPDATE public.reward_store_items
SET image_url = 'images/frame-diamond-crown.webp'
WHERE id = 'frame_diamond_crown';

UPDATE public.reward_store_items
SET image_url = 'images/frame-star-crown.webp', is_featured = true
WHERE id = 'offer_vip_combo';

INSERT INTO public.reward_store_items
  (id, item_type, name, name_ar, description, description_ar, price_points, price_egp, reward_points, image_url, css_class, min_plan, sort_order, is_active)
VALUES
  ('frame_free_1', 'frame', 'Soft Halo', 'هالة ناعمة', 'A clean, subtle halo for every learner.', 'هالة بسيطة وناعمة لكل طالب.', 0, 0, 0, 'images/frame-free-1.webp', 'frame-free-soft-halo', 'free', 1, true),
  ('frame_free_2', 'frame', 'Clean Mint', 'نعناع هادئ', 'A calm mint frame with a crisp profile fit.', 'إطار نعناعي هادئ بملاءمة واضحة للصورة.', 0, 0, 0, 'images/frame-free-2.webp', 'frame-free-clean-mint', 'free', 2, true),
  ('frame_diamond_comet', 'frame', 'Diamond Comet', 'مذنب ماسي', 'Exclusive crystalline comet ring.', 'إطار بلوري حصري بتصميم مذنب.', 0, 0, 0, '/manus-storage/frame-diamond-comet_596fd1b8.webp', 'frame-diamond-comet', 'diamond', 60, true),
  ('frame_diamond_crown', 'frame', 'Diamond Crown', 'التاج الماسي', 'Exclusive crown ring with platinum facets.', 'إطار تاج حصري بلمسات بلاتينية.', 0, 0, 0, '/manus-storage/frame-diamond-crown_c3f3f17c.webp', 'frame-diamond-crown', 'diamond', 70, true),
  ('frame_ramadan_lantern', 'frame', 'Ramadan Crescent', 'هلال رمضان', 'A seasonal crescent and lantern ring.', 'إطار موسمي بالهلال والفانوس.', 1200, 0, 0, '/manus-storage/frame-ramadan-crescent_1c3d1be8.webp', 'frame-ramadan', 'free', 80, true),
  ('frame_back_to_school', 'frame', 'Back to School', 'العودة للمدارس', 'A seasonal school-themed profile ring.', 'إطار موسمي مستوحى من المدرسة والكتب.', 1000, 0, 0, '/manus-storage/frame-back-school_68d31549.webp', 'frame-school', 'free', 90, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  price_points = EXCLUDED.price_points,
  price_egp = EXCLUDED.price_egp,
  image_url = EXCLUDED.image_url,
  css_class = EXCLUDED.css_class,
  min_plan = EXCLUDED.min_plan,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

CREATE UNIQUE INDEX IF NOT EXISTS reward_store_active_frame_image_unique
  ON public.reward_store_items (image_url)
  WHERE item_type = 'frame' AND id <> 'offer_vip_combo' AND is_active = true AND image_url IS NOT NULL;

CREATE OR REPLACE FUNCTION public.activate_reward_frame(p_item_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_item_id TEXT := trim(p_item_id);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF v_item_id IS NULL OR length(v_item_id) = 0 OR length(v_item_id) > 100 THEN
    RAISE EXCEPTION 'Invalid frame selection' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.reward_store_items AS item
    WHERE item.id = v_item_id AND item.is_active = true AND item.item_type = 'frame'
  ) THEN
    RAISE EXCEPTION 'Invalid frame selection' USING ERRCODE = '22023';
  END IF;

  IF v_item_id NOT IN ('frame_free_1', 'frame_free_2') AND NOT EXISTS (
    SELECT 1
    FROM public.reward_inventory AS inventory
    WHERE inventory.user_id = v_user_id
      AND inventory.item_id = v_item_id
      AND inventory.is_active = true
  ) THEN
    RAISE EXCEPTION 'You do not own this frame' USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('app.quizspace_allow_frame_update', 'true', true);
  UPDATE public.users
  SET active_frame_id = v_item_id, updated_at = now()
  WHERE uid = v_user_id;

  RETURN jsonb_build_object('success', true, 'active_frame_id', v_item_id);
END;
$$;

REVOKE ALL ON FUNCTION public.activate_reward_frame(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_reward_frame(TEXT) TO authenticated;
