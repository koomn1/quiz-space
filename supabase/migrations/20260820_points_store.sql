-- QuizSpace points store, cosmetic inventory, payment orders, and admin grants.
-- All balance changes happen inside SECURITY DEFINER functions; clients never write balances directly.

CREATE TABLE IF NOT EXISTS public.reward_store_items (
  id TEXT PRIMARY KEY,
  item_type TEXT NOT NULL CHECK (item_type IN ('frame', 'points_bundle', 'cosmetic')),
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  description_ar TEXT NOT NULL DEFAULT '',
  price_points INTEGER NOT NULL DEFAULT 0 CHECK (price_points >= 0),
  price_egp NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price_egp >= 0),
  reward_points INTEGER NOT NULL DEFAULT 0 CHECK (reward_points >= 0),
  image_url TEXT,
  css_class TEXT,
  min_plan TEXT NOT NULL DEFAULT 'free' CHECK (min_plan IN ('free', 'silver', 'gold', 'diamond')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reward_inventory (
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES public.reward_store_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  source TEXT NOT NULL DEFAULT 'purchase',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS public.reward_store_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES public.reward_store_items(id),
  order_type TEXT NOT NULL DEFAULT 'points_purchase' CHECK (order_type IN ('points_purchase', 'cosmetic_purchase')),
  amount_points INTEGER NOT NULL DEFAULT 0 CHECK (amount_points >= 0),
  amount_egp NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (amount_egp >= 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('vodafone_cash', 'instapay', 'points')),
  payment_reference TEXT,
  receipt_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  notes TEXT,
  approved_by TEXT REFERENCES public.users(uid),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reward_payment_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  vodafone_number TEXT NOT NULL DEFAULT '',
  instapay_handle TEXT NOT NULL DEFAULT '',
  instapay_link TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.reward_payment_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.reward_store_items (id, item_type, name, name_ar, description, description_ar, price_points, price_egp, reward_points, css_class, min_plan, sort_order) VALUES
  ('frame_neon_orbit', 'frame', 'Neon Orbit', 'مدار نيون', 'A bright cosmic ring for your profile photo.', 'إطار كوني مضيء لصورة ملفك الشخصي.', 400, 0, 0, 'frame-neon-orbit', 'free', 10),
  ('frame_aurora', 'frame', 'Aurora Glass', 'زجاج الشفق', 'A soft aurora glow with a glass finish.', 'وهج شفق ناعم بلمسة زجاجية.', 800, 0, 0, 'frame-aurora', 'free', 20),
  ('frame_fire', 'frame', 'Fire Trail', 'أثر النار', 'A bold animated-looking flame border.', 'إطار ناري جريء بطابع متحرك.', 1200, 0, 0, 'frame-fire', 'free', 30),
  ('frame_crystal_luxe', 'frame', 'Crystal Luxe', 'كريستال فاخر', 'A premium crystal-style profile frame.', 'إطار كريستالي فاخر لصورتك.', 1800, 0, 0, 'frame-crystal-luxe', 'free', 40),
  ('frame_star_crown', 'frame', 'Star Crown', 'تاج النجوم', 'A celebratory crown for quiz champions.', 'تاج احتفالي لأبطال الاختبارات.', 2400, 0, 0, 'frame-star-crown', 'free', 50),
  ('frame_diamond_comet', 'frame', 'Diamond Comet', 'مذنب ماسي', 'Exclusive frame included with Diamond membership.', 'إطار حصري مجاني لمشتركي الباقة الماسية.', 0, 0, 0, 'frame-diamond-comet', 'diamond', 60),
  ('frame_diamond_crown', 'frame', 'Diamond Crown', 'التاج الماسي', 'Exclusive premium frame included with Diamond membership.', 'إطار فاخر حصري مجاني لمشتركي الباقة الماسية.', 0, 0, 0, 'frame-diamond-crown', 'diamond', 70),
  ('points_100', 'points_bundle', '100 Points', '100 نقطة', 'A starter points pack.', 'باقة نقاط بداية.', 0, 20, 100, NULL, 'free', 100),
  ('points_300', 'points_bundle', '300 Points', '300 نقطة', 'A practical points pack for frames and rewards.', 'باقة عملية لشراء الإطارات والمكافآت.', 0, 50, 300, NULL, 'free', 110),
  ('points_800', 'points_bundle', '800 Points', '800 نقطة', 'A better-value points pack.', 'باقة نقاط بقيمة أفضل.', 0, 120, 800, NULL, 'free', 120),
  ('points_2000', 'points_bundle', '2,000 Points', '2000 نقطة', 'The champion points pack.', 'باقة أبطال الاختبارات.', 0, 250, 2000, NULL, 'free', 130)
ON CONFLICT (id) DO UPDATE SET
  item_type = EXCLUDED.item_type, name = EXCLUDED.name, name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description, description_ar = EXCLUDED.description_ar,
  price_points = EXCLUDED.price_points, price_egp = EXCLUDED.price_egp,
  reward_points = EXCLUDED.reward_points, css_class = EXCLUDED.css_class,
  min_plan = EXCLUDED.min_plan, sort_order = EXCLUDED.sort_order, updated_at = now();

CREATE INDEX IF NOT EXISTS reward_store_items_active_idx ON public.reward_store_items(is_active, sort_order);
CREATE INDEX IF NOT EXISTS reward_inventory_user_idx ON public.reward_inventory(user_id, is_active);
CREATE INDEX IF NOT EXISTS reward_store_orders_user_idx ON public.reward_store_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reward_store_orders_status_idx ON public.reward_store_orders(status, created_at DESC);

ALTER TABLE public.reward_store_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_payment_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reward_store_items_read ON public.reward_store_items;
CREATE POLICY reward_store_items_read ON public.reward_store_items FOR SELECT TO authenticated USING (is_active = true OR EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid()::text AND u.is_admin = true));

DROP POLICY IF EXISTS reward_inventory_own_read ON public.reward_inventory;
CREATE POLICY reward_inventory_own_read ON public.reward_inventory FOR SELECT TO authenticated USING (user_id = auth.uid()::text OR EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid()::text AND u.is_admin = true));

DROP POLICY IF EXISTS reward_store_orders_own_read ON public.reward_store_orders;
CREATE POLICY reward_store_orders_own_read ON public.reward_store_orders FOR SELECT TO authenticated USING (user_id = auth.uid()::text OR EXISTS (SELECT 1 FROM public.users u WHERE u.uid = auth.uid()::text AND u.is_admin = true));
DROP POLICY IF EXISTS reward_store_orders_own_insert ON public.reward_store_orders;
CREATE POLICY reward_store_orders_own_insert ON public.reward_store_orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS reward_payment_settings_read ON public.reward_payment_settings;
CREATE POLICY reward_payment_settings_read ON public.reward_payment_settings FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.reward_plan_rank(p_plan TEXT)
RETURNS INTEGER AS $$
  SELECT CASE
    WHEN lower(coalesce(p_plan, '')) LIKE '%diamond%' OR lower(coalesce(p_plan, '')) LIKE '%الماس%' THEN 4
    WHEN lower(coalesce(p_plan, '')) LIKE '%gold%' OR lower(coalesce(p_plan, '')) LIKE '%ذهبي%' THEN 3
    WHEN lower(coalesce(p_plan, '')) LIKE '%silver%' OR lower(coalesce(p_plan, '')) LIKE '%فضي%' THEN 2
    ELSE 1
  END;
$$ LANGUAGE SQL IMMUTABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.purchase_reward_item(p_item_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_item public.reward_store_items%ROWTYPE;
  v_user public.users%ROWTYPE;
  v_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_item FROM public.reward_store_items WHERE id = p_item_id AND is_active = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Store item not found'; END IF;
  IF v_item.item_type <> 'frame' AND v_item.item_type <> 'cosmetic' THEN RAISE EXCEPTION 'This item requires a payment order'; END IF;
  SELECT * INTO v_user FROM public.users WHERE uid = v_user_id;
  IF public.reward_plan_rank(v_user.plan_name) < public.reward_plan_rank(v_item.min_plan) THEN RAISE EXCEPTION 'This item requires a higher membership plan'; END IF;
  IF EXISTS (SELECT 1 FROM public.reward_inventory WHERE user_id = v_user_id AND item_id = v_item.id AND is_active = true) THEN
    RETURN jsonb_build_object('success', false, 'already_owned', true, 'item_id', v_item.id);
  END IF;

  SELECT points INTO v_balance FROM public.user_reward_balances WHERE user_id = v_user_id FOR UPDATE;
  v_balance := COALESCE(v_balance, 0);
  IF v_item.price_points > v_balance THEN RAISE EXCEPTION 'Not enough points'; END IF;
  v_new_balance := v_balance - v_item.price_points;

  INSERT INTO public.user_reward_balances (user_id, points, level)
  VALUES (v_user_id, v_new_balance, public.reward_level_for_points(v_new_balance))
  ON CONFLICT (user_id) DO UPDATE SET points = EXCLUDED.points, level = EXCLUDED.level, updated_at = now();

  IF v_item.price_points > 0 THEN
    INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id, metadata)
    VALUES (v_user_id, -v_item.price_points, 'store_purchase', 'store_purchase:' || gen_random_uuid()::text, v_item.id, jsonb_build_object('item_id', v_item.id, 'item_name', v_item.name));
  END IF;

  INSERT INTO public.reward_inventory (user_id, item_id, quantity, source)
  VALUES (v_user_id, v_item.id, 1, CASE WHEN v_item.price_points = 0 THEN 'diamond_membership' ELSE 'points_purchase' END);

  RETURN jsonb_build_object('success', true, 'item_id', v_item.id, 'points_spent', v_item.price_points, 'total_points', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.create_reward_points_order(p_item_id TEXT, p_payment_method TEXT, p_payment_reference TEXT DEFAULT NULL, p_receipt_url TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_item public.reward_store_items%ROWTYPE;
  v_order public.reward_store_orders%ROWTYPE;
BEGIN
  IF p_payment_method NOT IN ('vodafone_cash', 'instapay') THEN RAISE EXCEPTION 'Unsupported payment method'; END IF;
  SELECT * INTO v_item FROM public.reward_store_items WHERE id = p_item_id AND is_active = true AND item_type = 'points_bundle';
  IF NOT FOUND THEN RAISE EXCEPTION 'Points bundle not found'; END IF;
  INSERT INTO public.reward_store_orders (user_id, item_id, order_type, amount_points, amount_egp, payment_method, payment_reference, receipt_url)
  VALUES (v_user_id, v_item.id, 'points_purchase', v_item.reward_points, v_item.price_egp, p_payment_method, NULLIF(trim(p_payment_reference), ''), p_receipt_url)
  RETURNING * INTO v_order;
  RETURN jsonb_build_object('success', true, 'order_id', v_order.id, 'status', v_order.status, 'amount_egp', v_order.amount_egp, 'reward_points', v_item.reward_points);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.admin_grant_reward_points(p_user_id TEXT, p_points INTEGER, p_note TEXT DEFAULT '')
RETURNS JSONB AS $$
DECLARE
  v_admin public.users%ROWTYPE;
  v_new_balance INTEGER;
BEGIN
  SELECT * INTO v_admin FROM public.users WHERE uid = auth.uid()::text AND is_admin = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_points <= 0 OR p_points > 1000000 THEN RAISE EXCEPTION 'Invalid points amount'; END IF;
  INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id, metadata)
  VALUES (p_user_id, p_points, 'admin_grant', 'admin_grant:' || gen_random_uuid()::text, p_user_id, jsonb_build_object('note', p_note, 'admin_id', v_admin.uid));
  INSERT INTO public.user_reward_balances (user_id, points, level)
  VALUES (p_user_id, p_points, public.reward_level_for_points(p_points))
  ON CONFLICT (user_id) DO UPDATE SET points = public.user_reward_balances.points + p_points, level = public.reward_level_for_points(public.user_reward_balances.points + p_points), updated_at = now()
  RETURNING points INTO v_new_balance;
  RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'points_added', p_points, 'total_points', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.admin_review_reward_order(p_order_id UUID, p_status TEXT, p_note TEXT DEFAULT '')
RETURNS JSONB AS $$
DECLARE
  v_admin public.users%ROWTYPE;
  v_order public.reward_store_orders%ROWTYPE;
  v_item public.reward_store_items%ROWTYPE;
  v_new_balance INTEGER;
BEGIN
  SELECT * INTO v_admin FROM public.users WHERE uid = auth.uid()::text AND is_admin = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_status NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'Invalid review status'; END IF;
  SELECT * INTO v_order FROM public.reward_store_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.status <> 'pending' THEN RETURN jsonb_build_object('success', false, 'status', v_order.status); END IF;
  UPDATE public.reward_store_orders SET status = p_status, notes = NULLIF(p_note, ''), approved_by = v_admin.uid, updated_at = now() WHERE id = p_order_id;
  IF p_status = 'rejected' THEN RETURN jsonb_build_object('success', true, 'status', 'rejected'); END IF;

  SELECT * INTO v_item FROM public.reward_store_items WHERE id = v_order.item_id;
  INSERT INTO public.reward_points_ledger (user_id, points, event_type, event_key, reference_id, metadata)
  VALUES (v_order.user_id, v_item.reward_points, 'points_purchase', 'reward_order:' || v_order.id::text, v_order.id::text, jsonb_build_object('item_id', v_item.id, 'payment_method', v_order.payment_method, 'amount_egp', v_order.amount_egp))
  ON CONFLICT (user_id, event_key) DO NOTHING;
  INSERT INTO public.user_reward_balances (user_id, points, level)
  VALUES (v_order.user_id, v_item.reward_points, public.reward_level_for_points(v_item.reward_points))
  ON CONFLICT (user_id) DO UPDATE SET points = public.user_reward_balances.points + v_item.reward_points, level = public.reward_level_for_points(public.user_reward_balances.points + v_item.reward_points), updated_at = now()
  RETURNING points INTO v_new_balance;
  RETURN jsonb_build_object('success', true, 'status', 'approved', 'points_added', v_item.reward_points, 'total_points', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.reward_plan_rank(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_reward_item(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_reward_points_order(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_reward_points(TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_reward_order(UUID, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
