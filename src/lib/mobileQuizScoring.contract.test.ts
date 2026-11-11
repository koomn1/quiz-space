import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Flutter mobile quiz scoring contract', () => {
  const edge = readFileSync(
    resolve(process.cwd(), 'supabase/functions/mobile-firebase-session-v2/index.ts'),
    'utf8',
  );
  const migration = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/20261111073000_private_quiz_answer_keys.sql'),
    'utf8',
  );

  it('normalizes submitted answers but never reads a correct answer from public quiz JSON', () => {
    expect(edge).toContain('rawAnswers.length !== questions.length');
    expect(edge).toContain('const answers = questions.map((rawQuestion, index) =>');
    expect(edge).toContain('options.indexOf(answerText)');
    expect(edge).toContain('p_answers: answers');
    expect(edge).toContain('submit_mobile_quiz_attempt_v2');
    expect(edge).not.toContain('const storedCorrectIndex = question.correctIndex;');
    expect(edge).not.toContain('p_score: score');
  });

  it('restricts the mobile grading RPC to the trusted service role', () => {
    expect(migration).toContain("COALESCE(auth.role(), '') <> 'service_role'");
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.submit_mobile_quiz_attempt_v2');
    expect(migration).toContain('TO service_role;');
  });
});
