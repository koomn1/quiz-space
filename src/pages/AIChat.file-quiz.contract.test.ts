import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/pages/AIChat.tsx'), 'utf8');

describe('Cosmo file quiz flow contract', () => {
  it('routes attached-file quiz requests to the file quiz generator', () => {
    expect(source).toContain('requestedFileQuiz');
    expect(source).toContain('attachmentName: attachmentForQuiz?.kind');
    expect(source).toContain('pendingQuizAttachmentRef');
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

  it('routes authenticated attached files through chunked generation for complete source coverage', () => {
    expect(source).toContain("attachmentForGeneration.kind === 'file' && userId && !userId.startsWith('user-guest')");
    expect(source).toContain('extractionMode: \'generate\'');
    expect(source).toContain('requestedQuestionCount: pendingQuiz.amount');
    expect(source).not.toContain("attachmentForGeneration.data.length > 5_000_000");
  });

  it('uses Arabic internal instructions while explicitly keeping generated quiz content in the source language', () => {
    expect(source).toContain('اكتب العنوان والوصف والأسئلة والخيارات والإجابات والشروح باللغة الغالبة في الملف نفسه');
    expect(source).toContain('[COSMO_OUTPUT_LANGUAGE: en]');
    expect(source).toContain('سبب صحة الإجابة');
  });
});
