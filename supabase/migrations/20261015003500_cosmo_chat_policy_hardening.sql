-- Tighten ownership checks on mutable metadata and memory provenance.
DROP POLICY IF EXISTS cosmo_file_assets_update_own ON public.cosmo_file_assets;
CREATE POLICY cosmo_file_assets_update_own ON public.cosmo_file_assets
  FOR UPDATE TO authenticated USING ((select auth.uid())::text = user_id)
  WITH CHECK (
    (select auth.uid())::text = user_id
    AND split_part(storage_path, '/', 1) = (select auth.uid())::text
  );

DROP POLICY IF EXISTS cosmo_memory_items_own ON public.cosmo_memory_items;
CREATE POLICY cosmo_memory_items_select_own ON public.cosmo_memory_items
  FOR SELECT TO authenticated USING ((select auth.uid())::text = user_id);
CREATE POLICY cosmo_memory_items_insert_own ON public.cosmo_memory_items
  FOR INSERT TO authenticated WITH CHECK (
    (select auth.uid())::text = user_id
    AND (source_message_id IS NULL OR EXISTS (
      SELECT 1 FROM public.cosmo_messages m
      WHERE m.id = source_message_id AND m.user_id = (select auth.uid())::text
    ))
  );
CREATE POLICY cosmo_memory_items_update_own ON public.cosmo_memory_items
  FOR UPDATE TO authenticated USING ((select auth.uid())::text = user_id)
  WITH CHECK ((select auth.uid())::text = user_id);
CREATE POLICY cosmo_memory_items_delete_own ON public.cosmo_memory_items
  FOR DELETE TO authenticated USING ((select auth.uid())::text = user_id);
