import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./AuthModal.tsx', import.meta.url), 'utf8');

describe('Quiz Space AuthModal UI contract', () => {
  it('keeps the authenticated dialog semantics and accessible form labels', () => {
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain('aria-labelledby="auth-dialog-title"');
    expect(source).toContain('id="auth-email"');
    expect(source).toContain('id="auth-password"');
    expect(source).toContain('id="auth-mfa-code"');
    expect(source).toContain('aria-live="assertive"');
  });

  it('keeps all supported authentication actions visible in the contract', () => {
    expect(source).toContain('signIn(');
    expect(source).toContain('signInWithGoogle()');
    expect(source).toContain('signUp(');
    expect(source).toContain('verifyMfaCode(');
    expect(source).toContain('setStep(\'email\')');
    expect(source).toContain('setStep(\'2fa\')');
    expect(source).toContain('المتابعة باستخدام Google');
    expect(source).toContain('لديك حساب بالفعل؟ سجّل دخولك');
  });

  it('keeps reduced-motion and keyboard-friendly interaction affordances', () => {
    expect(source).toContain('motion-safe:');
    expect(source).toContain('focus-visible:ring');
    expect(source).toContain('min-h-12');
    expect(source).toContain('h-11 w-11');
    expect(source).toContain("event.key === 'Escape'");
  });
});
