import { describe, expect, it, vi } from 'vitest';
import { extractQuestionsFromText, isReliableLiteralExtraction, parseLiteralQuestions, splitTextForExtraction } from '../../worker/src/documentExtraction';

describe('structured document extraction fast path', () => {
  it('uses Mercury Decide as the primary extractor when its key is configured', async () => {
    const source = `Item 1 — What is the red planet?
Choice A: Earth
Choice B: Mars
Choice C: Venus
Correct choice: B`;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      model: 'mercury-decide',
      answers: { question_blocks: { type: 'extract', spans: { question_1: [{ text: `1. What is the red planet?\nA. Earth\nB. Mars\nC. Venus\nAnswer: B`, confidence: 0.98 }] } } },
    }), { status: 200 }));

    const result = await extractQuestionsFromText(source, { OPENROUTER_API_KEY: 'unused', INCEPTION_API_KEY: 'test-inception-key' });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body)).model).toBe('mercury-decide');
    expect(result.provider).toBe('mercury-decide');
    expect(result.questions[0]).toMatchObject({ extractionMethod: 'mercury-decide', correctIndex: 1 });
    fetchSpy.mockRestore();
  });

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

  it('overlaps long text chunks so boundary-spanning questions are not cut off', () => {
    const source = `${'x'.repeat(119_500)}\nQuestion 41. Which option continues across the provider boundary?\nA. First\nB. Second\n${'y'.repeat(6_000)}`;
    const chunks = splitTextForExtraction(source);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.some(chunk => chunk.includes('Question 41.'))).toBe(true);
    expect(chunks.some(chunk => chunk.includes('Which option continues across the provider boundary?'))).toBe(true);
  });

  it('extracts Q1 and Question 2 directly while preserving source order and duplicates', () => {
    const source = `Q1. Choose the correct answer.
(A) First
(B) Second
Answer: B
Question 2: Choose the correct answer.
A. First
B. Second
Answer: A
3. Choose the correct answer.
A. First
B. Second
Answer: B`;
    const questions = parseLiteralQuestions(source);
    expect(questions).toHaveLength(3);
    expect(questions.map(question => question.number)).toEqual([1, 2, 3]);
    expect(questions.map(question => question.extractionMethod)).toEqual(['direct', 'direct', 'direct']);
    expect(questions[0].sourceText).toContain('Q1. Choose the correct answer.');
    expect(isReliableLiteralExtraction(source, questions)).toBe(true);
  });

  it('does not call the model for a reliable direct extraction', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await extractQuestionsFromText(
      `1. What is 2 + 2?
A. 3
B. 4
Answer: B
2. What is 3 + 3?
A. 5
B. 6
Answer: B`,
      { OPENROUTER_API_KEY: 'not-used-for-direct-extraction' },
    );
    expect(result.provider).toBe('local-format-parser');
    expect(result.questions).toHaveLength(2);
    expect(result.questions.every(question => question.extractionMethod === 'direct')).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('parses option labels with a spaced dash and flags missing answers for review', () => {
    const source = `Question 7: Water freezes at what temperature?
A - 0°C
B - 50°C
C - 100°C`;
    const [question] = parseLiteralQuestions(source);
    expect(question.type).toBe('mcq');
    expect(question.options).toEqual(['0°C', '50°C', '100°C']);
    expect(question.correctIndex).toBe(-1);
    expect(question.reviewRequired).toBe(true);
  });

  it('accepts Q1 and Question 1 without punctuation after the number', () => {
    const questions = parseLiteralQuestions(`Q1 What is two plus two?\nA. Three\nB. Four\nAnswer: B\n\nQuestion 2 What is three plus three?\nA. Five\nB. Six\nAnswer: B`);
    expect(questions.map(question => question.number)).toEqual([1, 2]);
    expect(questions.map(question => question.text)).toEqual(['What is two plus two?', 'What is three plus three?']);
  });
});
