-- Update reward store item assets with zero duplication and unique high quality styles
UPDATE public.reward_store_items SET image_url = 'images/frame-neon-orbit.webp' WHERE id = 'frame_neon_orbit';
UPDATE public.reward_store_items SET image_url = 'images/frame-aurora.webp' WHERE id = 'frame_aurora';
UPDATE public.reward_store_items SET image_url = 'images/frame-fire.webp' WHERE id = 'frame_fire';
UPDATE public.reward_store_items SET image_url = 'images/frame-crystal-luxe.webp' WHERE id = 'frame_crystal_luxe';
UPDATE public.reward_store_items SET image_url = 'images/frame-star-crown.webp' WHERE id = 'frame_star_crown';
UPDATE public.reward_store_items SET image_url = 'images/frame-diamond-comet.webp' WHERE id = 'frame_diamond_comet';
UPDATE public.reward_store_items SET image_url = 'images/frame-diamond-crown.webp' WHERE id = 'frame_diamond_crown';

-- Add Matrix frame & seasonal frames
INSERT INTO public.reward_store_items (id, item_type, name, name_ar, description, description_ar, price_points, price_egp, reward_points, image_url, css_class, min_plan, sort_order)
VALUES 
  ('frame_matrix', 'frame', 'Matrix Code', 'كود الماتريكس', 'A digital falling code frame for techies.', 'إطار الأكواد الرقمية المتساقطة لمحبي التقنية.', 1500, 0, 0, 'images/frame-matrix-green.webp', 'frame-matrix', 'free', 35),
  ('frame_ramadan_lantern', 'frame', 'Ramadan Crescent', 'هلال رمضان', 'Special seasonal festive crescent frame.', 'إطار الهلال الرمضاني المميز.', 1200, 0, 0, 'images/frame-ramadan-crescent.webp', 'frame-ramadan', 'free', 45),
  ('frame_back_to_school', 'frame', 'Back to School', 'العودة للمدارس', 'Special back-to-school academic frame.', 'إطار العودة للمدارس والكتب الدراسية.', 1000, 0, 0, 'images/frame-back-school.webp', 'frame-school', 'free', 55)
ON CONFLICT (id) DO UPDATE SET image_url = EXCLUDED.image_url, css_class = EXCLUDED.css_class, description_ar = EXCLUDED.description_ar;
