export const PASSWORD_MIN_LENGTH = 10;

export type PasswordRule = 'length' | 'lowercase' | 'uppercase' | 'number';

export function getPasswordRuleFailures(password: string): PasswordRule[] {
  const failures: PasswordRule[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) failures.push('length');
  if (!/[a-z]/.test(password)) failures.push('lowercase');
  if (!/[A-Z]/.test(password)) failures.push('uppercase');
  if (!/\d/.test(password)) failures.push('number');
  return failures;
}

export function isStrongPassword(password: string): boolean {
  return getPasswordRuleFailures(password).length === 0;
}

export function passwordRequirementMessage(lang: 'ar' | 'en' = 'ar'): string {
  return lang === 'ar'
    ? 'استخدم 10 أحرف على الأقل، مع حرف صغير وحرف كبير ورقم واحد.'
    : 'Use at least 10 characters, including lowercase, uppercase, and a number.';
}
