import { describe, expect, it } from 'vitest';
import { getAuthRedirectUrl } from './authRedirect';

describe('Google OAuth redirect URL', () => {
  it('keeps GitHub Pages OAuth callbacks inside the QuizSpace base path', () => {
    expect(getAuthRedirectUrl('https://koomn1.github.io', '/quiz-space/')).toBe('https://koomn1.github.io/quiz-space/');
  });

  it('uses the QuizSpace path when a development base path is unavailable', () => {
    expect(getAuthRedirectUrl('http://localhost:5173', '/')).toBe('http://localhost:5173/quiz-space/');
  });
});
