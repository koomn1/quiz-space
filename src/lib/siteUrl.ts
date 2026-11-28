/**
 * Canonical site origin. The app now lives on the custom domain
 * quiz-space.live; quiz-space-app.pages.dev stays as the legacy alias.
 */
export const SITE_URL = 'https://www.quiz-space.live';
export const SITE_HOST = 'quiz-space.live';

const PRIMARY_HOSTS = new Set([
  SITE_HOST,
  `www.${SITE_HOST}`,
  'quiz-space-app.pages.dev',
]);

export function isPrimaryAppHost(hostname: string): boolean {
  return PRIMARY_HOSTS.has(hostname.toLowerCase());
}
