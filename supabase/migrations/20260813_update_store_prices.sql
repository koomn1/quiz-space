-- Update store prices and item details for better economy
-- Normal frames: cost points
-- Diamond frames: free but gated by membership
-- Points bundles: cost EGP (money)

UPDATE public.reward_store_items SET price_points = 500, price_coins = 0, price_egp = 0 WHERE id = 'frame_neon_orbit';
UPDATE public.reward_store_items SET price_points = 1000, price_coins = 0, price_egp = 0 WHERE id = 'frame_aurora';
UPDATE public.reward_store_items SET price_points = 2000, price_coins = 0, price_egp = 0 WHERE id = 'frame_fire';
UPDATE public.reward_store_items SET price_points = 3500, price_coins = 0, price_egp = 0 WHERE id = 'frame_crystal_luxe';
UPDATE public.reward_store_items SET price_points = 5000, price_coins = 0, price_egp = 0 WHERE id = 'frame_star_crown';

-- Diamond exclusive frames (Keep price 0 but min_plan gates them)
UPDATE public.reward_store_items SET price_points = 0, price_coins = 0, price_egp = 0, min_plan = 'diamond' WHERE id IN ('frame_diamond_comet', 'frame_diamond_crown');

-- Points bundles (Cost EGP, give reward_points)
UPDATE public.reward_store_items SET price_points = 0, price_coins = 0, price_egp = 25, reward_points = 500 WHERE id = 'points_100';
UPDATE public.reward_store_items SET price_points = 0, price_coins = 0, price_egp = 60, reward_points = 1500 WHERE id = 'points_300';
UPDATE public.reward_store_items SET price_points = 0, price_coins = 0, price_egp = 150, reward_points = 4000 WHERE id = 'points_800';
UPDATE public.reward_store_items SET price_points = 0, price_coins = 0, price_egp = 350, reward_points = 10000 WHERE id = 'points_2000';

-- Ensure all bundles have correct names for new values
UPDATE public.reward_store_items SET name = '500 Points', name_ar = '500 نقطة' WHERE id = 'points_100';
UPDATE public.reward_store_items SET name = '1,500 Points', name_ar = '1500 نقطة' WHERE id = 'points_300';
UPDATE public.reward_store_items SET name = '4,000 Points', name_ar = '4000 نقطة' WHERE id = 'points_800';
UPDATE public.reward_store_items SET name = '10,000 Points', name_ar = '10000 نقطة' WHERE id = 'points_2000';
