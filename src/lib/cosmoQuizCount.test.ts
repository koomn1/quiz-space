import { describe, expect, it } from 'vitest';
import {
  COSMO_QUIZ_MAX_COUNT,
  COSMO_QUIZ_MIN_COUNT,
  parseAutomaticCoveragePlan,
  parseAutomaticQuestionCount,
  parseCoverageAuditReplacementIds,
  parseExplicitQuestionCount,
  validateCoverageAssignments,
} from './cosmoQuizCount';

describe('Cosmo automatic quiz count', () => {
  it('keeps an omitted count in automatic mode', () => {
    expect(parseExplicitQuestionCount('أنشئ اختبارًا في الأحياء')).toBeNull();
  });

  it('parses explicit Arabic and Western numerals while respecting the UI bounds', () => {
    expect(parseExplicitQuestionCount('اعمل اختبار ١٢ سؤال')).toBe(12);
    expect(parseExplicitQuestionCount('create a quiz with 42 questions')).toBe(42);
    expect(parseExplicitQuestionCount('create 999 questions')).toBe(COSMO_QUIZ_MAX_COUNT);
    expect(parseExplicitQuestionCount('create 1 question')).toBe(COSMO_QUIZ_MIN_COUNT);
  });

  it('accepts only a valid model-selected amount', () => {
    expect(parseAutomaticQuestionCount('{"amount": 47}')).toBe(47);
    expect(parseAutomaticQuestionCount('23')).toBe(23);
    expect(parseAutomaticQuestionCount('{"amount": 0}')).toBeNull();
    expect(parseAutomaticQuestionCount('{"amount": 101}')).toBeNull();
    expect(parseAutomaticQuestionCount('about thirty questions')).toBeNull();
  });

  it('parses a bounded coverage plan from JSON or a fenced JSON response', () => {
    const plan = [
      { id: 'C01', concept: 'الغشاء الخلوي والنفاذية الاختيارية' },
      { id: 'C02', concept: 'النقل النشط ومضخة الصوديوم' },
      { id: 'C03', concept: 'ترجمة mRNA في الريبوسومات' },
    ];
    expect(parseAutomaticCoveragePlan(`\`\`\`json\n${JSON.stringify({ coveragePlan: plan })}\n\`\`\``)).toEqual(plan);
    expect(parseAutomaticCoveragePlan(JSON.stringify({ concepts: plan }))).toEqual(plan);
  });

  it('supports small intermediate concept batches but rejects duplicate or unsupported plans', () => {
    expect(parseAutomaticCoveragePlan(JSON.stringify({ coveragePlan: [{ id: 'S01-C01', concept: 'النواة' }] }), 1)).toHaveLength(1);
    expect(parseAutomaticCoveragePlan('{"amount":50}')).toBeNull();
    expect(parseAutomaticCoveragePlan(JSON.stringify({ coveragePlan: [{ id: 'C01', concept: 'واحد' }] }))).toBeNull();
    expect(parseAutomaticCoveragePlan(JSON.stringify({ coveragePlan: [
      { id: 'C01', concept: 'الغشاء الخلوي' },
      { id: 'C02', concept: 'الغشاءُ الخلويّ' },
      { id: 'C03', concept: 'النواة' },
    ] }))).toBeNull();
    expect(parseAutomaticCoveragePlan(JSON.stringify({ coveragePlan: Array.from({ length: 101 }, (_, i) => ({ id: `C${i}`, concept: `مفهوم ${i}` })) }))).toBeNull();
  });

  it('requires a one-to-one mapping between planned concepts and generated questions', () => {
    expect(validateCoverageAssignments(['C01', 'C02', 'C03'], ['C01', 'C02', 'C03'])).toMatchObject({ valid: true, missingIds: [], duplicateIds: [], unexpectedIds: [] });
    expect(validateCoverageAssignments(['C01', 'C02', 'C03'], ['C01', 'C01', 'C99'])).toMatchObject({ valid: false, missingIds: ['C02', 'C03'], duplicateIds: ['C01'], unexpectedIds: ['C99'] });
  });

  it('parses only known concept ids from the semantic repair audit', () => {
    expect(parseCoverageAuditReplacementIds('{"replaceConceptIds":["C02"]}', ['C01', 'C02'])).toEqual(['C02']);
    expect(parseCoverageAuditReplacementIds('{"replaceConceptIds":[]}', ['C01', 'C02'])).toEqual([]);
    expect(parseCoverageAuditReplacementIds('{"replaceConceptIds":["unknown"]}', ['C01', 'C02'])).toBeNull();
    expect(parseCoverageAuditReplacementIds('{"replaceConceptIds":"C01"}', ['C01'])).toBeNull();
  });
});
