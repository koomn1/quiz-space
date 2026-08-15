import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatExtractionEta } from './useQuizGenerator';

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
