-- Asset catalog governance: preserve existing catalog rows and prevent duplicate active standalone frame artwork.
-- This migration intentionally contains no DELETE statement; historical reward-store items must remain auditable.

CREATE UNIQUE INDEX IF NOT EXISTS reward_store_active_frame_image_unique
  ON public.reward_store_items (image_url)
  WHERE item_type = 'frame'
    AND id <> 'offer_vip_combo'
    AND is_active = true
    AND image_url IS NOT NULL;
