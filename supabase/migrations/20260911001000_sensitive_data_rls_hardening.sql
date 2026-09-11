-- Sensitive-data hardening: clients may read their own state, but cannot mint
-- points, VIP status, badges, notifications, or completion history directly.

-- Reward state is mutated only by SECURITY DEFINER reward RPCs and trusted triggers.
DO $$
BEGIN
  IF to_regclass('public.user_reward_balances') IS NOT NULL THEN
    ALTER TABLE public.user_reward_balances ENABLE ROW LEVEL SECURITY;
    REVOKE INSERT, UPDATE, DELETE ON public.user_reward_balances FROM anon, authenticated;
    GRANT SELECT ON public.user_reward_balances TO authenticated;
  END IF;
  IF to_regclass('public.reward_points_ledger') IS NOT NULL THEN
    ALTER TABLE public.reward_points_ledger ENABLE ROW LEVEL SECURITY;
    REVOKE INSERT, UPDATE, DELETE ON public.reward_points_ledger FROM anon, authenticated;
    GRANT SELECT ON public.reward_points_ledger TO authenticated;
  END IF;
  IF to_regclass('public.user_reward_badges') IS NOT NULL THEN
    ALTER TABLE public.user_reward_badges ENABLE ROW LEVEL SECURITY;
    REVOKE INSERT, UPDATE, DELETE ON public.user_reward_badges FROM anon, authenticated;
    GRANT SELECT ON public.user_reward_badges TO authenticated;
  END IF;
  IF to_regclass('public.daily_gift_claims') IS NOT NULL THEN
    ALTER TABLE public.daily_gift_claims ENABLE ROW LEVEL SECURITY;
    REVOKE INSERT, UPDATE, DELETE ON public.daily_gift_claims FROM anon, authenticated;
    GRANT SELECT ON public.daily_gift_claims TO authenticated;
  END IF;
  IF to_regclass('public.vip_tiers') IS NOT NULL THEN
    ALTER TABLE public.vip_tiers ENABLE ROW LEVEL SECURITY;
    REVOKE INSERT, UPDATE, DELETE ON public.vip_tiers FROM anon, authenticated;
    GRANT SELECT ON public.vip_tiers TO authenticated;
  END IF;
  IF to_regclass('public.reward_challenge_templates') IS NOT NULL THEN
    ALTER TABLE public.reward_challenge_templates ENABLE ROW LEVEL SECURITY;
    REVOKE INSERT, UPDATE, DELETE ON public.reward_challenge_templates FROM anon, authenticated;
    GRANT SELECT ON public.reward_challenge_templates TO authenticated;
  END IF;
END $$;

-- Notifications can be created through create_notification(), which checks the
-- target and admin status. Direct inserts remain limited to own rows/admins.
DO $$
BEGIN
  IF to_regclass('public.notifications') IS NOT NULL THEN
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
    REVOKE DELETE ON public.notifications FROM anon, authenticated;
    DROP POLICY IF EXISTS notifications_update_self ON public.notifications;
    CREATE POLICY notifications_update_self
      ON public.notifications FOR UPDATE TO authenticated
      USING (user_id = auth.uid()::text)
      WITH CHECK (user_id = auth.uid()::text);
  END IF;
  IF to_regclass('public.direct_messages') IS NOT NULL THEN
    ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
    REVOKE UPDATE, DELETE ON public.direct_messages FROM anon;
    DROP POLICY IF EXISTS direct_messages_delete_sender ON public.direct_messages;
    CREATE POLICY direct_messages_delete_sender
      ON public.direct_messages FOR DELETE TO authenticated
      USING (sender_id = auth.uid()::text);
  END IF;
  IF to_regclass('public.completions') IS NOT NULL THEN
    ALTER TABLE public.completions ENABLE ROW LEVEL SECURITY;
    REVOKE DELETE ON public.completions FROM anon, authenticated;
  END IF;
END $$;

-- Existing reward RPCs are the only supported mutation surface. Explicit grants
-- document the contract and prevent accidental public execution.
REVOKE ALL ON FUNCTION public.award_quiz_completion_rewards(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_quiz_completion_rewards(TEXT) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.submit_quiz_attempt(TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
