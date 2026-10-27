import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./InteractiveQuizCard.tsx', import.meta.url), 'utf8');

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

  it('keeps the existing compact viewer-count button for ordinary users', () => {
    expect(source).toContain('عرض الأعضاء الذين حلوا الاختبار');
    expect(source).toContain('عرض قائمة المتفوقين والحلول');
    expect(source).toContain('text-primary hover:underline cursor-pointer');
    expect(source).toContain('t?.playedTimes?.replace');
  });
});
