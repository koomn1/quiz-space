import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('profile progression and reward-plan security', () => {
  const profileMigration = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/20261110212634_protect_user_progression_and_identity.sql'),
    'utf8',
  );
  const rewardMigration = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/20261110212714_harden_reward_purchase_plan_authority.sql'),
    'utf8',
  );
  const trustedSubscriptionMigration = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/20261110212740_allow_trusted_subscription_writes.sql'),
    'utf8',
  );
  const progressionMigration = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/20261110213904_allow_trusted_progression_updates.sql'),
    'utf8',
  );

  it('protects XP, level, auth email, and entitlements on direct profile writes', () => {
    expect(profileMigration).toContain('BEFORE INSERT OR UPDATE ON public.users');
    expect(profileMigration).toContain('NEW.xp := OLD.xp');
    expect(profileMigration).toContain('NEW.level := OLD.level');
    expect(profileMigration).toContain('NEW.email := OLD.email');
    expect(profileMigration).toContain("NEW.xp := 0");
    expect(profileMigration).toContain("NEW.level := 1");
    expect(profileMigration).toContain('NEW.plan_id := NULL');
    expect(profileMigration).toContain('NEW.is_admin := FALSE');
  });

  it('allows only trusted subscription workflows to change membership fields', () => {
    expect(trustedSubscriptionMigration).toContain("current_setting('app.allow_subscription_update',TRUE)");
    expect(trustedSubscriptionMigration).toContain('IF NOT v_subscription_update_allowed THEN');
    expect(trustedSubscriptionMigration).toContain('NEW.renewal_date := OLD.renewal_date');
    expect(trustedSubscriptionMigration).toContain('NEW.xp := OLD.xp');
    expect(trustedSubscriptionMigration).toContain('NEW.email := OLD.email');
  });

  it('allows XP changes only inside trusted progression RPCs and disables unused escalation RPCs', () => {
    expect(progressionMigration).toContain("current_setting('app.allow_progression_update',TRUE)");
    expect(progressionMigration).toContain("set_config('app.allow_progression_update', 'on', true)");
    expect(progressionMigration).toContain('REVOKE ALL ON FUNCTION public.process_exam_completion_reward');
    expect(progressionMigration).toContain('REVOKE ALL ON FUNCTION public.rebuild_user_xp_from_completions');
    expect(progressionMigration).toContain("set_config('app.allow_progression_update', 'off', true)");
  });

  it('uses effective membership and canonical plan id for reward-store access', () => {
    expect(rewardMigration).toContain('public.effective_membership_active');
    expect(rewardMigration).toContain("v_user.plan_id IN ('silver','gold','diamond')");
    expect(rewardMigration).toContain("v_effective_plan_name := 'Free'");
    expect(rewardMigration).toContain('public.reward_plan_rank(v_effective_plan_name)');
    expect(rewardMigration).not.toContain('public.reward_plan_rank(v_user.plan_name)');
  });
});
