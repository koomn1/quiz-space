import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildEssayGradingPrompt, normalizeEssayGradeResult } from './essayGrading';

const workerSource = readFileSync(resolve(process.cwd(), 'worker/src/index.ts'), 'utf8');

describe('essay grading prompt', () => {
  it('gives reasoning models enough budget and requests structured JSON', () => {
    const gradingSource = workerSource.slice(
      workerSource.indexOf('async function gradeEssayWithFallback'),
      workerSource.indexOf('async function providerText'),
    );
    expect(gradingSource).toContain('max_tokens: 1_200');
    expect(gradingSource).toContain("response_format: { type: 'json_object' }");
    expect(gradingSource).toContain('timeoutMs: 45_000');
  });

  it('normalizes boolean-like AI results without accepting false as true', () => {
    expect(normalizeEssayGradeResult({ correct: 'true', confidence: 92, reason: 'Equivalent meaning' })).toEqual({
      correct: true,
      confidence: 0.92,
      reason: 'Equivalent meaning',
    });
    expect(normalizeEssayGradeResult({ is_correct: 'صحيح', score: 0.8, reason: 'صحيحة' }).correct).toBe(true);
    expect(normalizeEssayGradeResult({ correct: 'false', confidence: 0.9 }).correct).toBe(false);
  });

  it('grades against the question when the quiz author did not provide a model answer', () => {
    const prompt = buildEssayGradingPrompt(
      'Mention the valves of the heart.',
      '',
      'The heart has four valves: tricuspid, pulmonary, mitral, and aortic.',
    );

    expect(prompt).toContain('لم يرفق منشئ الاختبار إجابة نموذجية');
    expect(prompt).toContain('لا تعتبر غياب الإجابة النموذجية سببًا لرفض إجابة صحيحة');
    expect(prompt).toContain('The heart has four valves');
    expect(prompt).not.toContain('الإجابة النموذجية المعتمدة للمقارنة');
  });

  it('uses the supplied model answer as a reference when available', () => {
    const prompt = buildEssayGradingPrompt(
      'Mention the valves of the heart.',
      'Tricuspid, pulmonary, mitral, and aortic valves.',
      'The mitral valve is on the left side.',
    );

    expect(prompt).toContain('الإجابة النموذجية المعتمدة للمقارنة');
    expect(prompt).toContain('Tricuspid, pulmonary, mitral, and aortic valves.');
    expect(prompt).toContain('اقبل المرادفات');
  });
});
