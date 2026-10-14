-- Fix SQLSTATE 22023 on installations whose PostgreSQL timezone catalog
-- does not include the IANA Asia/Cairo name. Cairo is UTC+2 for the app's
-- configured reward window; avoid timezone-name lookup inside the RPC path.
CREATE OR REPLACE FUNCTION public.is_happy_hour()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_hour integer;
BEGIN
  v_hour := (extract(hour from now())::integer + 2) % 24;
  RETURN v_hour >= 18 AND v_hour < 20;
END;
$function$;
