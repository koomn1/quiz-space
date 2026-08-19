import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(new URL('../../supabase/migrations/20260819_institution_white_label_export.sql', import.meta.url), 'utf8');
const pdf = readFileSync(new URL('./quizPdf.ts', import.meta.url), 'utf8');
const resolver = readFileSync(new URL('../components/QuizResolver.tsx', import.meta.url), 'utf8');

describe('institution white-label export contract', () => {
  it('limits institutional branding lookup to active institution managers', () => {
    expect(migration).toContain('public.is_institution_manager(institution.id)');
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.get_institution_export_brand_for_quiz(TEXT) TO authenticated");
  });

  it('substitutes the institution name throughout the PDF without changing personal exports', () => {
    expect(pdf).toContain("branding?.institutionName || 'Quiz Space'");
    expect(pdf).toContain("branding?.institutionName || 'منصة Quiz Space'");
    expect(pdf).toContain("branding?.institutionName ? 'ورقة أسئلة مؤسسية — بدون حلول أو إجابات'");
    expect(resolver).toContain('getInstitutionExportBrandForQuiz(quiz.id)');
  });
});
