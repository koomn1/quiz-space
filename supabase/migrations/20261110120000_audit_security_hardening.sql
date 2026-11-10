-- QuizSpace audit hardening (QS-01, QS-04, QS-07, QS-08, QS-12)
-- Safe to apply after the existing baseline migrations.

-- Never trust discount values or plan eligibility supplied by the browser.
CREATE OR REPLACE FUNCTION public.record_coupon_usage(
  p_coupon_id text,
  p_user_id text,
  p_discount_percent integer,
  p_plan_id text DEFAULT NULL,
  p_order_id text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_coupon public.coupon_codes%ROWTYPE;
  v_usage_id text;
  v_plan_allowed boolean;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS NULL OR auth.uid()::text <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO v_coupon FROM public.coupon_codes WHERE id = p_coupon_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Coupon not found'; END IF;
  IF NOT v_coupon.is_active OR (v_coupon.expiry_date IS NOT NULL AND v_coupon.expiry_date < now()) THEN
    RAISE EXCEPTION 'Coupon is inactive or expired';
  END IF;
  IF v_coupon.used_count >= v_coupon.max_uses THEN RAISE EXCEPTION 'Coupon usage limit reached'; END IF;
  IF EXISTS (SELECT 1 FROM public.coupon_usages WHERE coupon_id = p_coupon_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'User has already used this coupon';
  END IF;
  v_plan_allowed := COALESCE(NULLIF(trim(v_coupon.applicable_plans), ''), '') = ''
    OR EXISTS (
      SELECT 1 FROM unnest(string_to_array(lower(v_coupon.applicable_plans), ',')) AS allowed(plan)
      WHERE trim(allowed.plan) = lower(trim(COALESCE(p_plan_id, '')))
    );
  IF NOT v_plan_allowed THEN RAISE EXCEPTION 'Coupon is not valid for this plan'; END IF;
  v_usage_id := 'cu_' || extract(epoch FROM clock_timestamp())::bigint || '_' || substr(md5(random()::text), 1, 8);
  INSERT INTO public.coupon_usages (id, coupon_id, user_id, discount_percent, plan_id, order_id)
  VALUES (v_usage_id, p_coupon_id, p_user_id, v_coupon.discount_percent, NULLIF(trim(p_plan_id), ''), NULLIF(trim(p_order_id), ''));
  UPDATE public.coupon_codes SET used_count = used_count + 1 WHERE id = p_coupon_id;
  RETURN v_usage_id;
END;
$$;

-- Protect identity and progression columns from direct browser updates.
CREATE OR REPLACE FUNCTION public.protect_privileged_user_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_admin boolean;
  v_is_service_role boolean;
  v_badge_update_allowed boolean;
BEGIN
  v_is_service_role := (auth.jwt() ->> 'role') = 'service_role';
  IF v_is_service_role THEN RETURN NEW; END IF;
  SELECT is_admin INTO v_is_admin FROM public.users WHERE uid = auth.uid()::text;
  v_badge_update_allowed := COALESCE(current_setting('app.allow_badge_update', true), '') = 'on';
  IF COALESCE(v_is_admin, false) THEN
    NEW.is_admin := OLD.is_admin;
  ELSE
    NEW.is_premium := OLD.is_premium;
    NEW.plan_id := OLD.plan_id;
    NEW.plan_name := OLD.plan_name;
    NEW.is_lifetime := OLD.is_lifetime;
    NEW.is_founder := OLD.is_founder;
    NEW.is_suspended := OLD.is_suspended;
    NEW.category_id := OLD.category_id;
    NEW.renewal_date := OLD.renewal_date;
    NEW.is_admin := OLD.is_admin;
  END IF;
  IF NOT v_badge_update_allowed THEN
    NEW.badge_tier := OLD.badge_tier;
    NEW.name_color := OLD.name_color;
    NEW.badge_color := OLD.badge_color;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE UPDATE (email, xp, level) ON public.users FROM anon, authenticated;

-- Rebuild community identity/stat fields from the trusted profile on browser writes.
CREATE OR REPLACE FUNCTION public.normalize_community_post_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_user public.users%ROWTYPE;
BEGIN
  IF (auth.jwt() ->> 'role') = 'service_role' THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL OR NEW.author_id <> auth.uid()::text THEN RAISE EXCEPTION 'Invalid post author'; END IF;
  SELECT * INTO v_user FROM public.users WHERE uid = auth.uid()::text;
  IF NOT FOUND THEN RAISE EXCEPTION 'User profile not found'; END IF;
  NEW.author_name := COALESCE(v_user.name, 'QuizSpace');
  NEW.author_badge_symbol := COALESCE(v_user.badge_symbol, '');
  NEW.author_badge_color := COALESCE(v_user.badge_color, '');
  NEW.author_badge_tier := COALESCE(v_user.badge_tier, 'none');
  NEW.author_name_color := COALESCE(v_user.name_color, 'default');
  NEW.likes := 0;
  NEW.liked_by := '[]'::jsonb;
  NEW.views_count := 0;
  NEW.viewers := '[]'::jsonb;
  RETURN NEW;
END;
$$;
REVOKE UPDATE (author_id, author_name, author_badge_symbol, author_badge_color,
  author_badge_tier, author_name_color, likes, liked_by, views_count, viewers)
  ON public.community_posts FROM anon, authenticated;
DROP TRIGGER IF EXISTS trg_normalize_community_post_identity ON public.community_posts;
CREATE TRIGGER trg_normalize_community_post_identity
BEFORE INSERT ON public.community_posts
FOR EACH ROW EXECUTE FUNCTION public.normalize_community_post_identity();

-- Remove duplicate follows before enforcing the invariant.
DELETE FROM public.follows a
USING public.follows b
WHERE a.ctid > b.ctid
  AND a.follower_id = b.follower_id
  AND a.following_id = b.following_id;
ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_no_self;
ALTER TABLE public.follows ADD CONSTRAINT follows_no_self CHECK (follower_id <> following_id);
CREATE UNIQUE INDEX IF NOT EXISTS follows_follower_following_uidx
ON public.follows (follower_id, following_id);

-- Membership expiry must be checked at purchase time, not only by plan_name.
CREATE OR REPLACE FUNCTION public.purchase_reward_item(p_item_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id text := auth.uid()::text;
  v_item public.reward_store_items%ROWTYPE;
  v_user public.users%ROWTYPE;
  v_balance integer;
  v_new_balance integer;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_item FROM public.reward_store_items WHERE id = trim(p_item_id) AND is_active = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Store item not found'; END IF;
  IF v_item.item_type NOT IN ('frame', 'cosmetic') THEN RAISE EXCEPTION 'This item requires a payment order'; END IF;
  SELECT * INTO v_user FROM public.users WHERE uid = v_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User profile not found'; END IF;
  IF NOT (COALESCE(v_user.is_lifetime, false) OR COALESCE(v_user.is_founder, false)
      OR (COALESCE(v_user.is_premium, false) AND (v_user.renewal_date IS NULL OR v_user.renewal_date >= now()))) THEN
    RAISE EXCEPTION 'Active membership required';
  END IF;
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
    VALUES (v_user_id, -v_item.price_points, 'store_purchase', 'store_purchase:' || gen_random_uuid()::text, v_item.id, jsonb_build_object('item_id', v_item.id));
  END IF;
  INSERT INTO public.reward_inventory (user_id, item_id, quantity, source)
  VALUES (v_user_id, v_item.id, 1, CASE WHEN v_item.price_points = 0 THEN 'membership' ELSE 'points_purchase' END);
  RETURN jsonb_build_object('success', true, 'item_id', v_item.id, 'points_spent', v_item.price_points, 'total_points', v_new_balance);
END;
$$;
REVOKE ALL ON FUNCTION public.purchase_reward_item(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_reward_item(text) TO authenticated;
