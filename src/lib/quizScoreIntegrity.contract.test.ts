import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('saved quiz review integrity', () => {
  const resolver = readFileSync(resolve(process.cwd(), 'src/components/QuizResolver.tsx'), 'utf8');
  const db = readFileSync(resolve(process.cwd(), 'src/lib/db.ts'), 'utf8');
  const postDeploy = readFileSync(resolve(process.cwd(), 'supabase/post_deploy/revoke_legacy_daily_quiz_rpcs.sql'), 'utf8');

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

  it('documents revoking legacy score mutation RPCs after the new client deploys', () => {
    expect(postDeploy).toContain('update_quiz_attempt_score');
    expect(postDeploy).toContain('update_guest_quiz_attempt_score');
  });
});
