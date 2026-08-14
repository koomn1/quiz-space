export function getOnboardingTourStorageKey(userId: string): string {
  return `quiz_onboarding_tour_${userId}`;
}

export function shouldShowOnboardingTour({
  userId,
  isGuestSandbox,
  isStatsLoaded,
  serverOnboarded,
  tourCompletedLocally,
}: {
  userId: string;
  isGuestSandbox: boolean;
  isStatsLoaded: boolean;
  serverOnboarded: boolean | undefined;
  tourCompletedLocally: boolean;
}): boolean {
  if (!userId || isGuestSandbox || !isStatsLoaded) return false;
  if (serverOnboarded !== false) return false;
  return !tourCompletedLocally;
}
