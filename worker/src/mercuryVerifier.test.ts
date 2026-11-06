import { describe, expect, it } from 'vitest';
import { validateAndApplyMercuryPatch } from './mercuryVerifier';
import type { ExtractedQuestion } from './types/extraction';

function question(overrides: Partial<ExtractedQuestion> = {}): ExtractedQuestion {
  return {
    id: 'q-1',
    rawNumber: '1',
    sectionTitle: 'MCQ',
    questionType: 'mcq',
    rawSpan: '1- Which value is correct?\nA- Alpha\nB- Beta',
    stem: 'Which value is correct?',
    options: [
      { letter: 'a', rawSpan: 'A- Alpha', text: 'Alpha' },
      { letter: 'b', rawSpan: 'B- Beta', text: 'Beta' },
    ],
    correctAnswer: null,
    explanation: null,
    sourcePages: [1],
    origin: 'local_deterministic',
    status: 'suspected',
    confidence: 60,
    warnings: [],
    ...overrides,
  };
}

describe('Mercury verification gatekeeper', () => {
  it('does not allow Mercury to rewrite a confirmed question', () => {
    const original = question({ status: 'confirmed', confidence: 100 });
    const result = validateAndApplyMercuryPatch(
      [original],
      original.rawSpan,
      [1, 1],
      { repairedQuestions: [{ ...original, stem: 'Fabricated replacement' }] },
    );

    expect(result.mergedQuestions[0].stem).toBe(original.stem);
    expect(result.warnings.join(' ')).toContain('منع Mercury');
  });

  it('accepts only traceable repairs inside the chunk page range', () => {
    const original = question();
    const repaired = { ...original, stem: 'Which value is correct?', sourcePages: [1], status: 'confirmed' as const };
    const result = validateAndApplyMercuryPatch(
      [original],
      original.rawSpan,
      [1, 1],
      { repairedQuestions: [repaired] },
    );

    expect(result.mergedQuestions[0].origin).toBe('mercury_verified');
    expect(result.mergedQuestions[0].status).toBe('confirmed');
  });

  it('rejects invalid schema and out-of-range recovered questions', () => {
    const original = question();
    const result = validateAndApplyMercuryPatch(
      [original],
      original.rawSpan,
      [1, 1],
      {
        repairedQuestions: [{ id: 'bad' }],
        recoveredMissedQuestions: [{ ...original, id: 'new', sourcePages: [9] }],
      },
    );

    expect(result.mergedQuestions).toHaveLength(1);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
