import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workerSource = readFileSync(resolve(process.cwd(), 'worker/src/index.ts'), 'utf8');
const providerSource = readFileSync(resolve(process.cwd(), 'worker/src/providerChain.ts'), 'utf8');

describe('AI provider chain contract', () => {
  it('uses Inception, Groq, Gemini, then OpenAI', () => {
    expect(providerSource).toContain("export const INCEPTION_MODEL = 'mercury-3'");
    expect(providerSource).toContain("export const GROQ_MODEL = 'openai/gpt-oss-20b'");
    expect(providerSource).toContain("export const GEMINI_MODEL = 'gemini-3.8-flash'");
    expect(providerSource).toContain("export const OPENAI_MODEL = 'gpt-5-mini'");
    expect(providerSource).toContain('callInception');
    expect(providerSource).toContain('callGroq');
    expect(providerSource).toContain('callGemini');
    expect(providerSource).toContain('callOpenAI');
    expect(providerSource).toContain("? [[callInception, 'inception', INCEPTION_MODEL], [callGroq, 'groq', GROQ_MODEL], [callOpenAI, 'openai', OPENAI_MODEL]]");
    expect(providerSource).not.toContain('open' + 'router');
    expect(workerSource).not.toContain('open' + 'router');
  });

  it('uses Gemini for multimodal input and does not send it to text-only providers', () => {
    expect(providerSource).toContain('const multimodal = isMultimodal(messages)');
    expect(providerSource).toContain('const attempts = multimodal');
    expect(providerSource).toContain('callGemini');
    expect(providerSource).toContain('inlineData');
  });

  it('keeps the public chat routes independent from provider names', () => {
    expect(workerSource).toContain("path === '/api/ai/chat'");
    expect(workerSource).toContain("path === '/api/ai/chat/stream'");
    expect(workerSource).not.toContain("path === '/api/ai/open' + 'router'");
  });
});
