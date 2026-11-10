-- Trusted SECURITY DEFINER subscription workflows may update entitlement fields;
-- ordinary authenticated profile writes still cannot.
CREATE OR REPLACE FUNCTION public.protect_privileged_user_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_is_service_role BOOLEAN;
  v_badge_update_allowed BOOLEAN;
  v_subscription_update_allowed BOOLEAN;
  v_auth_uid TEXT;
  v_auth_email TEXT;
BEGIN
  v_is_service_role := (auth.jwt() ->> 'role') = 'service_role';
  v_auth_uid := auth.uid()::TEXT;
  IF v_is_service_role OR v_auth_uid IS NULL THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.uid IS DISTINCT FROM v_auth_uid THEN
      RAISE EXCEPTION 'Users may only create their own profile';
    END IF;
    SELECT email INTO v_auth_email FROM auth.users WHERE id::TEXT = v_auth_uid;
    NEW.email := v_auth_email;
    NEW.is_premium := FALSE;
    NEW.plan_id := NULL;
    NEW.plan_name := 'Free';
    NEW.is_lifetime := FALSE;
    NEW.is_founder := FALSE;
    NEW.is_suspended := FALSE;
    NEW.is_admin := FALSE;
    NEW.category_id := NULL;
    NEW.renewal_date := NULL;
    NEW.premium_until := NULL;
    NEW.xp := 0;
    NEW.level := 1;
    NEW.badge_tier := 'none';
    NEW.name_color := 'default';
    NEW.badge_symbol := '';
    NEW.badge_color := '';
    NEW.active_frame_id := NULL;
    RETURN NEW;
  END IF;

  SELECT is_admin INTO v_is_admin FROM public.users WHERE uid = v_auth_uid;
  NEW.email := OLD.email;
  NEW.is_admin := OLD.is_admin;
  NEW.is_suspended := OLD.is_suspended;
  NEW.category_id := OLD.category_id;
  NEW.created_at := OLD.created_at;

  v_subscription_update_allowed :=
    COALESCE(current_setting('app.allow_subscription_update',TRUE),'') = 'on';

  IF NOT COALESCE(v_is_admin,FALSE) THEN
    NEW.xp := OLD.xp;
    NEW.level := OLD.level;
    IF NOT v_subscription_update_allowed THEN
      NEW.is_premium := OLD.is_premium;
      NEW.plan_id := OLD.plan_id;
      NEW.plan_name := OLD.plan_name;
      NEW.is_lifetime := OLD.is_lifetime;
      NEW.is_founder := OLD.is_founder;
      NEW.renewal_date := OLD.renewal_date;
      NEW.premium_until := OLD.premium_until;
    END IF;
  END IF;

  v_badge_update_allowed := COALESCE(current_setting('app.allow_badge_update',TRUE),'') = 'on';
  IF NOT v_badge_update_allowed THEN
    NEW.badge_tier := OLD.badge_tier;
    NEW.name_color := OLD.name_color;
    NEW.badge_color := OLD.badge_color;
    NEW.badge_symbol := OLD.badge_symbol;
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
