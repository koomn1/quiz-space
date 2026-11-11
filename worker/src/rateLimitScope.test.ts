import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Worker AI burst guard scope', () => {
  const source = readFileSync(resolve(process.cwd(), 'worker/src/index.ts'), 'utf8');

  it('applies the IP burst guard only to AI POST endpoints', () => {
    expect(source).toContain("const isAiPostRequest = request.method === 'POST' && path.startsWith('/api/ai/');");
    expect(source).toContain('if (isAiPostRequest) {');
    expect(source).not.toContain('checkRateLimit(`${request.method}:${clientIp}`)');
  });
});
