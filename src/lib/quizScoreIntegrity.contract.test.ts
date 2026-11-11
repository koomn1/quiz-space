import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('saved quiz review integrity', () => {
  const resolver = readFileSync(resolve(process.cwd(), 'src/components/QuizResolver.tsx'), 'utf8');
  const db = readFileSync(resolve(process.cwd(), 'src/lib/db.ts'), 'utf8');
  const postDeploy = readFileSync(resolve(process.cwd(), 'supabase/post_deploy/revoke_legacy_daily_quiz_rpcs.sql'), 'utf8');
  const scoringMigration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20261111054631_server_authoritative_quiz_scoring.sql'), 'utf8');

  it('locks answer edits after the saved completion exists', () => {
    expect(resolver).toContain('if (savedCompletionId || autoSaveStartedRef.current');
    expect(resolver).toContain('if (savedCompletionId || autoSaveStartedRef.current) return;');
    expect(resolver).not.toContain('setIsReviewDirty');
  });

  it('does not expose client helpers for rewriting saved quiz scores', () => {
    expect(db).not.toContain('update_quiz_attempt_score');
    expect(db).not.toContain('update_guest_quiz_attempt_score');
    expect(resolver).not.toContain('updateQuizAttemptScore');
    expect(resolver).not.toContain('updateGuestQuizAttemptScore');
  });

  it('scores standard authenticated and guest attempts from server-stored answer keys', () => {
    expect(scoringMigration).toContain('quizspace_score_objective_answers');
    expect(scoringMigration).toContain("v_question->>'correctIndex'");
    expect(scoringMigration).toContain("IF v_question_type = 'essay' THEN");
    expect(scoringMigration).toContain('submit_quiz_attempt_v2');
    expect(scoringMigration).toContain('submit_guest_quiz_attempt_v2');
    expect(db).toContain("supabase.rpc('submit_quiz_attempt_v2'");
    expect(db).toContain("supabase.rpc('submit_guest_quiz_attempt_v2'");
    expect(db).toContain('p_answers: data.answers');
    expect(db).not.toContain('p_score: data.score');
    expect(resolver).toContain('answers: quiz.questions.map((_, index) => Number.isInteger(userAnswers[index]) ? userAnswers[index] : null)');
    expect(resolver).toContain("if (question.type === 'essay') return total;");
  });

  it('documents revoking legacy score mutation and client-scored submission RPCs after the new client deploys', () => {
    expect(postDeploy).toContain('update_quiz_attempt_score');
    expect(postDeploy).toContain('update_guest_quiz_attempt_score');
    expect(postDeploy).toContain('submit_quiz_attempt');
    expect(postDeploy).toContain('submit_guest_quiz_attempt');
  });
});
