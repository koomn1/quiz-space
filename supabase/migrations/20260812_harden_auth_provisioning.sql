-- The auth trigger writes only to fully-qualified public.users, so it does not
-- need to inherit a caller-controlled search_path.
ALTER FUNCTION public.handle_new_user() SET search_path = '';
