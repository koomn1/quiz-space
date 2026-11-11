-- Seed the canonical monthly plans used by BillingSection.
-- Names, prices, durations, and feature labels are sourced from
-- src/components/BillingSection.tsx. Priority 1 is reserved for Free.
INSERT INTO public.subscription_plans (
  id, name, name_ar, price, currency, duration_months,
  features, priority_level, is_lifetime, is_active
)
VALUES
  (
    'silver', 'Silver Scholar', 'الباقة الفضية', 150, 'EGP', 1,
    ARRAY['Cosmo AI assistant', '15 AI quizzes monthly', 'Detailed PDF reports']::TEXT[],
    2, FALSE, TRUE
  ),
  (
    'gold', 'Educator Gold', 'الباقة الذهبية للمعلمين', 300, 'EGP', 1,
    ARRAY['Unlimited AI quiz generation', 'Class leaderboards', 'Detailed classroom reports']::TEXT[],
    3, FALSE, TRUE
  ),
  (
    'diamond', 'Diamond Elite VIP', 'الباقة الماسية للمؤسسات', 1500, 'EGP', 1,
    ARRAY['Institution and multi-teacher access', 'Excel and PDF exports', 'Advanced learning analytics']::TEXT[],
    4, FALSE, TRUE
  )
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    name_ar = EXCLUDED.name_ar,
    price = EXCLUDED.price,
    currency = EXCLUDED.currency,
    duration_months = EXCLUDED.duration_months,
    features = EXCLUDED.features,
    priority_level = EXCLUDED.priority_level,
    is_lifetime = FALSE,
    is_active = TRUE;

NOTIFY pgrst, 'reload schema';
