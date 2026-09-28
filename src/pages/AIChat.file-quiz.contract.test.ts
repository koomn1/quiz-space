import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/pages/AIChat.tsx'), 'utf8');

describe('Cosmo file quiz flow contract', () => {
  it('routes attached-file quiz requests to the file quiz generator', () => {
    expect(source).toContain('requestedFileQuiz');
    expect(source).toContain('generateQuizFromFileStreaming');
    expect(source).toContain('generateQuizFromFileWithFallback');
  });

  it('persists the generated file quiz and opens it in the platform', () => {
    expect(source).toContain('createQuiz({');
    expect(source).toContain('onOpenGeneratedQuiz?.(saved.id)');
    expect(source).toContain('setPendingQuizAttachment(null)');
  });

  it('recognizes Arabic and English quiz intent before sending a chat request', () => {
    expect(source).toContain('اختبرني|اختبار|كويز|امتحان|create|make|generate|quiz|test');
    expect(source).toContain('export function parseQuizRequest');
  });
});
