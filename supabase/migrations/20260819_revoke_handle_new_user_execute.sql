-- handle_new_user is invoked only by the auth trigger. It must not be exposed
-- as a client-callable RPC because it depends on trigger-only NEW values.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
