import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workerSource = readFileSync(resolve(process.cwd(), 'worker/src/index.ts'), 'utf8');

describe('Cosmo generation recovery contract', () => {
  it('uses the resilient OpenRouter model sequence for quiz generation', () => {
    expect(workerSource).toContain('callOpenRouterWithFallback(env, [{ role: \'user\', content: prompt }], OPENROUTER_TEXT_FALLBACKS');
    expect(workerSource).toContain('max_tokens: 8_000');
  });

  it('records safe generation failures so Super Admin monitoring can diagnose them', () => {
    expect(workerSource).toContain("aiOperation = 'generation'");
    expect(workerSource).toContain("status: 'error'");
    expect(workerSource).toContain('error_message: safeAiErrorMessage(error)');
    expect(workerSource).toContain('Quiz generation providers are temporarily unavailable. Please retry shortly.');
  });
});
