import { describe, expect, it } from 'vitest';
import { buildEssayGradingPrompt } from './essayGrading';

describe('essay grading prompt', () => {
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
