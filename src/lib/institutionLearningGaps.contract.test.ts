import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(new URL('../../supabase/migrations/20260819_institution_learning_gap_analytics.sql', import.meta.url), 'utf8');
const dataLayer = readFileSync(new URL('./institutions.ts', import.meta.url), 'utf8');
const panel = readFileSync(new URL('../components/InstitutionLearningGapsPanel.tsx', import.meta.url), 'utf8');

describe('institution learning-gap analytics contract', () => {
  it('scopes insights to an active institution member and teacher-owned classrooms', () => {
    expect(migration).toContain('can_view_institution_learning_gaps');
    expect(migration).toContain("member.role IN ('owner', 'manager')");
    expect(migration).toContain('classroom.created_by = auth.uid()::text');
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.get_institution_learning_gaps(UUID, TEXT) TO authenticated");
  });

  it('returns a bounded mastery signal rather than raw unscoped completion rows', () => {
    expect(migration).toContain('mastery_percent INTEGER');
    expect(migration).toContain("WHEN AVG((completion.score::NUMERIC / NULLIF(completion.total_questions, 0)) * 100) < 50 THEN 'priority'");
    expect(dataLayer).toContain("supabase.rpc('get_institution_learning_gaps'");
    expect(panel).toContain('تحليل فجوات التعلّم');
  });
});
