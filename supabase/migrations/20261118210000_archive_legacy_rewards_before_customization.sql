-- Archive legacy reward data before the Profile Customization rollout.
-- This migration is intentionally reversible: it keeps all historical rows and
-- never deletes user inventory, orders, ledgers, or the latest free frame catalog.

CREATE TABLE IF NOT EXISTS public.legacy_reward_store_items_archive_20261118
  (LIKE public.reward_store_items INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.legacy_reward_inventory_archive_20261118
  (LIKE public.reward_inventory INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.legacy_reward_store_orders_archive_20261118
  (LIKE public.reward_store_orders INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.legacy_reward_points_ledger_archive_20261118
  (LIKE public.reward_points_ledger INCLUDING ALL);
CREATE TABLE IF NOT EXISTS public.legacy_motivation_usage_archive_20261118
  (LIKE public.motivation_usage_events INCLUDING ALL);

INSERT INTO public.legacy_reward_store_items_archive_20261118
SELECT * FROM public.reward_store_items
ON CONFLICT DO NOTHING;
INSERT INTO public.legacy_reward_inventory_archive_20261118
SELECT * FROM public.reward_inventory
ON CONFLICT DO NOTHING;
INSERT INTO public.legacy_reward_store_orders_archive_20261118
SELECT * FROM public.reward_store_orders
ON CONFLICT DO NOTHING;
INSERT INTO public.legacy_reward_points_ledger_archive_20261118
SELECT * FROM public.reward_points_ledger
ON CONFLICT DO NOTHING;
INSERT INTO public.legacy_motivation_usage_archive_20261118
SELECT * FROM public.motivation_usage_events
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.legacy_reward_store_items_archive_20261118 IS 'Read-only safety archive created before Profile Customization rollout.';
COMMENT ON TABLE public.legacy_reward_inventory_archive_20261118 IS 'Read-only safety archive created before Profile Customization rollout.';
COMMENT ON TABLE public.legacy_reward_store_orders_archive_20261118 IS 'Read-only safety archive of historical purchase requests.';
COMMENT ON TABLE public.legacy_reward_points_ledger_archive_20261118 IS 'Read-only safety archive of historical points transactions.';
COMMENT ON TABLE public.legacy_motivation_usage_archive_20261118 IS 'Read-only safety archive of legacy motivation analytics.';

-- Preserve every free frame added in the latest catalog migrations, and keep
-- subscriber-benefit frames available for the new independent store.
UPDATE public.reward_store_items
SET is_active = false, updated_at = now()
WHERE item_type IN ('frame', 'cosmetic')
  AND id NOT IN (
    'frame_free_1', 'frame_free_2', 'frame_aurora_neon', 'frame_royal_ember',
    'frame_cosmic_pulse', 'frame_cyber_eagle', 'frame_ice_dragon',
    'frame_dual_dragon', 'frame_sea_crown', 'frame_cyber_ice_ring',
    'frame_inferno_spike', 'frame_royal_emerald', 'frame_wolf_guardian',
    'frame_rose_thorn', 'frame_waves_quiz', 'frame_sun_quiz'
  );

-- Existing active selections are intentionally preserved. The database trigger
-- requires ownership verification for any change, so the new UI changes a
-- selection only through the existing secure activation/deactivation RPCs.

REVOKE ALL ON TABLE public.legacy_reward_store_items_archive_20261118 FROM anon, authenticated;
REVOKE ALL ON TABLE public.legacy_reward_inventory_archive_20261118 FROM anon, authenticated;
REVOKE ALL ON TABLE public.legacy_reward_store_orders_archive_20261118 FROM anon, authenticated;
REVOKE ALL ON TABLE public.legacy_reward_points_ledger_archive_20261118 FROM anon, authenticated;
REVOKE ALL ON TABLE public.legacy_motivation_usage_archive_20261118 FROM anon, authenticated;
