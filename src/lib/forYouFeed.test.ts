import { describe, expect, it } from 'vitest';
import type { Quiz } from '../types';
import { EMPTY_SIGNALS, buildSubjectAffinity, rankForYou } from './forYouFeed';

const NOW = Date.parse('2026-11-27T00:00:00Z');
const quiz = (id: string, over: Partial<Quiz> = {}): Quiz => ({
  id, title: id, description: '', creatorId: 'c-' + id, creatorName: 'x',
  questions: [{ id: 'q', text: 't', type: 'mcq', options: ['a', 'b'], correctIndex: 0 }],
  createdAt: '2026-01-01T00:00:00Z', totalPlays: 0, avgRating: 0, ratingsCount: 0, ...over,
});

describe('forYouFeed', () => {
  it('prefers followed creators and subjects the user already studies', () => {
    const quizzes = [quiz('plain'), quiz('bio', { category: 'biology' }), quiz('fol', { creatorId: 'friend' })];
    const affinity = buildSubjectAffinity([...quizzes, quiz('old', { category: 'biology' })], ['old']);
    const ranked = rankForYou(quizzes, { ...EMPTY_SIGNALS, followedCreatorIds: new Set(['friend']), subjectAffinity: affinity, now: NOW });
    expect(ranked.map(r => r.quiz.id)).toEqual(['fol', 'bio', 'plain']);
    expect(ranked[0].reasons).toContain('followed');
    expect(ranked[1].reasons).toContain('subject');
  });

  it('pushes completed and empty quizzes down, hides non-public ones', () => {
    const quizzes = [quiz('done'), quiz('empty', { questions: [] }), quiz('new'), quiz('priv', { distributionRouting: 'classroom' })];
    const ranked = rankForYou(quizzes, { ...EMPTY_SIGNALS, completedQuizIds: new Set(['done']), now: NOW });
    expect(ranked.map(r => r.quiz.id)).toEqual(['new', 'done', 'empty']);
  });

  it('boosts fresh and popular quizzes and keeps order for ties', () => {
    const fresh = quiz('fresh', { createdAt: '2026-11-26T00:00:00Z' });
    const pop = quiz('pop', { totalPlays: 500, avgRating: 4.8, ratingsCount: 10 });
    const a = quiz('a'); const b = quiz('b');
    const ranked = rankForYou([a, b, fresh, pop], { ...EMPTY_SIGNALS, now: NOW });
    expect(ranked.slice(2).map(r => r.quiz.id)).toEqual(['a', 'b']);
    expect(ranked[0].reasons.length).toBeGreaterThan(0);
  });
});
