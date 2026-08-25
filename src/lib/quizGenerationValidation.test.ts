import { describe, expect, it } from 'vitest';
import { filterValidGeneratedQuestions } from './quizGenerationValidation';
import { validateAndCleanQuiz } from '../hooks/useQuizzes';

describe('filterValidGeneratedQuestions', () => {
  it('retains only generated questions with meaningful text', () => {
    const result = filterValidGeneratedQuestions([
      { text: 'Explain cellular respiration' },
      { text: '   ' },
      { text: '' },
      {},
      { text: 'ما هو قانون نيوتن الأول؟' },
    ]);

    expect(result).toEqual([
      { text: 'Explain cellular respiration' },
      { text: 'ما هو قانون نيوتن الأول؟' },
    ]);
  });

  it('handles an absent generator payload safely', () => {
    expect(filterValidGeneratedQuestions(undefined)).toEqual([]);
  });

  it('repairs an invalid extracted correct index from the answer text', () => {
    const result = validateAndCleanQuiz({
      title: 'اختبار من ملف',
      questions: [{
        text: 'ما عاصمة مصر؟',
        type: 'mcq',
        options: ['الإسكندرية', 'القاهرة', 'الأقصر', 'أسوان'],
        correctIndex: -1,
        correctAnswer: 'القاهرة',
      }],
    });
    expect(result.questions[0].correctIndex).toBe(1);
  });

  it('keeps extracted true/false questions selectable when the model returns text answers', () => {
    const result = validateAndCleanQuiz({
      questions: [{ text: 'الشمس نجم؟', type: 'tf', correctIndex: -1, correctAnswer: 'صح' }],
    });
    expect(result.questions[0].options).toEqual(['صح', 'خطأ']);
    expect(result.questions[0].correctIndex).toBe(0);
  });

  it('rejects an out-of-range extracted index when no reliable answer is available', () => {
    expect(() => validateAndCleanQuiz({
      questions: [{ text: 'سؤال', type: 'mcq', options: ['أ', 'ب'], correctIndex: 99 }],
    })).toThrow('مفتاح إجابة موثوق');
  });

  it('uses the matching answer text to repair an out-of-range index', () => {
    const result = validateAndCleanQuiz({
      questions: [{ text: 'سؤال', type: 'mcq', options: ['أ', 'ب'], correctIndex: 99, correctAnswer: 'ب' }],
    });
    expect(result.questions[0].correctIndex).toBe(1);
  });

  it('preserves an extracted question image URL during validation', () => {
    const result = validateAndCleanQuiz({
      questions: [{
        text: 'ما الذي توضحه الصورة؟',
        type: 'mcq',
        options: ['أ', 'ب'],
        correctIndex: 0,
        imageUrl: 'data:image/png;base64,abc123',
      }],
    });
    expect(result.questions[0].imageUrl).toBe('data:image/png;base64,abc123');
  });
});
