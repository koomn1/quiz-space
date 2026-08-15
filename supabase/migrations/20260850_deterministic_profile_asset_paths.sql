-- Point reward-store frame records at the audited transparent WebP assets.
-- IDs remain stable so existing ownership and active-frame selections continue to work.

UPDATE public.reward_store_items
SET image_url = 'clean-assets-deterministic/frame-diamond-comet-quizspace-transparent.webp', updated_at = now()
WHERE id = 'frame_diamond_comet';

UPDATE public.reward_store_items
SET image_url = 'clean-assets-deterministic/frame-diamond-crown-quizspace-transparent.webp', updated_at = now()
WHERE id = 'frame_diamond_crown';

UPDATE public.reward_store_items
SET image_url = 'clean-assets-deterministic/frame-ramadan-lantern-quizspace-transparent.webp', updated_at = now()
WHERE id = 'frame_ramadan_lantern';

UPDATE public.reward_store_items
SET image_url = 'clean-assets-deterministic/frame-back-to-school-quizspace-transparent.webp', updated_at = now()
WHERE id = 'frame_back_to_school';
