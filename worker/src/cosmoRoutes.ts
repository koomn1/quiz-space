import { getCosmoAccountContext } from './auth';
import { buildCosmoMessages, generateText } from './aiService';
import { json, type RouteContext, type RouteResult, routePath } from './routes';

export async function handleCosmoRoutes(context: RouteContext): Promise<RouteResult> {
  const path = routePath(context.request);
  if (path !== '/api/ai/cosmo') return null;
  if (context.request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, context.headers);

  const body = await context.request.json() as { message?: unknown; history?: unknown; systemInstruction?: unknown };
  if (typeof body.message !== 'string' || !body.message.trim() || body.message.length > 8_000) {
    return json({ error: 'Invalid Cosmo request' }, 400, context.headers);
  }
  const history = Array.isArray(body.history) ? body.history as Array<{ role?: string; content?: string }> : [];
  const accountContext = await getCosmoAccountContext(context.request, context.env, context.userId);
  const system = `${typeof body.systemInstruction === 'string' ? body.systemInstruction.slice(0, 2_000) : ''}\nVerified account context: ${accountContext}\nNever expose private data or modify roles, plans, points, or permissions.`;
  const result = await generateText(context.env, buildCosmoMessages({ message: body.message, history, system }));
  return json({ text: result.text, model: result.model }, 200, context.headers);
}
