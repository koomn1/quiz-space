import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workerSource = readFileSync(resolve(process.cwd(), 'worker/src/index.ts'), 'utf8');
const providerSource = readFileSync(resolve(process.cwd(), 'worker/src/providerChain.ts'), 'utf8');
const clientSource = readFileSync(resolve(process.cwd(), 'src/services/aiWorkerClient.ts'), 'utf8');

describe('Cosmo chat provider wiring', () => {
  it('uses Mercury 3 for text', () => {
    expect(providerSource).toContain("export const INCEPTION_MODEL = 'mercury-3'");
    expect(providerSource).toContain("[[callInception, 'inception', INCEPTION_MODEL]]");
    expect(workerSource).toContain('const result = await generateWithProviderChain(env, messages)');
  });

  it('routes multimodal messages through Xkiro', () => {
    expect(providerSource).toContain('const multimodal = isMultimodal(messages)');
    expect(providerSource).toContain("[[callXkiro, 'xkiro', XKIRO_VISION_MODEL]]");
    expect(providerSource).toContain('isMultimodal(messages)');
  });

  it('uses the Worker chat routes from the client', () => {
    expect(workerSource).toContain("path === '/api/ai/chat'");
    expect(workerSource).toContain("path === '/api/ai/chat/stream'");
    expect(clientSource).toContain("'/api/ai/chat'");
    expect(clientSource).toContain("'/api/ai/chat/stream'");
    expect(clientSource).not.toContain('/api/ai/openrouter');
  });
});
