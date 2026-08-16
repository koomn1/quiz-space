-- Replace broken/latest frame visuals without deleting reward rows or changing ownership.
-- Only affected frame rows are updated, and every new image_url is unique among active rows.
UPDATE public.reward_store_items SET image_url = 'clean-assets-replacement/nature-leaf-transparent.webp' WHERE id = 'frame_free_1';
UPDATE public.reward_store_items SET image_url = 'clean-assets-replacement/aurora-glass-transparent.webp' WHERE id = 'frame_free_2';
UPDATE public.reward_store_items SET image_url = 'clean-assets-replacement/galaxy-ring-transparent.webp' WHERE id = 'frame_diamond_comet';
UPDATE public.reward_store_items SET image_url = 'clean-assets-replacement/cyber-orbit-transparent.webp' WHERE id = 'frame_diamond_crown';
UPDATE public.reward_store_items SET image_url = 'clean-assets-replacement/ramadan-green-transparent.webp' WHERE id = 'frame_ramadan_lantern';
UPDATE public.reward_store_items SET image_url = 'clean-assets-replacement/school-bus-transparent.webp' WHERE id = 'frame_back_to_school';
UPDATE public.reward_store_items SET image_url = 'clean-assets-replacement/fire-trail-transparent.webp' WHERE id = 'frame_legendary_dragon';
