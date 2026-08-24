import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const resolver = readFileSync(new URL('./QuizResolver.tsx', import.meta.url), 'utf8');

describe('QuizResolver guest attempt contract', () => {
  it('uses a per-attempt idempotency key and the guest RPC path', () => {
    expect(resolver).toContain('const attemptKeyRef = React.useRef<string>(\'\');');
    expect(resolver).toContain('const autoSaveStartedRef = React.useRef<string | null>(null);');
    expect(resolver).toContain('clientAttemptKey: attemptKeyRef.current');
    expect(resolver).toContain('submitGuestQuizAttempt(quizId');
    expect(resolver).toContain('updateGuestQuizAttemptReview(savedCompletionId, userId');
    expect(resolver).toContain('attemptKeyRef.current = createAttemptKey();');
  });

  it('keeps guest daily direct links from trapping the results overlay', () => {
    expect(resolver).toContain('if (isDailyQuiz && isGuest) {');
    expect(resolver).toContain('onQuizLockChange?.(false);');
    expect(resolver).toContain('isGuest, quiz?.questions.length, onQuizLockChange');
  });

  it('keeps authenticated saves on the existing authenticated RPC path', () => {
    expect(resolver).toContain('submitQuizAttempt(quizId, {');
    expect(resolver).toContain('takerId: userId || \'anonymous\'');
    expect(resolver).toContain('if (savedCompletionId && !isDailyQuiz)');
  });
});
