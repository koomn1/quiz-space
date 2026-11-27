import { describe, expect, it } from 'vitest';
import { validateSignUpFields } from './authFormValidation';
import { passwordRequirementMessage } from './passwordPolicy';

describe('validateSignUpFields', () => {
  it('requires a username in both languages', () => {
    expect(validateSignUpFields('  ', 'whatever', 'ar')).toBe('أدخل اسم المستخدم للبدء.');
    expect(validateSignUpFields('', 'whatever', 'en')).toBe('Enter a username to continue.');
  });
  it('requires a strong password', () => {
    expect(validateSignUpFields('sam', 'weak', 'en')).toBe(passwordRequirementMessage('en'));
  });
  it('accepts valid fields', () => {
    expect(validateSignUpFields('sam', 'Str0ng!Passw0rd#2026', 'en')).toBeNull();
  });
});
