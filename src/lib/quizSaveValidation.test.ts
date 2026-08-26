import { describe, expect, it } from 'vitest';
import { countVerifiedQuizQuestions, getInvalidQuizQuestions } from './quizSaveValidation';

describe('quiz save validation', () => {
  it('accepts verified objective questions and essay questions', () => {
    const questions = [
      { type: 'mcq', options: ['A', 'B', 'C', 'D'], correctIndex: 2 },
      { type: 'essay', options: [], correctIndex: -1 },
    ];

    expect(getInvalidQuizQuestions(questions)).toEqual([]);
    expect(countVerifiedQuizQuestions(questions)).toBe(2);
  });

  it('reports missing answers and empty options without selecting a default', () => {
    const questions = [
      { type: 'mcq', options: ['A', 'B', 'C', 'D'], correctIndex: -1 },
      { type: 'mcq', options: ['A', '', 'C', 'D'], correctIndex: 0 },
    ];

    expect(getInvalidQuizQuestions(questions)).toEqual([
      { index: 0, reason: 'missing-answer' },
      { index: 1, reason: 'empty-option' },
    ]);
    expect(countVerifiedQuizQuestions(questions)).toBe(0);
  });
});
