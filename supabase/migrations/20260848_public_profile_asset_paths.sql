-- QuizSpace is served from GitHub Pages. Store frame assets must therefore resolve through the project base path.

UPDATE public.reward_store_items
SET image_url = 'images/frame-diamond-comet-quizspace.webp', updated_at = now()
WHERE id = 'frame_diamond_comet';

UPDATE public.reward_store_items
SET image_url = 'images/frame-diamond-crown-quizspace.webp', updated_at = now()
WHERE id = 'frame_diamond_crown';

UPDATE public.reward_store_items
SET image_url = 'images/frame-ramadan-lantern-quizspace.webp', updated_at = now()
WHERE id = 'frame_ramadan_lantern';

UPDATE public.reward_store_items
SET image_url = 'images/frame-back-to-school-quizspace.webp', updated_at = now()
WHERE id = 'frame_back_to_school';
