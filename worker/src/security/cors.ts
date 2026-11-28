import type { Env } from '../platform';

export function allowedOrigins(env: Env): string[] {
  const configured = String(env.ALLOWED_ORIGIN || '')
    .split(',')
    .map(value => value.trim().replace(/\/$/, ''))
    .filter(value => value && !/(^|\.)github\.io(?:\/|$)/i.test(value));
  return [...new Set([...configured, 'https://quiz-space.live', 'https://www.quiz-space.live', 'https://quiz-space-app.pages.dev'])];
}

export function isAllowedOrigin(request: Request, env: Env): boolean {
  const origin = request.headers.get('Origin') || '';
  return !origin || allowedOrigins(env).includes(origin.replace(/\/$/, ''));
}

export function cors(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get('Origin') || '';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  };
  if (origin && isAllowedOrigin(request, env)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}
