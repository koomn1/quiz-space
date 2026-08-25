import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workerSource = readFileSync(resolve(process.cwd(), 'worker/src/index.ts'), 'utf8');

describe('Cosmo generation recovery contract', () => {
  it('uses Qwen 3.7 Flash as the fast Arabic-capable primary Cosmo route', () => {
    expect(workerSource).toContain("const OPENROUTER_TEXT_MODEL = 'qwen/qwen3.7-flash'");
    expect(workerSource).toContain('const OPENROUTER_STREAM_TEXT_MODELS = [');
    expect(workerSource).toContain("'nvidia/nemotron-3.5-lightning:free'");
    expect(workerSource).toContain("'mistralai/mistral-small-3.1-24b-instruct'");
    expect(workerSource).toContain("'qwen/qwen3.5-122b-a10b'");
  });

  it('uses the resilient OpenRouter model sequence for quiz generation', () => {
    expect(workerSource).toContain('callOpenRouterWithFallback(env, [{ role: \'user\', content: prompt }], OPENROUTER_TEXT_FALLBACKS');
    expect(workerSource).toContain('max_tokens: 8_000');
  });

  it('uses bounded direct providers before OpenRouter for text-only answer review', () => {
    expect(workerSource).toContain('const ANSWER_REVIEW_MODEL_TIMEOUT_MS = 12_000');
    expect(workerSource).toContain("aiOperation = isAnswerReview ? 'answer_review' : 'cosmo_chat'");
    expect(workerSource).toContain("timeoutMs: 10_000");
    expect(workerSource).toContain("text = await providerText('groq', directAnswerReviewPrompt");
    expect(workerSource).toContain("console.warn('Direct answer-review providers failed; trying OpenRouter text models.'");
    expect(workerSource).toContain("if (options.skipOpenRouterFallback) throw lastError");
  });

  it('records safe generation failures so Super Admin monitoring can diagnose them', () => {
    expect(workerSource).toContain("aiOperation = 'generation'");
    expect(workerSource).toContain("status: 'error'");
    expect(workerSource).toContain('error_message: safeAiErrorMessage(error)');
    expect(workerSource).toContain('Quiz generation providers are temporarily unavailable. Please retry shortly.');
  });

  it('does not silently ignore a rejected Supabase telemetry insert', () => {
    expect(workerSource).toContain("console.error('AI performance logging rejected', response.status, details)");
  });

  it('enforces paid entitlement on question explanations before calling the AI provider', () => {
    expect(workerSource).toContain('async function hasPaidCosmoAccess');
    expect(workerSource).toContain("if (userId === 'guest' || userId === 'placeholder-user') return json({ error: 'Authentication required' }, 401, headers);");
    expect(workerSource).toContain("if (!(await hasPaidCosmoAccess(request, env, userId))) return json({ error: 'Cosmo explanations require an active paid plan.' }, 403, headers);");
    expect(workerSource).toContain('&limit=1');
    expect(workerSource).toContain("Boolean(profile?.is_premium) || isPaidCosmoPlan(profile?.plan_name)");
  });

  it('bounds explanation inputs before constructing the provider prompt', () => {
    expect(workerSource).toContain('body.questionText.length > 8_000');
    expect(workerSource).toContain('body.options.length > 20');
    expect(workerSource).toContain('body.correctAnswer.length > 2_000');
  });
});
