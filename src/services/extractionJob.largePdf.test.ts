import { describe, expect, it } from 'vitest';
import { shouldUseVisionForLargeScannedPdf } from '../../worker/src/extractionJobs';

describe('large scanned PDF routing', () => {
  it('routes a large PDF with no sampled text to the chunked vision path', () => {
    expect(shouldUseVisionForLargeScannedPdf(37, '')).toBe(true);
  });

  it('keeps a large text PDF on the lossless text path', () => {
    expect(shouldUseVisionForLargeScannedPdf(37, 'Question 1. Which statement is correct? Choose the best answer from the options below.')).toBe(false);
  });

  it('does not apply the sampled-text shortcut to short PDFs', () => {
    expect(shouldUseVisionForLargeScannedPdf(8, '')).toBe(false);
  });
});
