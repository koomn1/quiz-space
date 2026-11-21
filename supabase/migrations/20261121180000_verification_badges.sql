-- Verification badge catalog: admin-managed image badges selectable by users.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS active_verification_badge_id UUID;

CREATE TABLE IF NOT EXISTS public.verification_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  image_url TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  description_ar TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES public.users(uid) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_active_verification_badge_fk;
ALTER TABLE public.users
  ADD CONSTRAINT users_active_verification_badge_fk
  FOREIGN KEY (active_verification_badge_id)
  REFERENCES public.verification_badges(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS verification_badges_active_order_idx
  ON public.verification_badges(is_active, sort_order, created_at);

ALTER TABLE public.verification_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS verification_badges_public_read ON public.verification_badges;
CREATE POLICY verification_badges_public_read ON public.verification_badges
  FOR SELECT TO anon, authenticated USING (is_active = true OR EXISTS (
    SELECT 1 FROM public.users u WHERE u.uid = auth.uid()::text AND u.is_admin = true
  ));
DROP POLICY IF EXISTS verification_badges_admin_insert ON public.verification_badges;
CREATE POLICY verification_badges_admin_insert ON public.verification_badges
  FOR INSERT TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM public.users u WHERE u.uid = auth.uid()::text AND u.is_admin = true
  ));
DROP POLICY IF EXISTS verification_badges_admin_update ON public.verification_badges;
CREATE POLICY verification_badges_admin_update ON public.verification_badges
  FOR UPDATE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.users u WHERE u.uid = auth.uid()::text AND u.is_admin = true
  ));
DROP POLICY IF EXISTS verification_badges_admin_delete ON public.verification_badges;
CREATE POLICY verification_badges_admin_delete ON public.verification_badges
  FOR DELETE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.users u WHERE u.uid = auth.uid()::text AND u.is_admin = true
  ));

CREATE OR REPLACE FUNCTION public.set_active_verification_badge(p_badge_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_badge_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.verification_badges WHERE id = p_badge_id AND is_active = true
  ) THEN RAISE EXCEPTION 'Verification badge is not available'; END IF;
  UPDATE public.users SET active_verification_badge_id = p_badge_id, updated_at = now()
  WHERE uid = auth.uid()::text;
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_active_verification_badge(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_verification_badge(p_user_id TEXT)
RETURNS TABLE(id UUID, name TEXT, name_ar TEXT, image_url TEXT, description TEXT, description_ar TEXT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT b.id, b.name, b.name_ar, b.image_url, b.description, b.description_ar
  FROM public.users u
  JOIN public.verification_badges b ON b.id = u.active_verification_badge_id
  WHERE (u.uid = p_user_id OR (u.custom_id IS NOT NULL AND lower(u.custom_id) = lower(p_user_id)))
    AND b.is_active = true
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_verification_badge(TEXT) TO anon, authenticated;

INSERT INTO public.verification_badges (name, name_ar, image_url, description, description_ar, sort_order)
SELECT * FROM (VALUES
  ('3D Blue Check', 'علامة التوثيق الزرقاء ثلاثية الأبعاد', '/verification-badges/blue-check-3d.png', 'Official blue verification mark', 'علامة توثيق زرقاء رسمية', 10),
  ('Sky Verified', 'التوثيق السماوي', '/verification-badges/verified-sky.png', 'Sky blue verified mark', 'علامة توثيق سماوية', 20),
  ('Gold Verified', 'التوثيق الذهبي', '/verification-badges/verified-gold.png', 'Golden verified mark', 'علامة توثيق ذهبية', 30),
  ('Violet Verified', 'التوثيق البنفسجي', '/verification-badges/verified-violet.png', 'Violet verified mark', 'علامة توثيق بنفسجية', 40),
  ('AI Verified', 'توثيق الذكاء الاصطناعي', '/verification-badges/verified-ai.png', 'AI platform verified mark', 'علامة توثيق منصة الذكاء الاصطناعي', 50)
) AS seed(name, name_ar, image_url, description, description_ar, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.verification_badges);

NOTIFY pgrst, 'reload schema';
