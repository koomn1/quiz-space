import type { Env } from './platform';

export const COSMO_MODELS = [
  'nvidia/nemotron-3.5-lightning:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'z-ai/glm-5.2:free',
];

export class AiServiceError extends Error {
  constructor(message: string, readonly retryable = true) {
    super(message);
    this.name = 'AiServiceError';
  }
}

function timeoutSignal(timeoutMs: number): { signal: AbortSignal; dispose: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, dispose: () => clearTimeout(timer) };
}

export async function generateText(env: Env, messages: Array<{ role: string; content: unknown }>, options: { models?: string[]; timeoutMs?: number } = {}): Promise<{ text: string; model: string }> {
  const models = options.models?.length ? options.models : COSMO_MODELS;
  let lastError = 'No AI model accepted the request.';
  for (const model of models) {
    const timeout = timeoutSignal(options.timeoutMs || 15_000);
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: timeout.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://quizspace.app',
          'X-Title': 'QuizSpace',
        },
        body: JSON.stringify({ model, messages, temperature: 0.2 }),
      });
      if (!response.ok) {
        lastError = `AI provider returned ${response.status}`;
        continue;
      }
      const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
      const raw = payload.choices?.[0]?.message?.content;
      const text = typeof raw === 'string' ? raw.trim() : Array.isArray(raw) ? raw.map(String).join('').trim() : '';
      if (!text) {
        lastError = 'AI provider returned an empty response.';
        continue;
      }
      return { text, model };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    } finally {
      timeout.dispose();
    }
  }
  throw new AiServiceError(lastError);
}

export function buildCosmoMessages(input: { message: string; history?: Array<{ role?: string; content?: string }>; system?: string }): Array<{ role: string; content: string }> {
  const history = (input.history || []).slice(-12).flatMap(item => {
    const role = item.role === 'assistant' ? 'assistant' : item.role === 'user' ? 'user' : null;
    const content = typeof item.content === 'string' ? item.content.trim().slice(0, 4_000) : '';
    return role && content ? [{ role, content }] : [];
  });
  return [
    { role: 'system', content: input.system || 'You are Cosmo AI, a concise and helpful educational assistant. Reply in the user language. Do not claim to change account permissions or access private data.' },
    ...history,
    { role: 'user', content: input.message.trim().slice(0, 8_000) },
  ];
}
