-- Seed the canonical monthly plans used by BillingSection.
-- Values are sourced from src/components/BillingSection.tsx, not client input.
INSERT INTO public.subscription_plans (
  id, name, name_ar, price, currency, duration_months,
  features, priority_level, is_lifetime, is_active
)
VALUES
  ('silver', 'Silver Scholar', 'الباقة الفضية', 150, 'EGP', 1, ARRAY[]::TEXT[], 1, FALSE, TRUE),
  ('gold', 'Educator Gold', 'الباقة الذهبية للمعلمين', 300, 'EGP', 1, ARRAY[]::TEXT[], 2, FALSE, TRUE),
  ('diamond', 'Diamond Elite VIP', 'الباقة الماسية للمؤسسات', 1500, 'EGP', 1, ARRAY[]::TEXT[], 3, FALSE, TRUE)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    name_ar = EXCLUDED.name_ar,
    price = EXCLUDED.price,
    currency = EXCLUDED.currency,
    duration_months = EXCLUDED.duration_months,
    is_lifetime = FALSE,
    is_active = TRUE;

NOTIFY pgrst, 'reload schema';
