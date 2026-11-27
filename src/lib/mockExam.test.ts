import { describe, expect, it } from 'vitest';
import type { Quiz, Question } from '../types';
import { ALL_SUBJECTS, buildMockExam, clampCount, collectPool, formatClock, listSubjects, scoreMockExam } from './mockExam';

const q = (id: string, text: string, over: Partial<Question> = {}): Question => ({
  id, text, type: 'mcq', options: ['a', 'b', 'c', 'd'], correctIndex: 1, ...over,
});
const quiz = (id: string, category: string | undefined, questions: Question[], over: Partial<Quiz> = {}): Quiz => ({
  id, title: `Quiz ${id}`, description: '', creatorId: 'u', creatorName: 'U', questions,
  createdAt: '', totalPlays: 0, avgRating: 0, ratingsCount: 0, category, ...over,
});

describe('mockExam', () => {
  const quizzes = [
    quiz('1', 'physics', [q('a', 'Force?'), q('b', 'Essay', { type: 'essay', options: [] }), q('c', 'Same text')]),
    quiz('2', 'physics', [q('d', ' same   TEXT '), q('e', 'Speed?', { type: 'tf', options: ['T', 'F'], correctIndex: 0 })]),
    quiz('3', undefined, [q('f', 'Misc?')]),
    quiz('4', 'physics', [q('g', 'Hidden?')], { distributionRouting: 'classroom' }),
    quiz('5', 'physics', [q('h', 'Bad index', { correctIndex: 9 })]),
  ];

  it('skips essays, private quizzes, bad questions and duplicates', () => {
    const pool = collectPool(quizzes, 'physics');
    expect(pool.map(p => p.question.id).sort()).toEqual(['a', 'c', 'e']);
    expect(collectPool(quizzes, ALL_SUBJECTS)).toHaveLength(4);
  });

  it('lists subjects with question counts', () => {
    const subjects = listSubjects(quizzes);
    expect(subjects[0]).toMatchObject({ subject: 'physics', questionCount: 3 });
    expect(subjects).toHaveLength(2);
  });

  it('builds an exam capped by pool size and is deterministic with a seeded rng', () => {
    const exam = buildMockExam(quizzes, { subject: ALL_SUBJECTS, count: 50, minutes: 5 }, () => 0);
    expect(exam).toHaveLength(4);
    expect(clampCount(500, 1000)).toBe(100);
    expect(clampCount(NaN, 4)).toBe(4);
  });

  it('scores correct, wrong and unanswered', () => {
    const exam = buildMockExam(quizzes, { subject: 'physics', count: 2, minutes: 2 }, () => 0);
    const [first, second] = exam;
    const result = scoreMockExam(exam, { [first.key]: first.question.correctIndex, [second.key]: second.question.correctIndex === 0 ? 1 : 0 });
    expect(result).toMatchObject({ total: 2, correct: 1, wrong: 1, unanswered: 0, percent: 50 });
    expect(scoreMockExam(exam, {}).unanswered).toBe(2);
    expect(scoreMockExam([], {}).percent).toBe(0);
  });

  it('formats the clock', () => {
    expect(formatClock(125)).toBe('02:05');
    expect(formatClock(-4)).toBe('00:00');
  });
});
