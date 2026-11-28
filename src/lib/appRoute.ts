export interface RouteLocation {
  pathname: string;
  hash: string;
}
type SearchParamsLike = { get(name: string): string | null };

// Pure route parsing extracted from App.tsx. Behavior is unchanged.

const KNOWN_TABS = new Set(['landing', 'explore', 'categories', 'community', 'classrooms', 'institution', 'bookmarks', 'achievements', 'leaderboard', 'analytics', 'billing', 'notifications', 'create', 'profile', 'customization', 'aichat', 'my-quizzes', 'settings', 'support', 'admin', 'store', 'rewards']);
// Tabs that AppRoutes also renders but that are not top-level paths.
const INTERNAL_TABS = new Set(['quiz', 'activity', 'creating', 'membership', 'overview', 'quizzes', 'solving', 'not-found']);

/** Unknown dashboard sub-routes (for example #/dashboard/saved) must show the not-found page, not an empty one. */
export function normalizeDashboardTab(tab: string): string {
  if (tab === 'saved') return 'bookmarks';
  if (KNOWN_TABS.has(tab) || INTERNAL_TABS.has(tab) || tab.startsWith('legal-')) return tab;
  return 'not-found';
}

export function resolveActiveTab(searchParams: SearchParamsLike, loc: RouteLocation): string {
  // Check search params first
  const tabParam = searchParams.get('tab');
  if (tabParam) return tabParam;

  // Check pathname
  const path = loc.pathname;
  const cleanPath = path.replace(/^\//, '').split('?')[0];
  let pathParts = cleanPath.split('/');
  if (pathParts[0] === 'quiz-space') {
    pathParts = pathParts.slice(1);
  }
  if (pathParts[0] === 'dashboard' && pathParts[1]) {
    return normalizeDashboardTab(pathParts[1]);
  }
  if (pathParts[0] === 'quiz' && pathParts[1]) {
    return 'quiz';
  }
  if (pathParts[0] === 'profile' && pathParts[1]) {
    return 'profile';
  }
  if (pathParts[0] === 'legal' && pathParts[1]) {
    return `legal-${pathParts[1]}`;
  }
  if (pathParts[0] === 'quiz' || pathParts[0] === 'dashboard') {
    return 'landing';
  }
  if (pathParts[0]) {
    const knownTabs = new Set(['landing', 'explore', 'categories', 'community', 'classrooms', 'institution', 'bookmarks', 'achievements', 'leaderboard', 'analytics', 'billing', 'notifications', 'create', 'profile', 'customization', 'aichat', 'my-quizzes', 'settings', 'support', 'admin', 'store', 'rewards']);
    return knownTabs.has(pathParts[0]) ? pathParts[0] : 'not-found';
  }

  // Check hash
  const hash = loc.hash;
  if (hash) {
    const hashClean = hash.replace(/^#\/?/, '').split('?')[0];
    const parts = hashClean.split('/');
    if (parts[0] === 'dashboard' && parts[1]) {
      return normalizeDashboardTab(parts[1]);
    }
    if (parts[0] === 'quiz' && parts[1]) {
      return 'quiz';
    }
    if (parts[0] === 'profile' && parts[1]) {
      return 'profile';
    }
    if (parts[0] === 'legal' && parts[1]) {
      return `legal-${parts[1]}`;
    }
    if (parts[0] === 'join' && parts[1]) {
      return 'classrooms';
    }
    if (parts[0] === 'quiz' || parts[0] === 'dashboard' || parts[0] === 'main-content') {
      return 'landing';
    }
    if (parts[0]) {
      const knownTabs = new Set(['landing', 'explore', 'categories', 'community', 'classrooms', 'institution', 'bookmarks', 'achievements', 'leaderboard', 'analytics', 'billing', 'notifications', 'create', 'profile', 'customization', 'aichat', 'my-quizzes', 'settings', 'support', 'admin', 'store', 'rewards']);
      return knownTabs.has(parts[0]) ? parts[0] : 'not-found';
    }
  }

  return 'landing';
}

export function resolveActiveQuizId(searchParams: SearchParamsLike, loc: RouteLocation): string | null {
  const tabParam = searchParams.get('tab');
  if (tabParam === 'quiz' && searchParams.get('quizId')) {
    return searchParams.get('quizId');
  }
  if (searchParams.get('quizId')) {
    return searchParams.get('quizId');
  }

  let path = loc.pathname;
  if (path.startsWith('/quiz-space')) {
    path = path.slice(11);
  }
  const hash = loc.hash;

  if (hash) {
    const hashClean = hash.replace(/^#\/?/, '').split('?')[0];
    const match = hashClean.match(/^quiz\/([^\/]+)/);
    if (match) return match[1];
  }

  const match = path.match(/^\/quiz\/([^\/]+)/) || path.match(/^\/apps\/([^\/]+)/);
  if (match) return match[1];

  return null;
}

export function resolveUrlProfileId(searchParams: SearchParamsLike, loc: RouteLocation): string | null {
  if (searchParams.get('profileId')) {
    return searchParams.get('profileId');
  }

  let path = loc.pathname;
  if (path.startsWith('/quiz-space')) {
    path = path.slice(11);
  }
  const hash = loc.hash;

  if (hash) {
    const hashClean = hash.replace(/^#\/?/, '').split('?')[0];
    const match = hashClean.match(/^profile\/([^\/]+)/);
    if (match) return match[1];
  }

  const match = path.match(/^\/profile\/([^\/]+)/);
  if (match) return match[1];

  return null;
}

export function resolveAppBasePath(pathname: string, hostname: string, viteBase: string): string {
  const host = hostname.toLowerCase();
  if (host === 'quiz-space-app.pages.dev') {
    return '/';
  }
  if (pathname.includes('/quiz-space') || host.includes('github.io')) {
    return '/quiz-space/';
  }
  const base = viteBase || '/';
  return base.endsWith('/') ? base : base + '/';
}

const SHARED_FRAME_TABS = new Set(['landing', 'profile', 'create', 'community', 'settings', 'my-quizzes', 'billing', 'institution']);

/** Tabs that render inside the shared content frame (other screens use their own surface). */
export function usesSharedFrameTab(tab: string, hasActiveQuiz: boolean): boolean {
  return SHARED_FRAME_TABS.has(tab) && !hasActiveQuiz;
}

/** Query params from the real search string, or from the part of the hash after '?'. */
export function readLocationParams(loc: { search?: string; hash?: string }): URLSearchParams {
  const hash = loc.hash || '';
  return new URLSearchParams(loc.search || (hash.includes('?') ? hash.split('?')[1] : ''));
}
