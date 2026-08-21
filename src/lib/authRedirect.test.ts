import { describe, expect, it } from 'vitest';
import { getAuthRedirectUrl } from './authRedirect';

describe('auth redirect targets', () => {
  it('keeps the public web base path for GitHub Pages', () => {
    expect(getAuthRedirectUrl('https://koomn1.github.io', '/quiz-space/')).toBe(
      'https://koomn1.github.io/quiz-space/',
    );
  });

  it('uses the stable web fallback when no base path is provided', () => {
    expect(getAuthRedirectUrl('http://localhost:5173', '/')).toBe('http://localhost:5173/quiz-space/');
  });
});
