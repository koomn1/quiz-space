import type { Env } from './platform';
import { generateWithProviderChain, INCEPTION_MODEL, XKIRO_VISION_MODEL, type ProviderMessage } from './providerChain';

export const COSMO_MODELS = [INCEPTION_MODEL, XKIRO_VISION_MODEL];

export class AiServiceError extends Error {
  constructor(message: string, readonly retryable = true) {
    super(message);
    this.name = 'AiServiceError';
  }
}

export async function generateText(
  env: Env,
  messages: ProviderMessage[],
  options: { models?: string[]; timeoutMs?: number } = {},
): Promise<{ text: string; model: string }> {
  const result = await generateWithProviderChain(env, messages, { timeoutMs: options.timeoutMs });
  if (options.models?.length && !options.models.includes(result.model)) {
    throw new AiServiceError(`Configured model ${result.model} is not allowed for this request.`);
  }
  return { text: result.text, model: `${result.provider}/${result.model}` };
}

export function buildCosmoMessages(input: { message: string; history?: Array<{ role?: string; content?: string }>; system?: string }): ProviderMessage[] {
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
