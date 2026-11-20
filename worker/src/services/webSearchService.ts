import type { Env } from '../platform';

export function isWebSearchEnabled(env: Env): boolean {
  return typeof env.TAVILY_API_KEY === 'string' && env.TAVILY_API_KEY.trim().length > 0;
}

export async function searchWebWithTavily(env: Env, query: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
  if (!isWebSearchEnabled(env)) throw new Error('Web search is not configured on the server.');
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: env.TAVILY_API_KEY, query, search_depth: 'advanced', topic: 'general', max_results: 5, include_answer: false, include_raw_content: false }),
  });
  if (!response.ok) throw new Error(`Web search provider failed (${response.status}).`);
  const payload = await response.json() as { results?: Array<{ title?: string; url?: string; content?: string }> };
  return (payload.results || []).slice(0, 5).map(result => ({
    title: String(result.title || 'Untitled source').slice(0, 240),
    url: String(result.url || '').slice(0, 2_000),
    snippet: String(result.content || '').replace(/\s+/g, ' ').slice(0, 900),
  })).filter(result => /^https?:\/\//i.test(result.url));
}
