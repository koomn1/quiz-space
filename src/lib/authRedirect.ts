export function getAuthRedirectUrl(origin: string, baseUrl: string): string {
  const normalizedBase = baseUrl && baseUrl !== '/'
    ? `/${baseUrl.replace(/^\/+|\/+$/g, '')}/`
    : '/quiz-space/';
  return `${origin}${normalizedBase}`;
}
