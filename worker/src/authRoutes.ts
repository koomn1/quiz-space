import { getAccountProfile } from './auth';
import { json, isAuthenticated, type RouteContext, type RouteResult, routePath } from './routes';

export async function handleAuthRoutes(context: RouteContext): Promise<RouteResult> {
  const path = routePath(context.request);
  if (path !== '/api/auth/session' && path !== '/api/auth/health') return null;

  if (context.request.method !== 'GET') return json({ error: 'Method not allowed' }, 405, context.headers);
  if (path === '/api/auth/health') {
    return json({ ok: true, authenticated: isAuthenticated(context.userId) }, 200, context.headers);
  }

  if (!isAuthenticated(context.userId)) {
    return json({ authenticated: false, userId: null, profile: null }, 200, context.headers);
  }
  const profile = await getAccountProfile(context.request, context.env, context.userId);
  return json({ authenticated: true, userId: context.userId, profile }, 200, context.headers);
}
