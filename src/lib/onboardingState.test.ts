import { describe, expect, it } from 'vitest';
import { getOnboardingTourStorageKey, shouldShowOnboardingTour } from './onboardingState';

describe('onboarding tour state', () => {
  it('uses a distinct browser key for each authenticated account', () => {
    expect(getOnboardingTourStorageKey('account-a')).toBe('quiz_onboarding_tour_account-a');
    expect(getOnboardingTourStorageKey('account-b')).toBe('quiz_onboarding_tour_account-b');
  });

  it('does not show the tour before the durable account state has loaded', () => {
    expect(shouldShowOnboardingTour({
      userId: 'account-a', isGuestSandbox: false, isStatsLoaded: false,
      serverOnboarded: undefined, tourCompletedLocally: false,
    })).toBe(false);
  });

  it('does not repeat the tour for an account already marked onboarded on the server', () => {
    expect(shouldShowOnboardingTour({
      userId: 'account-a', isGuestSandbox: false, isStatsLoaded: true,
      serverOnboarded: true, tourCompletedLocally: false,
    })).toBe(false);
  });

  it('shows the tour only for a loaded, non-guest account that has not completed it', () => {
    expect(shouldShowOnboardingTour({
      userId: 'account-a', isGuestSandbox: false, isStatsLoaded: true,
      serverOnboarded: false, tourCompletedLocally: false,
    })).toBe(true);
  });
});
