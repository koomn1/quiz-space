import { describe, expect, it } from 'vitest';
import { getAuthRedirectUrl } from './authRedirect';

describe('auth redirect targets', () => {
  it('keeps the public web base path for GitHub Pages', () => {
    expect(getAuthRedirectUrl('https://koomn1.github.io', '/quiz-space/')).toBe(
      'https://koomn1.github.io/quiz-space/',
    );
  });

  it('always uses the primary pages.dev root even when a legacy base is passed', () => {
    expect(getAuthRedirectUrl('https://quiz-space-app.pages.dev', '/quiz-space/')).toBe('https://quiz-space-app.pages.dev/');
    expect(getAuthRedirectUrl('https://quiz-space-app.pages.dev/', '/quiz-space/')).toBe('https://quiz-space-app.pages.dev/');
  });

  it('uses the domain root when no base path is provided outside GitHub Pages', () => {
    expect(getAuthRedirectUrl('http://localhost:5173', '/')).toBe('http://localhost:5173/');
  });
});
