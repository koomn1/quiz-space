-- 1) Fix: "invalid input syntax for type uuid: default-verified-ai".
-- verification_badges had RLS policies but no table privileges for the API
-- roles (revoked by the earlier security-hardening migrations), so every
-- client SELECT failed with "permission denied" and the UI fell back to
-- non-UUID placeholder ids. RLS still restricts writes to admins.
GRANT SELECT ON public.verification_badges TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.verification_badges TO authenticated;

-- 2) Only the purple check ('premium') survives from the old tier badges;
-- everything else is now an image badge from verification_badges.
-- Paid users who had a removed tier keep a mark (purple check), the rest get none.
UPDATE public.users
SET badge_tier = 'premium',
    badge_color = 'purple'
WHERE badge_tier NOT IN ('none', 'premium')
  AND is_premium = TRUE;

UPDATE public.users
SET badge_tier = 'none'
WHERE badge_tier NOT IN ('none', 'premium');

-- 3) A user shows one mark at a time (Telegram style): purple check OR an image badge.
UPDATE public.users
SET active_verification_badge_id = NULL
WHERE badge_tier = 'premium'
  AND active_verification_badge_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
