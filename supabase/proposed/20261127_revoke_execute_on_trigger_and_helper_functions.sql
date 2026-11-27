-- PROPOSED, NOT APPLIED. Test on a staging database first.
-- Goal: reduce the Supabase Advisor "SECURITY DEFINER function executable by anon/authenticated" warnings
-- for functions that clients never call directly.
--
-- Safe class 1: trigger functions. Postgres does not check EXECUTE on the caller when a trigger fires,
-- so revoking from PUBLIC/anon/authenticated does not break triggers.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.prorettype = 'trigger'::regtype
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

-- Class 2 (review before enabling): helpers used only inside RLS policies, no client RPC calls.
-- Verify with: grep -rn "rpc('is_classroom_owner'\|rpc('is_classroom_student_member'" src worker
-- Policies call helpers as the querying role, so authenticated MUST keep EXECUTE if policies use them.
-- Therefore only revoke from anon, and only if no anon-reachable policy calls them:
-- REVOKE EXECUTE ON FUNCTION public.is_classroom_owner(text, text) FROM anon;
-- REVOKE EXECUTE ON FUNCTION public.is_classroom_student_member(text, text) FROM anon;
