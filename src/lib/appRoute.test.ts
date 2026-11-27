import { describe, expect, it } from 'vitest';
import { resolveActiveQuizId, resolveActiveTab, resolveUrlProfileId } from './appRoute';

const sp = (q = '') => new URLSearchParams(q);

describe('resolveActiveTab', () => {
  it('prefers the tab query param', () => {
    expect(resolveActiveTab(sp('tab=community'), { pathname: '/', hash: '' })).toBe('community');
  });
  it('reads dashboard tabs from the hash', () => {
    expect(resolveActiveTab(sp(), { pathname: '/', hash: '#/dashboard/explore?x=1' })).toBe('explore');
  });
  it('reads dashboard tabs from the pathname, ignoring the /quiz-space base', () => {
    expect(resolveActiveTab(sp(), { pathname: '/quiz-space/dashboard/analytics', hash: '' })).toBe('analytics');
  });
  it('maps quiz, profile, legal and join routes', () => {
    expect(resolveActiveTab(sp(), { pathname: '/', hash: '#/quiz/abc' })).toBe('quiz');
    expect(resolveActiveTab(sp(), { pathname: '/', hash: '#/profile/u1' })).toBe('profile');
    expect(resolveActiveTab(sp(), { pathname: '/', hash: '#/legal/terms' })).toBe('legal-terms');
    expect(resolveActiveTab(sp(), { pathname: '/', hash: '#/join/code' })).toBe('classrooms');
  });
  it('falls back to landing and not-found', () => {
    expect(resolveActiveTab(sp(), { pathname: '/', hash: '' })).toBe('landing');
    expect(resolveActiveTab(sp(), { pathname: '/', hash: '#/definitely-not-a-tab' })).toBe('not-found');
  });
});

describe('resolveActiveQuizId', () => {
  it('prefers the quizId query param', () => {
    expect(resolveActiveQuizId(sp('quizId=q1'), { pathname: '/', hash: '' })).toBe('q1');
  });
  it('reads from hash and pathname', () => {
    expect(resolveActiveQuizId(sp(), { pathname: '/', hash: '#/quiz/q2?tab=quiz' })).toBe('q2');
    expect(resolveActiveQuizId(sp(), { pathname: '/quiz-space/quiz/q3', hash: '' })).toBe('q3');
    expect(resolveActiveQuizId(sp(), { pathname: '/apps/q4', hash: '' })).toBe('q4');
  });
  it('returns null when there is no quiz', () => {
    expect(resolveActiveQuizId(sp(), { pathname: '/', hash: '' })).toBeNull();
  });
});

describe('resolveUrlProfileId', () => {
  it('reads from query, hash and pathname', () => {
    expect(resolveUrlProfileId(sp('profileId=p1'), { pathname: '/', hash: '' })).toBe('p1');
    expect(resolveUrlProfileId(sp(), { pathname: '/', hash: '#/profile/p2?x=1' })).toBe('p2');
    expect(resolveUrlProfileId(sp(), { pathname: '/profile/p3', hash: '' })).toBe('p3');
    expect(resolveUrlProfileId(sp(), { pathname: '/', hash: '' })).toBeNull();
  });
});
