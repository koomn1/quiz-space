import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workerSource = readFileSync(resolve(process.cwd(), 'worker/src/index.ts'), 'utf8');
const authSource = readFileSync(resolve(process.cwd(), 'worker/src/auth.ts'), 'utf8');
const cosmoRoutesSource = readFileSync(resolve(process.cwd(), 'worker/src/cosmoRoutes.ts'), 'utf8');
const providerChainSource = readFileSync(resolve(process.cwd(), 'worker/src/providerChain.ts'), 'utf8');
const routeSources = [workerSource, authSource, cosmoRoutesSource].join('\n');

describe('Cosmo generation recovery contract', () => {
  it('uses Mercury 3, Groq, and OpenAI as the text provider chain', () => {
    expect(providerChainSource).toContain("export const INCEPTION_MODEL = 'mercury-3'");
    expect(providerChainSource).toContain("export const GROQ_MODEL = 'openai/gpt-oss-20b'");
    expect(providerChainSource).toContain("export const OPENAI_MODEL = 'gpt-5-mini'");
    expect(providerChainSource).toContain("[callInception, 'inception', INCEPTION_MODEL], [callGroq, 'groq', GROQ_MODEL], [callOpenAI, 'openai', OPENAI_MODEL]");
  });

  it('uses Gemini first and OpenAI as the multimodal fallback', () => {
    expect(providerChainSource).toContain("export const GEMINI_MODEL = 'gemini-3.8-flash'");
    expect(providerChainSource).toContain("[callGemini, 'gemini', GEMINI_MODEL], [callOpenAI, 'openai', OPENAI_MODEL]");
    expect(providerChainSource).toContain('inlineData: { mimeType: match[1], data: match[2] }');
  });

  it('batches Cosmo quiz generation within provider output limits', () => {
    expect(workerSource).toContain("if (provider !== 'inception'");
    expect(workerSource).toContain('const initialBatchSize = Math.min(body.amount, 25);');
    expect(workerSource).toContain('providerText(provider, quizPrompt(body.topic, initialBatchSize, baseQuestions), env)');
    expect(workerSource).toContain('Math.min(missing, 25)');
  });

  it('normalizes wrapped provider content and extracts balanced JSON safely', () => {
    expect(workerSource).toContain('function providerContentToText(value: unknown): string');
    expect(workerSource).toContain("for (const key of ['text', 'content', 'output', 'result', 'data', 'response'])");
    expect(workerSource).toContain('function balancedJsonCandidates(value: string): string[]');
    expect(workerSource).toContain("for (const key of ['result', 'data', 'text', 'content', 'output', 'response', 'body'])");
    expect(workerSource).toContain('providerContentToText(record[key])');
  });

  it('validates answer review before accepting a provider response and falling back', () => {
    expect(workerSource).toContain('const ANSWER_REVIEW_MODEL_TIMEOUT_MS = 30_000');
    expect(workerSource).toContain('validateResponse: (text, _provider, model) =>');
    expect(workerSource).toContain('validateAnswerReviewResponse(text, expectedAnswerCount, model');
    expect(workerSource).toContain('export async function callAiWithParallelAnswerReviewFallback(');
    expect(workerSource).toContain('callOpenRouterWithParallelAnswerReviewFallback = callAiWithParallelAnswerReviewFallback');
    expect(providerChainSource).toContain('options.validateResponse?.(text, provider, model)');
    expect(workerSource).toContain('Answer-review contract recovery activated');
  });

  it('limits the provider chain to configured supported endpoints', () => {
    expect(providerChainSource).toContain('api.inceptionlabs.ai/v1/chat/completions');
    expect(providerChainSource).toContain('api.groq.com/openai/v1/chat/completions');
    expect(providerChainSource).toContain('generativelanguage.googleapis.com/v1beta/models');
    expect(providerChainSource).toContain('api.openai.com/v1/chat/completions');
    expect(providerChainSource).not.toContain('openrouter.ai');
    expect(providerChainSource).not.toContain('api.deepseek.com');
    expect(workerSource).not.toContain("provider: 'deepseek'");
    expect(workerSource).not.toContain("provider: 'direct'");
  });

  it('records safe generation failures so Super Admin monitoring can diagnose them', () => {
    expect(workerSource).toContain("aiOperation = 'generation'");
    expect(workerSource).toContain("status: 'error'");
    expect(workerSource).toContain("error_message: aiOperation === 'answer_review' ? safeAiErrorCategory(error) : safeAiErrorMessage(error)");
    expect(workerSource).toContain('error_category: safeAiErrorCategory(error)');
    expect(workerSource).toContain('Quiz generation providers are temporarily unavailable. Please retry shortly.');
  });

  it('does not silently ignore a rejected Supabase telemetry insert', () => {
    expect(workerSource).toContain("console.error('AI performance logging rejected', response.status, details)");
  });

  it('enforces paid entitlement on question explanations before calling the AI provider', () => {
    expect(routeSources).toContain('export async function hasPaidCosmoAccess');
    expect(workerSource).toContain("if (userId === 'guest' || userId === 'placeholder-user') return json({ error: 'Authentication required' }, 401, headers);");
    expect(workerSource).toContain("if (!(await hasPaidCosmoAccess(request, env, userId))) return json({ error: 'Cosmo explanations require an active paid plan.' }, 403, headers);");
    expect(routeSources).toContain('&limit=1');
    expect(routeSources).toContain('Boolean(profile?.is_premium) || isPaidCosmoPlan(profile?.plan_name)');
  });

  it('bounds explanation inputs before constructing the provider prompt', () => {
    expect(workerSource).toContain('body.questionText.length > 8_000');
    expect(workerSource).toContain('body.options.length > 20');
    expect(workerSource).toContain('body.correctAnswer.length > 2_000');
  });
});
