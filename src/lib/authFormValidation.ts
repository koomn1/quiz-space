import { isStrongPassword, passwordRequirementMessage } from './passwordPolicy';

/**
 * Shared sign-up field checks used by the Login page and the AuthModal.
 * Returns an error message to show, or null when the fields are valid.
 */
export function validateSignUpFields(
  username: string,
  password: string,
  lang: 'ar' | 'en' = 'ar',
): string | null {
  if (!username.trim()) {
    return lang === 'ar' ? 'أدخل اسم المستخدم للبدء.' : 'Enter a username to continue.';
  }
  if (!isStrongPassword(password)) {
    return passwordRequirementMessage(lang);
  }
  return null;
}
