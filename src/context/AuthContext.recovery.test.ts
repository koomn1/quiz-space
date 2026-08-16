import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./AuthContext.tsx', import.meta.url), 'utf8');

describe('Quiz Space password recovery auth contract', () => {
  it('uses Supabase recovery APIs with the shared safe redirect', () => {
    expect(source).toContain('resetPasswordForEmail(cleanEmail, { redirectTo })');
    expect(source).toContain('getAuthRedirectUrl(window.location.origin, import.meta.env.BASE_URL || \'/\')');
    expect(source).toContain('updateUser({ password })');
    expect(source).toContain("setPasswordRecovery(true)");
    expect(source).toContain("event === 'PASSWORD_RECOVERY'");
  });

  it('does not reveal whether a submitted email belongs to an account', () => {
    expect(source).toContain('تعذر إرسال رابط الاستعادة حالياً. حاول مرة أخرى بعد قليل.');
  });
});
