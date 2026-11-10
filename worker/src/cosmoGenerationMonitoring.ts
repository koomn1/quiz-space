import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workerSource = readFileSync(resolve(process.cwd(), 'worker/src/index.ts'), 'utf8');
const providerSource = readFileSync(resolve(process.cwd(), 'worker/src/providerChain.ts'), 'utf8');

describe('AI provider chain contract', () => {
  it('uses Inception Mercury 3 as the only text provider', () => {
    expect(providerSource).toContain("export const INCEPTION_MODEL = 'mercury-3'");
    expect(providerSource).toContain("[[callInception, 'inception', INCEPTION_MODEL]]");
    expect(providerSource).not.toMatch(/callGroq|callGemini|callOpenAI|openrouter\.ai/);
    expect(workerSource).toContain('const AI_TEXT_FALLBACKS = [INCEPTION_TEXT_MODEL]');
  });

  it('uses xKiro as the only multimodal provider', () => {
    expect(providerSource).toContain("export const XKIRO_VISION_MODEL = 'cohere/command-a-plus'");
    expect(providerSource).toContain("[[callXkiro, 'xkiro', XKIRO_VISION_MODEL]]");
    expect(providerSource).toContain('api.xkiro.com/v1/chat/completions');
    expect(providerSource).not.toMatch(/callGemini|callOpenAI|openrouter\.ai/);
    expect(workerSource).toContain('const AI_VISION_FALLBACKS = [XKIRO_VISION_MODEL_ID]');
  });

  it('keeps the public chat routes independent from provider names', () => {
    expect(workerSource).toContain("path === '/api/ai/chat'");
    expect(workerSource).toContain("path === '/api/ai/chat/stream'");
    expect(workerSource).not.toContain("path === '/api/ai/open' + 'router'");
  });
});
