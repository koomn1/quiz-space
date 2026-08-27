import { Capacitor } from '@capacitor/core';

export function getAuthRedirectUrl(origin: string, baseUrl: string): string {
  if (Capacitor.isNativePlatform()) return 'https://quiz-space-app.pages.dev/?quizspace_native_callback=1';

  const normalizedOrigin = origin.replace(/\/$/, '');
  const hostname = new URL(normalizedOrigin).hostname.toLowerCase();
  const isGithubPages = /(^|\.)github\.io$/i.test(hostname);
  const isPrimaryPagesDeployment = hostname === 'quiz-space-app.pages.dev';
  const normalizedBase = isPrimaryPagesDeployment
    ? '/'
    : baseUrl && baseUrl !== '/'
      ? `/${baseUrl.replace(/^\/+|\/+$/g, '')}/`
      : isGithubPages ? '/quiz-space/' : '/';
  return `${normalizedOrigin}${normalizedBase}`;
}
