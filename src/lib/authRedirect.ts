import { isPrimaryAppHost } from './siteUrl';

export function getAuthRedirectUrl(origin: string, baseUrl: string): string {
  const normalizedOrigin = origin.replace(/\/$/, '');
  const hostname = new URL(normalizedOrigin).hostname.toLowerCase();
  const isGithubPages = /(^|\.)github\.io$/i.test(hostname);
  const isPrimaryPagesDeployment = isPrimaryAppHost(hostname);
  const normalizedBase = isPrimaryPagesDeployment
    ? '/'
    : baseUrl && baseUrl !== '/'
      ? `/${baseUrl.replace(/^\/+|\/+$/g, '')}/`
      : isGithubPages ? '/quiz-space/' : '/';
  return `${normalizedOrigin}${normalizedBase}`;
}
