-- Update existing frames with image URLs
UPDATE public.reward_store_items SET image_url = 'images/frame-neon-orbit.webp' WHERE id = 'frame_neon_orbit';
UPDATE public.reward_store_items SET image_url = 'images/frame-aurora.webp' WHERE id = 'frame_aurora';
UPDATE public.reward_store_items SET image_url = 'images/frame-fire.webp' WHERE id = 'frame_fire';
UPDATE public.reward_store_items SET image_url = 'images/frame-crystal-luxe.webp' WHERE id = 'frame_crystal_luxe';
UPDATE public.reward_store_items SET image_url = 'images/frame-star-crown.webp' WHERE id = 'frame_star_crown';
UPDATE public.reward_store_items SET image_url = 'images/frame-star-crown.webp' WHERE id = 'frame_diamond_comet'; -- Use star crown for comet as placeholder
UPDATE public.reward_store_items SET image_url = 'images/frame-star-crown.webp' WHERE id = 'frame_diamond_crown'; -- Use star crown for crown as placeholder

-- Add Matrix frame
INSERT INTO public.reward_store_items (id, item_type, name, name_ar, description, description_ar, price_points, price_egp, reward_points, image_url, css_class, min_plan, sort_order)
VALUES ('frame_matrix', 'frame', 'Matrix Code', 'كود الماتريكس', 'A digital falling code frame for techies.', 'إطار الأكواد الرقمية المتساقطة لمحبي التقنية.', 1500, 0, 0, 'images/frame-matrix-green.webp', 'frame-matrix', 'free', 35)
ON CONFLICT (id) DO UPDATE SET image_url = EXCLUDED.image_url, css_class = EXCLUDED.css_class;
