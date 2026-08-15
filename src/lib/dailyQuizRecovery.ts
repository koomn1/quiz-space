export type DailyQuizRecoverySlot = {
  refreshing?: boolean;
  quizPayload?: { id?: string | null } | null;
  refreshedAt?: string | null;
};

/**
 * A refresh with no payload and no generation timestamp cannot be actively
 * producing a quiz. It is safe to reclaim through the identity-bound RPC.
 */
export function shouldRecoverStalledDailyQuizRefresh(slot: DailyQuizRecoverySlot | null | undefined): boolean {
  return Boolean(slot?.refreshing && !slot?.quizPayload?.id && !slot?.refreshedAt);
}
