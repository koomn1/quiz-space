import { describe, expect, it, vi } from 'vitest';
import { extractQuestionsFromText } from '../../worker/src/documentExtraction';

describe('structured document extraction fast path', () => {
  it('extracts a conventional question sheet without calling an external model', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const progress: Array<{ processed: number; total: number; questionsExtracted: number }> = [];

    const result = await extractQuestionsFromText(
      `1. What is the red planet?
A. Earth
B. Mars
C. Venus
D. Jupiter
Answer: B

2. True or false: The sun is a star.
Answer: True`,
      { OPENROUTER_API_KEY: 'not-used-for-local-parser' },
      undefined,
      update => { progress.push(update); },
    );

    expect(result.provider).toBe('local-format-parser');
    expect(result.questions).toHaveLength(2);
    expect(result.questions[0]).toMatchObject({
      number: 1,
      type: 'mcq',
      options: ['Earth', 'Mars', 'Venus', 'Jupiter'],
      correctIndex: 1,
      correctAnswer: 'Mars',
    });
    expect(result.questions[1]).toMatchObject({
      number: 2,
      type: 'tf',
      correctIndex: 0,
      correctAnswer: 'True',
    });
    expect(progress).toEqual([{ processed: 1, total: 1, questionsExtracted: 2 }]);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
