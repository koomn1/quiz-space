-- Add a premium stone/ice frame set and let verified super admins
-- manage storefront visibility for every catalog item type.

INSERT INTO public.reward_store_items (
  id, item_type, name, name_ar, description, description_ar,
  price_points, price_egp, reward_points, image_url, css_class,
  min_plan, is_active, sort_order, is_featured, updated_at
) VALUES
  (
    'frame_stone_royal', 'frame', 'Royal Basalt', 'البازلت الملكي',
    'Carved basalt and limestone ring with warm gold mineral veins.',
    'إطار من البازلت والحجر الجيري المنحوت بعروق ذهبية دافئة.',
    4200, 0, 0, 'clean-assets-replacement/frame-stone-royal-transparent.webp',
    'frame-stone-royal', 'gold', true, 101, false, now()
  ),
  (
    'frame_stone_moon', 'frame', 'Moonstone Citadel', 'قلعة حجر القمر',
    'Cool slate and pale granite frame with moonlit crystal seams.',
    'إطار من الأردواز والجرانيت الفاتح بلمسات بلورية مضيئة.',
    5000, 0, 0, 'clean-assets-replacement/frame-stone-moon-transparent.webp',
    'frame-stone-moon', 'gold', true, 102, false, now()
  ),
  (
    'frame_ice_glacier', 'frame', 'Glacier Crown', 'تاج الجليد الأزرق',
    'A faceted glacier ring with a bright blue crystal crown.',
    'إطار جليدي متعدد الأوجه تتوسطه بلورات زرقاء لامعة.',
    6200, 0, 0, 'clean-assets-replacement/frame-ice-glacier-transparent.webp',
    'frame-ice-glacier', 'diamond', true, 103, false, now()
  ),
  (
    'frame_ice_frost', 'frame', 'Frosted Snowflower', 'زهرة الصقيع',
    'Frost filigree and lavender crystals arranged as a winter snowflower.',
    'زخارف صقيع وبلورات بنفسجية في تكوين يشبه زهرة الشتاء.',
    7000, 0, 0, 'clean-assets-replacement/frame-ice-frost-transparent.webp',
    'frame-ice-frost', 'diamond', true, 104, false, now()
  )
ON CONFLICT (id) DO UPDATE SET
  item_type = EXCLUDED.item_type,
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  price_points = EXCLUDED.price_points,
  price_egp = EXCLUDED.price_egp,
  reward_points = EXCLUDED.reward_points,
  image_url = EXCLUDED.image_url,
  css_class = EXCLUDED.css_class,
  min_plan = EXCLUDED.min_plan,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  is_featured = EXCLUDED.is_featured,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.admin_set_reward_store_item_visibility(
  p_item_id TEXT,
  p_is_active BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item_id TEXT := trim(coalesce(p_item_id, ''));
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid = auth.uid()::text AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Super-admin permission required' USING ERRCODE = '42501';
  END IF;

  IF v_item_id = '' OR length(v_item_id) > 100 THEN
    RAISE EXCEPTION 'Invalid catalog item' USING ERRCODE = '22023';
  END IF;

  UPDATE public.reward_store_items
  SET is_active = coalesce(p_is_active, false), updated_at = now()
  WHERE id = v_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Catalog item was not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object('success', true, 'id', v_item_id, 'is_active', coalesce(p_is_active, false));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_reward_store_item_visibility(TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_reward_store_item_visibility(TEXT, BOOLEAN) TO authenticated;
