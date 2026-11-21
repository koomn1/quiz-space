DROP POLICY IF EXISTS verification_badges_admin_storage_insert ON storage.objects;
CREATE POLICY verification_badges_admin_storage_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND name LIKE 'verification-badges/' || (select auth.uid())::text || '/%'
    AND EXISTS (SELECT 1 FROM public.users u WHERE u.uid = (select auth.uid())::text AND u.is_admin = true)
  );

DROP POLICY IF EXISTS verification_badges_admin_storage_update ON storage.objects;
CREATE POLICY verification_badges_admin_storage_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND name LIKE 'verification-badges/' || (select auth.uid())::text || '/%'
    AND EXISTS (SELECT 1 FROM public.users u WHERE u.uid = (select auth.uid())::text AND u.is_admin = true)
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND name LIKE 'verification-badges/' || (select auth.uid())::text || '/%'
    AND EXISTS (SELECT 1 FROM public.users u WHERE u.uid = (select auth.uid())::text AND u.is_admin = true)
  );
