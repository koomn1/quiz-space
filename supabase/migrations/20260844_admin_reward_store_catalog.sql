-- Reward catalog administration is RPC-only. RLS continues to control all
-- storefront reads, while the functions below fail closed to super admins.

CREATE OR REPLACE FUNCTION public.admin_upsert_reward_store_item(
  p_id TEXT,
  p_name TEXT,
  p_name_ar TEXT,
  p_description TEXT DEFAULT '',
  p_description_ar TEXT DEFAULT '',
  p_price_points INTEGER DEFAULT 0,
  p_price_egp NUMERIC DEFAULT 0,
  p_image_url TEXT DEFAULT NULL,
  p_css_class TEXT DEFAULT NULL,
  p_min_plan TEXT DEFAULT 'free',
  p_sort_order INTEGER DEFAULT 0,
  p_is_featured BOOLEAN DEFAULT FALSE,
  p_is_active BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id TEXT := lower(trim(coalesce(p_id, '')));
  v_name TEXT := trim(coalesce(p_name, ''));
  v_name_ar TEXT := trim(coalesce(p_name_ar, ''));
  v_image_url TEXT := nullif(trim(coalesce(p_image_url, '')), '');
  v_plan TEXT := lower(trim(coalesce(p_min_plan, 'free')));
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid = auth.uid()::text AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Super-admin permission required' USING ERRCODE = '42501';
  END IF;

  IF v_id !~ '^[a-z0-9][a-z0-9_-]{2,96}$' OR v_name = '' OR v_name_ar = '' THEN
    RAISE EXCEPTION 'Invalid catalog item' USING ERRCODE = '22023';
  END IF;
  IF coalesce(p_price_points, 0) < 0 OR coalesce(p_price_egp, 0) < 0 OR coalesce(p_sort_order, 0) < 0 THEN
    RAISE EXCEPTION 'Invalid catalog pricing or order' USING ERRCODE = '22023';
  END IF;
  IF v_plan NOT IN ('free', 'silver', 'gold', 'diamond') THEN
    RAISE EXCEPTION 'Invalid minimum plan' USING ERRCODE = '22023';
  END IF;
  IF v_image_url IS NULL THEN
    RAISE EXCEPTION 'Frame image is required' USING ERRCODE = '22023';
  END IF;
  IF p_is_active AND EXISTS (
    SELECT 1 FROM public.reward_store_items
    WHERE item_type = 'frame' AND image_url = v_image_url AND id <> v_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'An active frame already uses this image' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.reward_store_items (
    id, item_type, name, name_ar, description, description_ar,
    price_points, price_egp, image_url, css_class, min_plan,
    sort_order, is_featured, is_active, updated_at
  ) VALUES (
    v_id, 'frame', v_name, v_name_ar, coalesce(p_description, ''), coalesce(p_description_ar, ''),
    coalesce(p_price_points, 0), coalesce(p_price_egp, 0), v_image_url, nullif(trim(coalesce(p_css_class, '')), ''), v_plan,
    coalesce(p_sort_order, 0), coalesce(p_is_featured, false), coalesce(p_is_active, true), now()
  ) ON CONFLICT (id) DO UPDATE SET
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
    is_featured = EXCLUDED.is_featured,
    is_active = EXCLUDED.is_active,
    updated_at = now();

  RETURN jsonb_build_object('success', true, 'id', v_id, 'is_active', coalesce(p_is_active, true));
END;
$$;

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

  IF v_item_id = '' THEN
    RAISE EXCEPTION 'Invalid catalog item' USING ERRCODE = '22023';
  END IF;

  UPDATE public.reward_store_items
  SET is_active = coalesce(p_is_active, false), updated_at = now()
  WHERE id = v_item_id AND item_type = 'frame';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Frame was not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object('success', true, 'id', v_item_id, 'is_active', coalesce(p_is_active, false));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_upsert_reward_store_item(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, NUMERIC, TEXT, TEXT, TEXT, INTEGER, BOOLEAN, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_reward_store_item_visibility(TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_upsert_reward_store_item(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, NUMERIC, TEXT, TEXT, TEXT, INTEGER, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_reward_store_item_visibility(TEXT, BOOLEAN) TO authenticated;
