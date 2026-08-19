-- Persist a recoverable copy of the profile cover independently of the
-- serialized location settings used by legacy clients.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS cover_url TEXT;

COMMENT ON COLUMN public.users.cover_url IS
  'Optional URL of the user-selected custom profile cover.';

-- Ensure the REST API sees the column immediately after the migration.
NOTIFY pgrst, 'reload schema';
