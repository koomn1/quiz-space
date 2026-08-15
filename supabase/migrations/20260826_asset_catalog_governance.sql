-- Asset Catalog Governance & Uniqueness Enforcement
-- Ensures that active profile frame assets cannot have duplicate image URLs across different catalog items.

BEGIN;

-- 1. Remove duplicate active items if any exist, keeping the lowest sort order or id
DELETE FROM public.reward_store_items a
USING public.reward_store_items b
WHERE a.item_type = 'frame'
  AND b.item_type = 'frame'
  AND a.image_url = b.image_url
  AND a.id <> b.id
  AND a.sort_order > b.sort_order;

-- 2. Add partial unique index to protect against duplicate standalone frame image paths
CREATE UNIQUE INDEX IF NOT EXISTS reward_store_items_frame_image_url_idx
ON public.reward_store_items (image_url)
WHERE item_type = 'frame' AND is_active = true AND id NOT LIKE 'offer_%';

COMMIT;
