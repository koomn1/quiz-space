import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatExtractionEta, normalizeGenerationQuestionCount } from './useQuizGenerator';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('formatExtractionEta', () => {
  it('does not promise an ETA before a file chunk completes', () => {
    expect(formatExtractionEta('2026-08-15T12:00:00.000Z', 0, 8)).toBeNull();
  });

  it('uses observed chunk pace to show a concise Arabic estimate', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-08-15T12:00:30.000Z').getTime());
    expect(formatExtractionEta('2026-08-15T12:00:00.000Z', 1, 8)).toBe('الوقت المتبقي التقريبي: نحو 4 دقيقة.');
  });
});

describe('automatic generation question count', () => {
  it('scales automatic count with source size instead of using a fixed forty-question target', () => {
    expect(normalizeGenerationQuestionCount(0, 8_000)).toBe(20);
    expect(normalizeGenerationQuestionCount(0, 24_000)).toBe(60);
    expect(normalizeGenerationQuestionCount(0, 240_000)).toBe(500);
  });

  it('preserves explicit counts and clamps them to the supported safety bound', () => {
    expect(normalizeGenerationQuestionCount(75, 2_000)).toBe(75);
    expect(normalizeGenerationQuestionCount(700, 2_000)).toBe(500);
  });
});
