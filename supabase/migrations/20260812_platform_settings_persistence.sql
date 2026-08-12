-- Persistent, singleton platform settings with a fail-closed admin-only update path.
CREATE TABLE IF NOT EXISTS public.platform_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton = true),
  maintenance_mode boolean NOT NULL DEFAULT false,
  allow_registrations boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);

INSERT INTO public.platform_settings (singleton, maintenance_mode, allow_registrations)
VALUES (true, false, true)
ON CONFLICT (singleton) DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_settings_public_read ON public.platform_settings;
CREATE POLICY platform_settings_public_read
  ON public.platform_settings
  FOR SELECT
  USING (true);

-- No direct INSERT, UPDATE, or DELETE policy is deliberately provided.
-- All writes must pass through the checked SECURITY DEFINER RPC below.

CREATE OR REPLACE FUNCTION public.update_platform_settings(
  p_maintenance_mode boolean,
  p_allow_registrations boolean
)
RETURNS TABLE (
  maintenance_mode boolean,
  allow_registrations boolean,
  updated_at timestamptz,
  updated_by text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE uid = auth.uid()::text
      AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Administrator permission is required to update platform settings.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.platform_settings
  SET maintenance_mode = p_maintenance_mode,
      allow_registrations = p_allow_registrations,
      updated_at = now(),
      updated_by = auth.uid()::text
  WHERE singleton = true;

  RETURN QUERY
  SELECT ps.maintenance_mode, ps.allow_registrations, ps.updated_at, ps.updated_by
  FROM public.platform_settings AS ps
  WHERE ps.singleton = true;
END;
$$;

REVOKE ALL ON FUNCTION public.update_platform_settings(boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_platform_settings(boolean, boolean) TO authenticated;

-- Enforce the registration toggle in the database so it cannot be bypassed by
-- invoking Supabase Auth directly from a modified browser client.
CREATE OR REPLACE FUNCTION public.enforce_registration_policy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allow_registrations boolean := true;
BEGIN
  SELECT ps.allow_registrations
  INTO v_allow_registrations
  FROM public.platform_settings AS ps
  WHERE ps.singleton = true;

  IF COALESCE(v_allow_registrations, true) = false THEN
    RAISE EXCEPTION 'New registrations are currently unavailable.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_registration_policy() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_registration_policy() TO supabase_auth_admin;

DROP TRIGGER IF EXISTS enforce_registration_policy_before_insert ON auth.users;
CREATE TRIGGER enforce_registration_policy_before_insert
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_registration_policy();
