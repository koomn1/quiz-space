import type { Question, Quiz } from '../types';

export const ALL_SUBJECTS = '__all__';
export const UNCATEGORIZED = '__none__';

export interface MockExamQuestion {
  key: string;
  quizId: string;
  quizTitle: string;
  question: Question;
}

export interface MockExamConfig {
  subject: string;
  count: number;
  minutes: number;
}

export interface SubjectOption {
  subject: string;
  quizCount: number;
  questionCount: number;
}

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();

export const isPublicQuiz = (quiz: Quiz) => !quiz.distributionRouting || quiz.distributionRouting === 'public';

/** Only auto-gradable questions can go into a timed mock exam. */
export const isGradableQuestion = (q: Question) =>
  (q.type === 'mcq' || q.type === 'tf') &&
  typeof q.text === 'string' && q.text.trim().length > 0 &&
  Array.isArray(q.options) && q.options.length >= 2 &&
  Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < q.options.length;

export const quizSubject = (quiz: Quiz) => (quiz.category && quiz.category.trim()) || UNCATEGORIZED;

export function collectPool(quizzes: Quiz[], subject: string): MockExamQuestion[] {
  const seen = new Set<string>();
  const pool: MockExamQuestion[] = [];
  for (const quiz of quizzes) {
    if (!isPublicQuiz(quiz)) continue;
    if (subject !== ALL_SUBJECTS && quizSubject(quiz) !== subject) continue;
    for (const question of quiz.questions || []) {
      if (!isGradableQuestion(question)) continue;
      const fingerprint = normalize(question.text);
      if (seen.has(fingerprint)) continue;
      seen.add(fingerprint);
      pool.push({ key: `${quiz.id}:${question.id}`, quizId: quiz.id, quizTitle: quiz.title, question });
    }
  }
  return pool;
}

export function listSubjects(quizzes: Quiz[]): SubjectOption[] {
  const subjects = new Map<string, Set<string>>();
  for (const quiz of quizzes) {
    if (!isPublicQuiz(quiz)) continue;
    const s = quizSubject(quiz);
    if (!subjects.has(s)) subjects.set(s, new Set());
    subjects.get(s)!.add(quiz.id);
  }
  return Array.from(subjects.entries())
    .map(([subject, ids]) => ({
      subject,
      quizCount: ids.size,
      questionCount: collectPool(quizzes, subject).length,
    }))
    .filter(s => s.questionCount > 0)
    .sort((a, b) => b.questionCount - a.questionCount);
}

export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function clampCount(requested: number, available: number) {
  if (!Number.isFinite(requested)) return Math.min(10, available);
  return Math.max(0, Math.min(Math.floor(requested), available, 100));
}

export function defaultMinutes(count: number) {
  return Math.max(1, Math.ceil(count * 1));
}

export function buildMockExam(quizzes: Quiz[], config: MockExamConfig, rng: () => number = Math.random): MockExamQuestion[] {
  const pool = collectPool(quizzes, config.subject);
  return shuffle(pool, rng).slice(0, clampCount(config.count, pool.length));
}

export type MockAnswers = Record<string, number | undefined>;

export interface MockExamResult {
  total: number;
  correct: number;
  wrong: number;
  unanswered: number;
  percent: number;
  wrongKeys: string[];
}

export function scoreMockExam(exam: MockExamQuestion[], answers: MockAnswers): MockExamResult {
  let correct = 0;
  let unanswered = 0;
  const wrongKeys: string[] = [];
  for (const item of exam) {
    const picked = answers[item.key];
    if (picked === undefined) {
      unanswered++;
      wrongKeys.push(item.key);
    } else if (picked === item.question.correctIndex) {
      correct++;
    } else {
      wrongKeys.push(item.key);
    }
  }
  const total = exam.length;
  return {
    total,
    correct,
    wrong: total - correct - unanswered,
    unanswered,
    percent: total === 0 ? 0 : Math.round((correct / total) * 100),
    wrongKeys,
  };
}

export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Printable paper version (questions only, answer key on a second page). */
export function buildPrintableExamHtml(exam: MockExamQuestion[], title: string, isAr: boolean) {
  const letters = isAr ? ['أ', 'ب', 'ج', 'د', 'هـ', 'و'] : ['A', 'B', 'C', 'D', 'E', 'F'];
  const body = exam.map((item, i) => {
    const opts = item.question.options
      .map((o, oi) => `<li>${letters[oi] || oi + 1}) ${escapeHtml(o)}</li>`)
      .join('');
    return `<div class="q"><p><b>${i + 1}.</b> ${escapeHtml(item.question.text)}</p><ul>${opts}</ul></div>`;
  }).join('');
  const key = exam.map((item, i) => `${i + 1}: ${letters[item.question.correctIndex] || item.question.correctIndex + 1}`).join(' &nbsp; ');
  return `<!doctype html><html dir="${isAr ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>body{font-family:system-ui,sans-serif;padding:24px;line-height:1.6}ul{list-style:none;padding:0 16px}.q{break-inside:avoid;margin-bottom:14px}.key{page-break-before:always}</style></head>
<body><h1>${escapeHtml(title)}</h1>${body}<div class="key"><h2>${isAr ? 'مفتاح الإجابات' : 'Answer key'}</h2><p>${key}</p></div></body></html>`;
}
