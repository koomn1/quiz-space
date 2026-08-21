import { Capacitor } from '@capacitor/core';

export const NATIVE_AUTH_CALLBACK = 'com.koomn1.quizspace://auth/callback';

export function getAuthRedirectUrl(origin: string, baseUrl: string): string {
  if (Capacitor.isNativePlatform()) return NATIVE_AUTH_CALLBACK;

  const normalizedBase = baseUrl && baseUrl !== '/'
    ? `/${baseUrl.replace(/^\/+|\/+$/g, '')}/`
    : '/quiz-space/';
  return `${origin}${normalizedBase}`;
}
