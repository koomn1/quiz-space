import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./InteractiveQuizCard.tsx', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../../supabase/migrations/20261027144000_quiz_creator_attempts_access.sql', import.meta.url), 'utf8');

describe('quiz attempts button by role', () => {
  it('uses the larger labeled touch target for the quiz creator or admin in both layouts', () => {
    expect(source).toContain('const canEdit = !isGuest && (isAdminProp || quiz.creatorId === currentUserId);');
    expect(source).toContain('const canManageQuizAttempts = canEdit;');
    expect(source.match(/canManageQuizAttempts \? quizAttemptsButton/g)).toHaveLength(2);
    expect(source).toContain('min-h-11 max-w-full touch-manipulation');
    expect(source).toContain('مشاهدة من دخلوا الاختبار');
    expect(source).toContain('View who took this quiz');
    expect(source).toContain('aria-label={');
  });

  it('shows the attempts button only to the quiz creator or super admin and leaves a passive count for others', () => {
    expect(source).toContain('const canManageQuizAttempts = canEdit;');
    expect(source).toContain('const canViewAttempts = canManageQuizAttempts;');
    expect(source.match(/canManageQuizAttempts \? quizAttemptsButton/g)).toHaveLength(2);
    expect(source).toContain('<span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 font-bold"');
    expect(source).not.toContain('عرض الأعضاء الذين حلوا الاختبار');
  });

  it('enforces creator-or-super-admin access in the database and returns all grouped rows without a cap', () => {
    expect(migration).toContain('IF NOT public.current_user_is_admin() AND NOT EXISTS');
    expect(migration).toContain('q.creator_id = auth.uid()::text');
    expect(migration).toContain('GROUP BY x.taker_id, x.taker_name');
    expect(migration).not.toMatch(/LIMIT\s+\d+/i);
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.get_quiz_takers_unique(TEXT) TO authenticated');
  });

  it('keeps the passive total-play count visible to ordinary users', () => {
    expect(source).toContain('t?.playedTimes?.replace');
    expect(source).toContain('aria-label={isAr ? `لُعب ${quiz.totalPlays || 0} مرة`');
  });

  it('does not start the quiz when the attempts action is clicked inside a clickable card', () => {
    expect(source).toContain("target.closest('[data-card-action]')");
    expect(source.match(/onClick={handleCardClick}/g)).toHaveLength(2);
    expect(source.match(/data-card-action="attempts"/g)).toHaveLength(1);
    expect(source).toContain('event.stopPropagation();');
    expect(source).toContain('if (!canViewAttempts) return;');
  });
});
