import { describe, expect, it } from 'vitest';
import type { Question } from '../types';
import { applySourceAnswerKey, applyVerifiedAnswerReviews, normalizeReviewAnswer, parseAnswerReviews } from './extractedAnswerReview';

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

  it('accepts zero-based question indexes when the response clearly uses index zero', () => {
    const twoQuestions = [
      { ...questions[0], id: 'q1-zero' },
      { ...questions[0], id: 'q2-zero', number: 2 },
    ];
    const result = applyVerifiedAnswerReviews(twoQuestions, JSON.stringify({
      answers: [
        { questionIndex: 0, correctIndex: 1, correctAnswer: 'القاهرة' },
        { questionIndex: 1, correctIndex: 2, correctAnswer: 'الأقصر' },
      ],
    }));
    expect(result.map(question => question.correctIndex)).toEqual([1, 2]);
  });

  it('derives the selected option from selectedIndex or exact answer text', () => {
    const selectedIndexResult = applyVerifiedAnswerReviews(questions, JSON.stringify({
      answers: [{ questionIndex: 1, selectedIndex: 1, correctAnswer: 'القاهرة' }],
    }));
    expect(selectedIndexResult[0].correctIndex).toBe(1);

    const exactTextResult = applyVerifiedAnswerReviews(questions, JSON.stringify({
      answers: [{ questionIndex: 1, correctAnswer: 'القاهرة' }],
    }));
    expect(exactTextResult[0].correctIndex).toBe(1);
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

  it('applies a complete source answer key without an AI round trip', () => {
    const sourceQuestions = [
      { ...questions[0], number: 1, options: ['A1', 'B1', 'C1', 'D1'] },
      { ...questions[0], id: 'q2', number: 2, options: ['A2', 'B2', 'C2', 'D2'] },
      { ...questions[0], id: 'q3', number: 3, options: ['A3', 'B3', 'C3', 'D3'] },
    ];
    const result = applySourceAnswerKey(sourceQuestions, 'Questions... Answer key 1: B 2: C 3: D');
    expect(result.matched).toBe(3);
    expect(result.questions.map(question => question.correctIndex)).toEqual([1, 2, 3]);
    expect(result.questions[1].correctAnswer).toBe('C2');
  });

  it('accepts common answer-key separators, question prefixes, and numeric choices', () => {
    const sourceQuestions = [
      { ...questions[0], number: 1, options: ['A1', 'B1', 'C1', 'D1'] },
      { ...questions[0], id: 'q2', number: 2, options: ['A2', 'B2', 'C2', 'D2'] },
      { ...questions[0], id: 'q3', number: 3, options: ['A3', 'B3', 'C3', 'D3'] },
      { ...questions[0], id: 'q4', number: 4, options: ['A4', 'B4', 'C4', 'D4'] },
    ];
    const result = applySourceAnswerKey(sourceQuestions, 'Answer Key: Q1: B, (2) 3, 3) D, 4 - A');
    expect(result.matched).toBe(4);
    expect(result.questions.map(question => question.correctIndex)).toEqual([1, 2, 3, 0]);
  });

  it('accepts Worker-wrapped, double-encoded, and prefixed model answers', () => {
    const workerResponse = JSON.stringify({ text: JSON.stringify({
      answers: [{ questionIndex: 1, correctIndex: 1, correctAnswer: 'B) القاهرة', explanation: 'سبب', evidence: 'دليل' }],
    }) });
    expect(parseAnswerReviews(JSON.parse(workerResponse).text)).toHaveLength(1);
    expect(parseAnswerReviews(JSON.stringify(JSON.parse(workerResponse).text))).toHaveLength(1);
    expect(parseAnswerReviews(workerResponse)).toHaveLength(1);
    expect(normalizeReviewAnswer('B) القاهرة')).toBe('القاهرة');
  });

  it('accepts nested result/data/content wrappers and double-encoded JSON', () => {
    const answers = [{ questionIndex: 1, correctIndex: 1, correctAnswer: 'القاهرة' }];
    expect(parseAnswerReviews(JSON.stringify({ result: JSON.stringify({ answers }) }))).toEqual(answers);
    expect(parseAnswerReviews(JSON.stringify({ data: { content: JSON.stringify({ answers }) } }))).toEqual(answers);
    expect(parseAnswerReviews(JSON.stringify({ output: { response: { answers } } }))).toEqual(answers);
  });

  it('accepts JSON wrapped in a markdown code fence and normalizes harmless typography', () => {
    expect(parseAnswerReviews('```json\n{"answers":[]}\n```')).toEqual([]);
    expect(normalizeReviewAnswer(' القَاهِرة، ')).toBe('القاهرة');
  });

  it('skips an unbalanced bracket in reasoning text before the real JSON answer', () => {
    const reasoningPreamble = 'دعني أفكر خطوة بخطوة [مثال غير مكتمل للتنسيق ثم القيمة الصحيحة هي القاهرة.\n\n';
    const response = `${reasoningPreamble}${JSON.stringify({ answers: [{ questionIndex: 1, correctIndex: 1, correctAnswer: 'القاهرة' }] })}`;
    expect(parseAnswerReviews(response)).toHaveLength(1);
  });

  it('skips a balanced but irrelevant bracket group before the real JSON answer', () => {
    const reasoningPreamble = 'الخيارات هي [الإسكندرية، القاهرة، الأقصر، أسوان] وسأتحقق من كل واحد.\n\n';
    const response = `${reasoningPreamble}${JSON.stringify({ answers: [{ questionIndex: 1, correctIndex: 1, correctAnswer: 'القاهرة' }] })}`;
    expect(parseAnswerReviews(response)).toHaveLength(1);
  });
});
