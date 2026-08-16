CREATE OR REPLACE FUNCTION set_institution_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION is_institution_manager(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION is_institution_member(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_institution_manager(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_institution_member(UUID) TO authenticated;
