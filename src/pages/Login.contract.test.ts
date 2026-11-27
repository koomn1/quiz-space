import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./Login.tsx', import.meta.url), 'utf8');

describe('Login page auth contract', () => {
  it('uses the shared AuthContext Google sign-in (native + web) instead of its own OAuth call', () => {
    expect(source).toContain('signInWithGoogle()');
    expect(source).not.toContain('signInWithOAuth');
  });
  it('uses the shared sign-up validation', () => {
    expect(source).toContain('validateSignUpFields(');
  });
  it('keeps sign-in, sign-up, MFA and email verification actions', () => {
    expect(source).toContain('signIn(');
    expect(source).toContain('signUp(');
    expect(source).toContain('verifyMfaCode(');
    expect(source).toContain("setAuthStep('email')");
    expect(source).toContain('EMAIL_NOT_CONFIRMED');
  });
});
