import { describe, expect, it } from 'vitest';
import { createExtractionGroupKey, isTerminalLogNearLatest } from './ExtractionTerminalLog';

describe('extraction terminal update grouping', () => {
  it('groups consecutive page and chunk updates whose only difference is numeric progress', () => {
    expect(createExtractionGroupKey('extracting', 'تمت قراءة الصفحات ١ إلى ١٠'))
      .toBe(createExtractionGroupKey('extracting', 'تمت قراءة الصفحات ١١ إلى ٢٠'));
  });

  it('keeps updates from different processing stages separate', () => {
    expect(createExtractionGroupKey('extracting', 'اكتملت قراءة 8 صفحات'))
      .not.toBe(createExtractionGroupKey('compiling', 'اكتملت قراءة 12 صفحة'));
  });

  it('keeps messages with different operational meanings separate', () => {
    expect(createExtractionGroupKey('extracting', 'تمت قراءة 8 صفحات'))
      .not.toBe(createExtractionGroupKey('extracting', 'تعذر قراءة الصفحة 8'));
  });
});

describe('extraction terminal smart scrolling', () => {
  it('keeps following when the reader is within the bottom threshold', () => {
    expect(isTerminalLogNearLatest(1000, 300, 670)).toBe(true);
  });

  it('pauses following when the reader scrolls up to older log entries', () => {
    expect(isTerminalLogNearLatest(1000, 300, 500)).toBe(false);
  });

  it('allows a small threshold to avoid pausing on near-bottom rounding', () => {
    expect(isTerminalLogNearLatest(1000, 300, 652)).toBe(true);
  });
});
