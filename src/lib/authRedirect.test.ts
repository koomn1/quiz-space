import { describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false,
  },
}));

import { getAuthRedirectUrl, NATIVE_AUTH_CALLBACK } from './authRedirect';

describe('auth redirect targets', () => {
  it('keeps the public web base path for GitHub Pages', () => {
    expect(getAuthRedirectUrl('https://koomn1.github.io', '/quiz-space/')).toBe(
      'https://koomn1.github.io/quiz-space/',
    );
  });

  it('uses the stable web fallback when no base path is provided', () => {
    expect(getAuthRedirectUrl('http://localhost:5173', '/')).toBe('http://localhost:5173/quiz-space/');
  });

  it('defines a native callback independent of the website URL', () => {
    expect(NATIVE_AUTH_CALLBACK).toBe('com.koomn1.quizspace://auth/callback');
  });
});
