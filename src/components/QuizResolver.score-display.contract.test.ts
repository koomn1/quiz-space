import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/components/QuizResolver.tsx'), 'utf8');

describe('QuizResolver authoritative score display contract', () => {
  it('stores the score returned by the server separately from the local draft score', () => {
    expect(source).toContain('const [authoritativeScore, setAuthoritativeScore] = React.useState<number | null>(null);');
    expect(source).toContain('const displayedScore = authoritativeScore ?? score;');
    expect(source).toContain('setAuthoritativeScore(verifiedScore);');
  });

  it('does not show zero while a standard quiz result is still being verified', () => {
    expect(source).toContain("const isDisplayedScoreReady = isDailyQuiz ? isDailyResultVerified : authoritativeScore !== null;");
    expect(source).toContain("isDisplayedScoreReady ? `${Math.round((displayedScore / quiz.questions.length) * 100)}%` : '—'");
    expect(source).toContain('جارٍ اعتماد الدرجة النهائية');
  });
});
