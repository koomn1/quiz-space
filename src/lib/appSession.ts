export const LOCAL_SESSION_KEYS = [
  'quiz_userId',
  'quiz_userName',
  'quiz_isLocalSandbox',
  'local_auth_token',
  'quiz_userEmail',
  'quiz_userPhoto',
] as const;

/** Removes the locally cached identity on sign-out. */
export function clearLocalSession(storage: Pick<Storage, 'removeItem'> = localStorage): void {
  for (const key of LOCAL_SESSION_KEYS) storage.removeItem(key);
}

/** True when any cached classroom was created by this user. Bad storage data counts as false. */
export function ownsCachedClassroom(userId: string, storage: Pick<Storage, 'getItem'> = localStorage): boolean {
  try {
    const stored = storage.getItem('classroom_list');
    if (!stored) return false;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.some((c: any) => c?.createdBy === userId);
  } catch {
    return false;
  }
}
