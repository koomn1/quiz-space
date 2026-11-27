import type { Quiz } from '../types';
import { isPublicQuiz, quizSubject, UNCATEGORIZED } from './mockExam';

export interface ForYouSignals {
  followedCreatorIds: ReadonlySet<string>;
  completedQuizIds: ReadonlySet<string>;
  bookmarkedQuizIds: ReadonlySet<string>;
  /** Subject -> how many quizzes the user has completed or bookmarked in it. */
  subjectAffinity: ReadonlyMap<string, number>;
  now?: number;
}

export const EMPTY_SIGNALS: ForYouSignals = {
  followedCreatorIds: new Set(),
  completedQuizIds: new Set(),
  bookmarkedQuizIds: new Set(),
  subjectAffinity: new Map(),
};

export function buildSubjectAffinity(quizzes: Quiz[], interactedQuizIds: Iterable<string>): Map<string, number> {
  const bySubject = new Map<string, string>();
  for (const q of quizzes) bySubject.set(q.id, quizSubject(q));
  const affinity = new Map<string, number>();
  for (const id of interactedQuizIds) {
    const subject = bySubject.get(id);
    if (!subject || subject === UNCATEGORIZED) continue;
    affinity.set(subject, (affinity.get(subject) || 0) + 1);
  }
  return affinity;
}

export interface ScoredQuiz {
  quiz: Quiz;
  score: number;
  reasons: Array<'followed' | 'subject' | 'popular' | 'new'>;
}

const DAY_MS = 86_400_000;

export function scoreQuiz(quiz: Quiz, signals: ForYouSignals): ScoredQuiz {
  const reasons: ScoredQuiz['reasons'] = [];
  let score = 0;

  if (signals.followedCreatorIds.has(quiz.creatorId)) { score += 4; reasons.push('followed'); }

  const affinity = signals.subjectAffinity.get(quizSubject(quiz)) || 0;
  if (affinity > 0) { score += Math.min(3, 1 + Math.log2(1 + affinity)); reasons.push('subject'); }

  const plays = Math.max(0, quiz.totalPlays || 0);
  score += Math.min(1.5, Math.log10(1 + plays) * 0.5);
  if (plays >= 20) reasons.push('popular');
  if ((quiz.ratingsCount || 0) >= 3) score += Math.max(0, ((quiz.avgRating || 0) - 3)) * 0.4;

  const created = Date.parse(quiz.createdAt);
  if (Number.isFinite(created)) {
    const ageDays = Math.max(0, ((signals.now ?? Date.now()) - created) / DAY_MS);
    if (ageDays <= 14) { score += 1 - ageDays / 14; reasons.push('new'); }
  }

  if (signals.completedQuizIds.has(quiz.id)) score -= 2.5;
  if (signals.bookmarkedQuizIds.has(quiz.id)) score += 0.5;
  if (!quiz.questions || quiz.questions.length === 0) score -= 3;

  return { quiz, score, reasons };
}

/** Ranks public quizzes for a user. Stable: ties keep the original order. */
export function rankForYou(quizzes: Quiz[], signals: ForYouSignals): ScoredQuiz[] {
  return quizzes
    .filter(isPublicQuiz)
    .map((quiz, i) => ({ s: scoreQuiz(quiz, signals), i }))
    .sort((a, b) => b.s.score - a.s.score || a.i - b.i)
    .map(x => x.s);
}
