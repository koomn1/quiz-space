import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workerSource = readFileSync(resolve(process.cwd(), 'worker/src/index.ts'), 'utf8');
const providerSource = readFileSync(resolve(process.cwd(), 'worker/src/providerChain.ts'), 'utf8');
const clientSource = readFileSync(resolve(process.cwd(), 'src/services/aiWorkerClient.ts'), 'utf8');

describe('Cosmo chat provider wiring', () => {
  it('tries Mercury 3 first for text, followed by Groq and OpenAI', () => {
    expect(providerSource).toContain("export const INCEPTION_MODEL = 'mercury-3'");
    expect(providerSource).toMatch(/:\s*\[\[callInception, 'inception', INCEPTION_MODEL\], \[callGroq, 'groq', GROQ_MODEL\], \[callOpenAI, 'openai', OPENAI_MODEL\]\]/);
    expect(workerSource).toContain('const result = await generateWithProviderChain(env, messages)');
  });

  it('routes multimodal messages through Gemini first, then OpenAI', () => {
    expect(providerSource).toContain('const multimodal = isMultimodal(messages)');
    expect(providerSource).toMatch(/\?\s*\[\[callGemini, 'gemini', GEMINI_MODEL\], \[callOpenAI, 'openai', OPENAI_MODEL\]\]/);
    expect(providerSource).toContain('inlineData');
  });

  it('uses the Worker chat routes from the client', () => {
    expect(workerSource).toContain("path === '/api/ai/chat'");
    expect(workerSource).toContain("path === '/api/ai/chat/stream'");
    expect(clientSource).toContain("'/api/ai/chat'");
    expect(clientSource).toContain("'/api/ai/chat/stream'");
    expect(clientSource).not.toContain('/api/ai/openrouter');
  });
});
