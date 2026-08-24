import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/hooks/useQuizGenerator.ts'), 'utf8');

describe('file extraction progress contract', () => {
  it('uses the server-reported percentage instead of treating chunks as questions', () => {
    expect(source).toContain('job.progressPercentage');
    expect(source).toContain('const totalChunks = job.totalChunks || 1;');
    expect(source).toContain('percentage: reportedPercentage');
  });

  it('cleans extracted questions before saving the quiz', () => {
    expect(source).toContain('validateAndCleanQuiz({');
    expect(source).toContain('accumulatedQuestions = cleanedFileQuiz.questions;');
  });

  it('supports a non-persisted draft followed by an explicit solving stage', () => {
    expect(source).toContain('persist?: boolean');
    expect(source).toContain('persist = true');
    expect(source).toContain('if (!persist)');
    expect(source).toContain("stage: 'solving'");
    expect(source).toContain('correctIndex: typeof q.correctIndex === \'number\' ? q.correctIndex : -1');
    expect(source).toContain('بعض الإجابات الموضوعية غير مؤكدة');
  });
});
