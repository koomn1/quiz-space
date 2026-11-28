import { describe, expect, it } from 'vitest';
import { resolveActiveQuizId, resolveActiveTab, resolveUrlProfileId, usesSharedFrameTab, readLocationParams } from './appRoute';

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

import { resolveAppBasePath } from './appRoute';

describe('resolveAppBasePath', () => {
  it('uses / on the primary pages.dev host', () => {
    expect(resolveAppBasePath('/x', 'quiz-space-app.pages.dev', '/quiz-space/')).toBe('/');
  });
  it('uses /quiz-space/ under that path or on github.io', () => {
    expect(resolveAppBasePath('/quiz-space/a', 'example.com', '/')).toBe('/quiz-space/');
    expect(resolveAppBasePath('/', 'me.github.io', '/')).toBe('/quiz-space/');
  });
  it('falls back to the vite base with a trailing slash', () => {
    expect(resolveAppBasePath('/', 'example.com', '/app')).toBe('/app/');
    expect(resolveAppBasePath('/', 'example.com', '')).toBe('/');
  });
});

describe('unknown dashboard routes', () => {
  it('maps unknown dashboard sub-routes to not-found (hash and path)', () => {
    expect(resolveActiveTab(sp(), { pathname: '/', hash: '#/dashboard/nope' })).toBe('not-found');
    expect(resolveActiveTab(sp(), { pathname: '/dashboard/nope', hash: '' })).toBe('not-found');
  });
  it('keeps valid and internal dashboard sub-routes', () => {
    expect(resolveActiveTab(sp(), { pathname: '/', hash: '#/dashboard/bookmarks' })).toBe('bookmarks');
    expect(resolveActiveTab(sp(), { pathname: '/', hash: '#/dashboard/legal-privacy' })).toBe('legal-privacy');
    expect(resolveActiveTab(sp(), { pathname: '/', hash: '#/dashboard/solving' })).toBe('solving');
  });
});

describe('shared frame and location params', () => {
  it('flags shared-frame tabs only without an active quiz', () => {
    expect(usesSharedFrameTab('billing', false)).toBe(true);
    expect(usesSharedFrameTab('billing', true)).toBe(false);
    expect(usesSharedFrameTab('explore', false)).toBe(false);
  });
  it('reads params from search first, then from the hash', () => {
    expect(readLocationParams({ search: '?tab=x', hash: '#/a?tab=y' }).get('tab')).toBe('x');
    expect(readLocationParams({ search: '', hash: '#/dashboard/a?tab=y' }).get('tab')).toBe('y');
    expect(readLocationParams({ search: '', hash: '#/dashboard/a' }).get('tab')).toBeNull();
  });
});

describe('saved alias', () => {
  it('maps saved to bookmarks', () => {
    expect(resolveActiveTab(sp(), { pathname: '/', hash: '#/dashboard/saved' })).toBe('bookmarks');
  });
});
