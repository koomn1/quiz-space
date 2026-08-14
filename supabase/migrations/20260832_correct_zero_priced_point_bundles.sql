-- The two point bundles were visible as 0 EGP and awarded zero points.
-- Keep payment-only bundles cash-priced and make their rewards explicit.
UPDATE public.reward_store_items
SET
  price_egp = 25.00,
  price_coins = 0,
  reward_points = 500,
  updated_at = now()
WHERE id = 'bundle_small';

UPDATE public.reward_store_items
SET
  price_egp = 120.00,
  price_coins = 0,
  reward_points = 2500,
  updated_at = now()
WHERE id = 'bundle_large';
