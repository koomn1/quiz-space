export function canPersistAuthenticatedData(userId?: string | null): boolean {
  return Boolean(userId && !userId.startsWith('user-'));
}
