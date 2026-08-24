import { describe, expect, it } from 'vitest';
import type { Question } from '../types';
import { applyVerifiedAnswerReviews, normalizeReviewAnswer, parseAnswerReviews } from './extractedAnswerReview';

const questions: Question[] = [{
  id: 'q1',
  number: 1,
  type: 'mcq',
  text: 'ما عاصمة مصر؟',
  options: ['الإسكندرية', 'القاهرة', 'الأقصر', 'أسوان'],
  correctIndex: -1,
  correctAnswer: '',
  explanation: '',
}];

describe('extracted answer review', () => {
  it('maps a verified non-first option and stores the exact option text', () => {
    const result = applyVerifiedAnswerReviews(questions, JSON.stringify({
      answers: [{ questionIndex: 1, correctIndex: 1, correctAnswer: 'القاهرة', explanation: 'وردت في المصدر.' }],
    }));

    expect(result[0].correctIndex).toBe(1);
    expect(result[0].correctAnswer).toBe('القاهرة');
    expect(result[0].explanation).toBe('وردت في المصدر.');
  });

  it('rejects a response whose correctAnswer does not match the selected option', () => {
    expect(() => applyVerifiedAnswerReviews(questions, JSON.stringify({
      answers: [{ questionIndex: 1, correctIndex: 1, correctAnswer: 'الإسكندرية' }],
    }))).toThrow('لم يتم حفظ إجابة تخمينية');
  });

  it('rejects missing objective reviews even when the draft was already zero', () => {
    const draft = [{ ...questions[0], correctIndex: 0 }];
    expect(() => applyVerifiedAnswerReviews(draft, JSON.stringify({ answers: [] })))
      .toThrow('لم يتم حفظ إجابة تخمينية');
  });

  it('rejects invalid question indexes instead of ignoring them', () => {
    expect(() => applyVerifiedAnswerReviews(questions, JSON.stringify({
      answers: [{ questionIndex: 2, correctIndex: 0, correctAnswer: 'الإسكندرية' }],
    }))).toThrow('رقم سؤال غير صالح');
  });

  it('accepts JSON wrapped in a markdown code fence and normalizes harmless typography', () => {
    expect(parseAnswerReviews('```json\n{"answers":[]}\n```')).toEqual([]);
    expect(normalizeReviewAnswer(' القَاهِرة، ')).toBe('القاهرة');
  });
});
