-- Use a SECURITY DEFINER helper so the admin lookup is not blocked by users RLS.
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE uid = auth.uid()::text
      AND is_admin = true
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;

DROP POLICY IF EXISTS coupon_codes_admin_write ON public.coupon_codes;
CREATE POLICY coupon_codes_admin_write
  ON public.coupon_codes FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS coupon_codes_admin_update ON public.coupon_codes;
CREATE POLICY coupon_codes_admin_update
  ON public.coupon_codes FOR UPDATE TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS coupon_codes_admin_delete ON public.coupon_codes;
CREATE POLICY coupon_codes_admin_delete
  ON public.coupon_codes FOR DELETE TO authenticated
  USING (public.current_user_is_admin());

NOTIFY pgrst, 'reload schema';
