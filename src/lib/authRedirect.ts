export function getAuthRedirectUrl(origin: string, baseUrl: string): string {
  const normalizedOrigin = origin.replace(/\/$/, '');
  const isGithubPages = /(^|\.)github\.io$/i.test(new URL(normalizedOrigin).hostname);
  const normalizedBase = baseUrl && baseUrl !== '/'
    ? `/${baseUrl.replace(/^\/+|\/+$/g, '')}/`
    : isGithubPages ? '/quiz-space/' : '/';
  return `${normalizedOrigin}${normalizedBase}`;
}
