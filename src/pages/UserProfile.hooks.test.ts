import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const userProfileSource = readFileSync(new URL('./UserProfile.tsx', import.meta.url), 'utf8');

describe('UserProfile hook ordering', () => {
  it('declares the profile image fallback callback before the loading early return', () => {
    const fallbackHookIndex = userProfileSource.indexOf('const handleProfileImageError = React.useCallback');
    const loadingGuardIndex = userProfileSource.indexOf('if (isLoading) {');

    expect(fallbackHookIndex).toBeGreaterThan(-1);
    expect(loadingGuardIndex).toBeGreaterThan(-1);
    expect(fallbackHookIndex).toBeLessThan(loadingGuardIndex);
  });
});
