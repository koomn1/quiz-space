-- Firebase-to-QuizSpace accounts may use legacy text UIDs such as X4PiWcRJ5CeNgMWJDYDbdOqfpHw2.
-- Never cast every users.uid to UUID: users.uid is the authoritative text key,
-- while users.id is a separate UUID compatibility column.
CREATE OR REPLACE FUNCTION public.sync_users_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.uid IS NOT NULL AND NEW.uid ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    NEW.id := NEW.uid::uuid;
  ELSIF TG_OP = 'INSERT' AND NEW.id IS NULL THEN
    NEW.id := gen_random_uuid();
  END IF;
  RETURN NEW;
END;
$$;
