import type { Env } from '../platform';
import { generateWithProviderChain } from '../providerChain';
import { balancedJsonCandidates, extractJson } from './aiJsonParser';
import { AiProviderError } from './aiLogger';

export const ANSWER_REVIEW_MODEL_TIMEOUT_MS = 30_000;

export interface AiRequestOptions {
  max_tokens?: number;
  temperature?: number;
  timeoutMs?: number;
  reasoning_effort?: 'low' | 'medium' | 'high';
  response_format?: { type: 'json_object' };
  expectedAnswerCount?: number;
  allowPartial?: boolean;
}

export type AnswerReviewResult = { text: string; model: string };

export function validateAnswerReviewResponse(
  text: string,
  expectedAnswerCount: number,
  model?: string,
  options: { allowPartial?: boolean } = {},
): string {
  if (!Number.isInteger(expectedAnswerCount) || expectedAnswerCount < 1 || expectedAnswerCount > 8) {
    throw new AiProviderError('invalid_response', 'answer-review-contract', model);
  }
  const cleaned = String(text || '').trim();
  const candidates = [cleaned, ...balancedJsonCandidates(cleaned)].filter(
    (value, index, all) => Boolean(value) && all.indexOf(value) === index,
  );
  let record: Record<string, unknown> | null = null;
  for (const candidate of candidates) {
    try {
      const parsed = extractJson(candidate);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const possibleRecord = parsed as Record<string, unknown>;
        if (Array.isArray(possibleRecord.answers)) {
          record = possibleRecord;
          break;
        }
      }
    } catch {
      // Try the next balanced candidate; reasoning text may contain JSON-like fragments.
    }
  }
  const answers = record && Array.isArray(record.answers) ? record.answers : null;
  const allowPartial = options.allowPartial === true;
  if (!answers || answers.length < 1 || answers.length > expectedAnswerCount || (!allowPartial && answers.length !== expectedAnswerCount)) {
    throw new AiProviderError('invalid_response', 'answer-review-contract', model);
  }
  const indexes = new Set<number>();
  for (const answer of answers) {
    if (!answer || typeof answer !== 'object' || Array.isArray(answer)) {
      throw new AiProviderError('invalid_response', 'answer-review-contract', model);
    }
    const item = answer as Record<string, unknown>;
    if (
      !Number.isInteger(item.questionIndex) ||
      (item.questionIndex as number) < 1 ||
      (item.questionIndex as number) > expectedAnswerCount ||
      indexes.has(item.questionIndex as number)
    ) {
      throw new AiProviderError('invalid_response', 'answer-review-contract', model);
    }
    if (!Number.isInteger(item.correctIndex) || (item.correctIndex as number) < 0 || (item.correctIndex as number) > 9) {
      throw new AiProviderError('invalid_response', 'answer-review-contract', model);
    }
    indexes.add(item.questionIndex as number);
  }
  return text;
}

export async function callAiWithFallback(
  env: Env,
  messages: any[],
  _models: string[] = [],
  _plugins?: any[],
  options: AiRequestOptions = {},
): Promise<string> {
  const { expectedAnswerCount, allowPartial, ...providerOptions } = options;
  const result = await generateWithProviderChain(env, messages, {
    ...providerOptions,
    ...(expectedAnswerCount
      ? {
          validateResponse: (text, _provider, model) => {
            validateAnswerReviewResponse(text, expectedAnswerCount, model, { allowPartial });
          },
        }
      : {}),
  });
  return result.text;
}

export async function callAiWithParallelAnswerReviewFallback(
  env: Env,
  messages: any[],
  _models: string[],
  options: AiRequestOptions,
): Promise<AnswerReviewResult> {
  const expectedAnswerCount = options.expectedAnswerCount || 1;
  const result = await generateWithProviderChain(env, messages, {
    max_tokens: options.max_tokens,
    temperature: options.temperature,
    timeoutMs: options.timeoutMs,
    reasoning_effort: options.reasoning_effort,
    response_format: options.response_format,
    validateResponse: (text, _provider, model) => {
      validateAnswerReviewResponse(text, expectedAnswerCount, model, { allowPartial: options.allowPartial });
    },
  });
  return { text: result.text, model: result.model };
}
