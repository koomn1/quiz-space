import type { Env } from './platform';

export interface RouteContext {
  request: Request;
  env: Env;
  headers: HeadersInit;
  userId: string;
  authHeader: string;
  startTime: number;
}

export type RouteResult = Response | null;

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

export function routePath(request: Request): string {
  return new URL(request.url).pathname;
}

export function isAuthenticated(userId: string): boolean {
  return userId !== 'guest' && userId !== 'placeholder-user';
}
