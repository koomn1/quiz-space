import { describe, expect, it } from 'vitest';
import { filterValidGeneratedQuestions } from './quizGenerationValidation';

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
});
