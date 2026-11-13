import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'worker/src/index.ts'), 'utf8');

describe('Worker security hardening contract', () => {
  it('does not reflect an arbitrary origin or fall back to the primary origin', () => {
    expect(source).toContain('function isAllowedOrigin(request: Request, env: Env): boolean');
    expect(source).toContain("if (!isAllowedOrigin(request, env))");
    expect(source).not.toContain("const allowOrigin = allowed.includes(origin) ? origin : primaryOrigin");
  });

  it('bounds request bodies before parsing JSON', () => {
    expect(source).toContain('function requestBodyLimit(path: string): number');
    expect(source).toContain("if (contentLength > requestBodyLimit(path))");
    expect(source).toContain("return json({ error: 'Request body is too large.' }, 413, headers)");
  });

  it('uses separate guest and authenticated limits for expensive AI work', () => {
    expect(source).toContain('RATE_LIMIT_POLICIES');
    expect(source).toContain("rateLimitClass(path)");
    expect(source).toContain('policy.guest');
    expect(source).toContain('policy.authenticated');
  });

  it('bounds the process-local rate-limit map and handles malformed JSON safely', () => {
    expect(source).toContain('rateLimitMap.size > 2_000');
    expect(source).toContain("return json({ error: 'Invalid JSON request.' }, 400, headers)");
  });
});
